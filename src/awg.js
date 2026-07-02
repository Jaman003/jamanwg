import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { config } from './config.js';
import { getSetting, listClients, listEnabledClients, setSetting, updateStats } from './db.js';
import { defaultEndpointTuning, endpointString, parseEndpointValue } from './resilience.js';

const COMMAND_TIMEOUT_MS = 8000;
const STATS_REFRESH_CACHE_MS = 5000;
let statsRefreshCache = null;
let statsRefreshInFlight = null;

function commandExists(name) {
  const result = spawnSync('sh', ['-lc', `command -v "$1" >/dev/null 2>&1`, 'sh', name], {
    stdio: 'ignore'
  });
  return result.status === 0;
}

function resolvedMode() {
  if (config.applyMode !== 'auto') return config.applyMode;
  return commandExists('awg') && process.platform === 'linux' ? 'both' : 'mock';
}

function run(command, args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out`));
    }, COMMAND_TIMEOUT_MS);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed: ${stderr.trim() || `exit ${code}`}`));
      }
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function mockKey() {
  return randomBytes(32).toString('base64');
}

export function runtimeStatus() {
  const mode = resolvedMode();
  return {
    mode,
    requestedMode: config.applyMode,
    platform: process.platform,
    hasAwg: commandExists('awg'),
    hasAwgQuick: commandExists('awg-quick'),
    hasQrencode: commandExists('qrencode'),
    interfaceName: config.interfaceName,
    configPath: config.configPath,
    endpoint: config.endpoint,
    dns: config.dns,
    allowedIps: config.allowedIps,
    addressPool: safeAddressPoolStatus(),
    listenPort: config.listenPort,
    mock: mode === 'mock'
  };
}

export async function generateKeyPair() {
  if (resolvedMode() === 'mock' || !commandExists('awg')) {
    return {
      privateKey: mockKey(),
      publicKey: mockKey()
    };
  }

  const privateKey = await run('awg', ['genkey']);
  const publicKey = await run('awg', ['pubkey'], `${privateKey}\n`);
  return { privateKey, publicKey };
}

export async function generatePresharedKey() {
  if (resolvedMode() === 'mock' || !commandExists('awg')) return mockKey();
  return run('awg', ['genpsk']);
}

export async function getServerKeys() {
  const storedPrivate = getSetting('server_private_key');
  const storedPublic = getSetting('server_public_key');
  if (storedPrivate && storedPublic) {
    return { privateKey: storedPrivate, publicKey: storedPublic };
  }

  const keys = await generateKeyPair();
  setSetting('server_private_key', keys.privateKey);
  setSetting('server_public_key', keys.publicKey);
  return keys;
}

function ipv4ToInt(ip) {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function intToIpv4(value) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255
  ].join('.');
}

function parseServerAddress() {
  const [serverIp, prefixRaw] = config.serverAddress.split('/');
  const prefix = Number(prefixRaw || 24);
  if (!Number.isInteger(prefix) || prefix < 16 || prefix > 30) {
    throw new Error('JAMANWG_ADDRESS must use an IPv4 CIDR prefix between /16 and /30');
  }

  const serverInt = ipv4ToInt(serverIp);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const network = serverInt & mask;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return { serverIp, serverInt, prefix, mask, network, broadcast };
}

export function addressPoolStatus() {
  const { serverIp, serverInt, prefix, network, broadcast } = parseServerAddress();
  const firstClientInt = network + 2;
  const lastClientInt = broadcast - 1;
  const rawTotal = Math.max(0, lastClientInt - firstClientInt + 1);
  const serverInAllocationRange = serverInt >= firstClientInt && serverInt <= lastClientInt;
  const total = Math.max(0, rawTotal - (serverInAllocationRange ? 1 : 0));
  const clients = listClients();
  let used = 0;
  let outsideSubnet = 0;

  for (const client of clients) {
    const ip = client.address.split('/')[0];
    const value = ipv4ToInt(ip);
    if (value >= firstClientInt && value <= lastClientInt) {
      used += 1;
    } else {
      outsideSubnet += 1;
    }
  }

  return {
    cidr: config.serverAddress,
    serverIp,
    prefix,
    network: intToIpv4(network),
    broadcast: intToIpv4(broadcast),
    firstClient: intToIpv4(firstClientInt),
    lastClient: intToIpv4(lastClientInt),
    total,
    used,
    free: Math.max(0, total - used),
    outsideSubnet,
    serverInAllocationRange,
    serverInsideSubnet: serverInt > network && serverInt < broadcast
  };
}

function safeAddressPoolStatus() {
  try {
    return addressPoolStatus();
  } catch (error) {
    return {
      cidr: config.serverAddress,
      error: error.message
    };
  }
}

export function allocateClientAddress() {
  const { serverIp, network, broadcast } = parseServerAddress();
  const used = new Set(listClients().map((client) => client.address.split('/')[0]));
  used.add(serverIp);

  for (let current = network + 2; current < broadcast; current += 1) {
    const candidate = intToIpv4(current);
    if (!used.has(candidate)) return `${candidate}/32`;
  }

  throw new Error(`No free client addresses left in ${config.serverAddress}`);
}

function obfuscationLines() {
  const obf = config.obfuscation;
  return [
    `Jc = ${obf.jc}`,
    `Jmin = ${obf.jmin}`,
    `Jmax = ${obf.jmax}`,
    `S1 = ${obf.s1}`,
    `S2 = ${obf.s2}`,
    `H1 = ${obf.h1}`,
    `H2 = ${obf.h2}`,
    `H3 = ${obf.h3}`,
    `H4 = ${obf.h4}`
  ];
}

export async function renderClientConfig(client, endpointProfile = null) {
  const serverKeys = await getServerKeys();
  const endpoint = endpointProfile ? endpointString(endpointProfile) : client.endpoint;
  const parsedEndpoint = parseEndpointValue(endpoint);
  const defaultTuning = defaultEndpointTuning(parsedEndpoint?.port || config.listenPort);
  const mtu = endpointProfile?.mtu ?? defaultTuning.mtu;
  const keepalive = endpointProfile?.persistentKeepalive ?? defaultTuning.persistentKeepalive;
  return [
    '[Interface]',
    `PrivateKey = ${client.privateKey}`,
    `Address = ${client.address}`,
    `DNS = ${client.dns}`,
    `MTU = ${mtu}`,
    ...obfuscationLines(),
    '',
    '[Peer]',
    `PublicKey = ${serverKeys.publicKey}`,
    `PresharedKey = ${client.presharedKey}`,
    `Endpoint = ${endpoint}`,
    `AllowedIPs = ${client.allowedIps}`,
    `PersistentKeepalive = ${keepalive}`,
    ''
  ].join('\n');
}

export async function renderServerConfig() {
  const serverKeys = await getServerKeys();
  const serverTuning = defaultEndpointTuning(config.listenPort);
  const lines = [
    '# Generated by jamanWG. Manual edits may be overwritten.',
    '[Interface]',
    `PrivateKey = ${serverKeys.privateKey}`,
    `Address = ${config.serverAddress}`,
    `ListenPort = ${config.listenPort}`,
    `MTU = ${serverTuning.mtu}`,
    ...obfuscationLines()
  ];

  if (config.postUp) lines.push(`PostUp = ${config.postUp}`);
  if (config.postDown) lines.push(`PostDown = ${config.postDown}`);

  for (const client of listEnabledClients()) {
    lines.push(
      '',
      `[Peer]`,
      `# ${client.name} (${client.id})`,
      `PublicKey = ${client.publicKey}`,
      `PresharedKey = ${client.presharedKey}`,
      `AllowedIPs = ${client.address}`
    );
  }

  lines.push('');
  return lines.join('\n');
}

export async function writeServerConfig() {
  const text = await renderServerConfig();
  mkdirSync(dirname(config.configPath), { recursive: true });
  if (existsSync(config.configPath)) {
    renameSync(config.configPath, `${config.configPath}.bak`);
  }
  writeFileSync(config.configPath, text, { mode: 0o600 });
  return { path: config.configPath, bytes: Buffer.byteLength(text) };
}

async function runAwgSet(args) {
  if (!commandExists('awg')) throw new Error('awg binary is not installed');
  return run('awg', ['set', config.interfaceName, ...args]);
}

export async function applyClient(client) {
  const mode = resolvedMode();
  if (mode === 'mock' || mode === 'config') return { applied: false, mode };

  if (!client.enabled) {
    await removePeer(client.publicKey);
    return { applied: true, mode, action: 'removed' };
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'jamanwg-'));
  const pskPath = join(tempDir, 'psk');
  try {
    writeFileSync(pskPath, `${client.presharedKey}\n`, { mode: 0o600 });
    await runAwgSet(['peer', client.publicKey, 'preshared-key', pskPath, 'allowed-ips', client.address]);
    return { applied: true, mode, action: 'upserted' };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function removePeer(publicKey) {
  const mode = resolvedMode();
  if (mode === 'mock' || mode === 'config') return { removed: false, mode };
  await runAwgSet(['peer', publicKey, 'remove']);
  return { removed: true, mode };
}

export async function syncClient(client) {
  const mode = resolvedMode();
  const result = { mode, configWritten: false, peersApplied: 0 };

  if (mode === 'config' || mode === 'both') {
    const written = await writeServerConfig();
    result.configWritten = true;
    result.configPath = written.path;
    result.configBytes = written.bytes;
  }

  if (mode === 'live' || mode === 'both') {
    await applyClient(client);
    result.peersApplied = 1;
  }

  return result;
}

export async function syncDeletedClient(publicKey) {
  const mode = resolvedMode();
  const result = { mode, configWritten: false, peerRemoved: false };

  if (mode === 'config' || mode === 'both') {
    const written = await writeServerConfig();
    result.configWritten = true;
    result.configPath = written.path;
    result.configBytes = written.bytes;
  }

  if (mode === 'live' || mode === 'both') {
    await removePeer(publicKey);
    result.peerRemoved = true;
  }

  return result;
}

export async function syncInterface() {
  const mode = resolvedMode();
  const result = { mode, configWritten: false, peersApplied: 0 };

  if (mode === 'config' || mode === 'both') {
    const written = await writeServerConfig();
    result.configWritten = true;
    result.configPath = written.path;
    result.configBytes = written.bytes;
  }

  if (mode === 'live' || mode === 'both') {
    for (const client of listClients()) {
      await applyClient(client);
      result.peersApplied += 1;
    }
  }

  return result;
}

export async function refreshStats() {
  const mode = resolvedMode();
  if (mode === 'mock' || !commandExists('awg')) return { refreshed: false, mode };

  const dump = await run('awg', ['show', config.interfaceName, 'dump']);
  const lines = dump.split(/\r?\n/).filter(Boolean).slice(1);
  let peers = 0;

  for (const line of lines) {
    const columns = line.split('\t');
    if (columns.length < 7) continue;
    const publicKey = columns[0];
    const handshake = Number(columns[4]);
    const rxBytes = Number(columns[5]);
    const txBytes = Number(columns[6]);
    updateStats(publicKey, {
      latestHandshakeAt: handshake > 0 ? new Date(handshake * 1000).toISOString() : null,
      rxBytes: Number.isFinite(rxBytes) ? rxBytes : 0,
      txBytes: Number.isFinite(txBytes) ? txBytes : 0
    });
    peers += 1;
  }

  return { refreshed: true, mode, peers };
}

export async function refreshStatsCached() {
  const now = Date.now();
  if (statsRefreshCache && now - statsRefreshCache.at <= STATS_REFRESH_CACHE_MS) {
    return { ...statsRefreshCache.result, cached: true };
  }

  if (statsRefreshInFlight) {
    const result = await statsRefreshInFlight;
    return { ...result, cached: true };
  }

  statsRefreshInFlight = refreshStats()
    .then((result) => {
      statsRefreshCache = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      statsRefreshInFlight = null;
    });

  return statsRefreshInFlight;
}

export async function renderQrSvg(configText) {
  if (!commandExists('qrencode')) {
    const error = new Error('qrencode is not installed');
    error.code = 'QR_NOT_AVAILABLE';
    throw error;
  }
  return run('qrencode', ['-t', 'SVG', '-o', '-', configText]);
}
