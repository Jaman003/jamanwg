import { createServer } from 'node:http';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { config } from './config.js';
import {
  countActiveClientDevices,
  createBalanceNodeRecord,
  createClientDevice,
  createClientRecord,
  createEndpointRecord,
  deleteBalanceNodeRecord,
  deleteClientRecord,
  deleteEndpointRecord,
  disableExpiredOrLimitedClients,
  getBalanceNode,
  getClientDeviceByHwid,
  getClient,
  getEndpoint,
  getSetting,
  listBalanceAssignments,
  listBalanceNodes,
  listClients,
  listClientsPage,
  listClientDevices,
  listEnabledEndpoints,
  listEndpoints,
  logEvent,
  recentEventsPage,
  reissueClientKeys,
  revokeClientDevice,
  setSetting,
  topClientsByTraffic,
  touchClientDevice,
  trafficHistory,
  updateBalanceNodeRecord,
  updateEndpointHealth,
  updateEndpointRecord,
  updateClientRecord
} from './db.js';
import {
  allocateClientAddress,
  generateKeyPair,
  generatePresharedKey,
  refreshStats,
  refreshStatsCached,
  removePeer,
  renderClientConfig,
  renderQrSvg,
  renderServerConfig,
  runtimeStatus,
  syncClient,
  syncDeletedClient,
  syncInterface
} from './awg.js';
import {
  buildAmneziaUri,
  checkEndpoint,
  defaultEndpointTuning,
  endpointString,
  normalizeEndpointPayload,
  parseEndpointValue,
  portProfiles
} from './resilience.js';
import {
  balancerSnapshot,
  authorizeAssignmentHwid,
  createRemoteClient,
  deleteAssignmentClient,
  disableAssignmentClient,
  getAssignmentClient,
  localBalanceNode,
  normalizeBalancerAllocationPayload,
  normalizeBalanceNodePayload,
  publicBalancerNode,
  refreshRemoteNodeHealth,
  selectBalancerNode,
  updateAssignmentClient
} from './balancer.js';
import { systemReport } from './monitoring.js';

const publicDir = resolve(config.rootDir, 'public');
const sessionMaxAgeSeconds = 60 * 60 * 12;
const rateLimitBuckets = new Map();
const clientOnlineWindowMs = 5 * 60 * 1000;

function isClientOnline(client, now = Date.now()) {
  if (!client?.enabled || !client.latestHandshakeAt) return false;
  const handshakeAt = new Date(client.latestHandshakeAt).getTime();
  return Number.isFinite(handshakeAt) && handshakeAt >= now - clientOnlineWindowMs;
}
let maintenanceRunning = false;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(String(password), salt, 64).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash, fallbackPlain) {
  if (storedHash?.startsWith('scrypt$')) {
    const [, salt, hash] = storedHash.split('$');
    if (!salt || !hash) return false;
    const candidate = scryptSync(String(password), salt, 64).toString('base64url');
    return safeEqual(candidate, hash);
  }
  return safeEqual(password || '', fallbackPlain || '');
}

function getAdminUsername() {
  return getSetting('admin_username') || config.adminUser;
}

function getAdminPasswordHash() {
  return getSetting('admin_password_hash');
}

function getApiToken() {
  return getSetting('api_token') ?? config.apiToken;
}

function getMetricsToken() {
  return config.metricsToken || getApiToken();
}

function requireMetricsToken(req, res, url) {
  const expected = getMetricsToken();
  if (!expected) {
    json(res, 403, { error: 'Metrics endpoint is disabled. Set JAMANWG_METRICS_TOKEN or JAMANWG_API_TOKEN.' });
    return false;
  }

  const header = String(req.headers.authorization || '');
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const queryToken = url.searchParams.get('token') || '';
  if (safeEqual(bearer || queryToken, expected)) return true;

  json(res, 401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
  return false;
}

function prometheusEscapeLabel(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function prometheusMetrics({ clients, status, monitor }) {
  const lines = [];
  const metric = (name, value, labels = {}) => {
    const labelText = Object.entries(labels).length
      ? `{${Object.entries(labels).map(([key, val]) => `${key}="${prometheusEscapeLabel(val)}"`).join(',')}}`
      : '';
    lines.push(`${name}${labelText} ${Number(value || 0)}`);
  };
  const help = (name, text, type = 'gauge') => {
    lines.push(`# HELP ${name} ${text}`);
    lines.push(`# TYPE ${name} ${type}`);
  };

  help('jamanwg_clients_total', 'Total clients managed by this panel');
  metric('jamanwg_clients_total', clients.length);
  help('jamanwg_clients_enabled', 'Enabled clients managed by this panel');
  metric('jamanwg_clients_enabled', clients.filter((client) => client.enabled).length);
  help('jamanwg_clients_online', 'Clients with handshake in the last five minutes');
  metric('jamanwg_clients_online', monitor.traffic?.onlineClients || 0);
  help('jamanwg_address_pool_free', 'Free client IP slots in the configured address pool');
  metric('jamanwg_address_pool_free', status.addressPool?.free || 0);
  help('jamanwg_address_pool_total', 'Total client IP slots in the configured address pool');
  metric('jamanwg_address_pool_total', status.addressPool?.total || 0);

  help('jamanwg_traffic_rx_bytes', 'Total received traffic bytes', 'counter');
  metric('jamanwg_traffic_rx_bytes', monitor.traffic?.rxBytes || 0);
  help('jamanwg_traffic_tx_bytes', 'Total sent traffic bytes', 'counter');
  metric('jamanwg_traffic_tx_bytes', monitor.traffic?.txBytes || 0);
  help('jamanwg_traffic_total_bytes', 'Total traffic bytes', 'counter');
  metric('jamanwg_traffic_total_bytes', monitor.traffic?.totalBytes || 0);
  help('jamanwg_traffic_bytes_per_second', 'Observed traffic speed between scrapes');
  metric('jamanwg_traffic_bytes_per_second', monitor.traffic?.totalBps || 0);

  help('jamanwg_cpu_load_percent', 'One minute load average divided by CPU cores');
  metric('jamanwg_cpu_load_percent', monitor.cpu?.loadPercent || 0);
  help('jamanwg_memory_used_percent', 'System memory used percent');
  metric('jamanwg_memory_used_percent', monitor.memory?.usedPercent || 0);
  help('jamanwg_memory_used_bytes', 'System memory used bytes');
  metric('jamanwg_memory_used_bytes', monitor.memory?.usedBytes || 0);
  help('jamanwg_disk_used_percent', 'Root disk used percent');
  metric('jamanwg_disk_used_percent', monitor.disk?.usedPercent || 0, { path: monitor.disk?.path || '/' });
  help('jamanwg_disk_free_bytes', 'Root disk free bytes');
  metric('jamanwg_disk_free_bytes', monitor.disk?.freeBytes || 0, { path: monitor.disk?.path || '/' });
  help('jamanwg_uptime_seconds', 'Host uptime seconds');
  metric('jamanwg_uptime_seconds', monitor.host?.uptimeSeconds || 0);

  help('jamanwg_client_traffic_total_bytes', 'Total traffic bytes per client', 'counter');
  for (const client of clients) {
    metric('jamanwg_client_traffic_total_bytes', Number(client.rxBytes || 0) + Number(client.txBytes || 0), {
      client_id: client.id,
      client_name: client.name,
      enabled: client.enabled ? 'true' : 'false'
    });
  }

  lines.push('');
  return lines.join('\n');
}

function publicClient(client) {
  if (!client) return null;
  const { privateKey, presharedKey, ...safeClient } = client;
  return {
    ...safeClient,
    online: isClientOnline(client),
    deviceCount: countActiveClientDevices(client.id)
  };
}

function publicApiClient(client) {
  if (!client) return null;
  const { privateKey, presharedKey, ...safeClient } = client;
  return {
    ...safeClient,
    online: isClientOnline(client)
  };
}

function fallbackEndpointProfile() {
  const parsed = parseEndpointValue(config.endpoint);
  const port = parsed?.port || Number(config.listenPort || 51820);
  const tuning = defaultEndpointTuning(port);
  return {
    id: 'default',
    label: 'Primary UDP',
    host: parsed?.host || '127.0.0.1',
    port,
    transport: 'udp',
    enabled: true,
    priority: 100,
    mtu: tuning.mtu,
    persistentKeepalive: tuning.persistentKeepalive,
    notes: 'Fallback from JAMANWG_ENDPOINT'
  };
}

function activeEndpointProfiles() {
  const endpoints = listEnabledEndpoints();
  return endpoints.length ? endpoints : [fallbackEndpointProfile()];
}

function defaultClientEndpoint() {
  return endpointString(activeEndpointProfiles()[0]);
}

async function renderClientBundle(client) {
  const entries = [];
  for (const endpoint of activeEndpointProfiles()) {
    const configText = await renderClientConfig(client, endpoint);
    const name = `${client.name} - ${endpoint.label}`;
    entries.push({
      name,
      endpoint,
      config: configText,
      uri: buildAmneziaUri(configText, name)
    });
  }

  return {
    entries,
    bundle: entries.map((entry) => entry.uri).join('\n')
  };
}

function sign(payload) {
  return createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

function makeSessionCookie(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function isSecureRequest(req) {
  return req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function sessionCookieHeader(req, value, maxAgeSeconds = sessionMaxAgeSeconds) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `jamanwg_session=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index === -1) return null;
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }).filter(Boolean));
}

function getSession(req) {
  const cookie = parseCookies(req).jamanwg_session;
  if (!cookie || !cookie.includes('.')) return null;
  const [payload, signature] = cookie.split('.');
  if (!safeEqual(sign(payload), signature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    if (session.username !== getAdminUsername()) return null;
    return session;
  } catch {
    return null;
  }
}

function isBearerAuthorized(req) {
  const tokenValue = getApiToken();
  if (!tokenValue) return false;
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  return type === 'Bearer' && token && safeEqual(token, tokenValue);
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'"
    ].join('; ')
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...securityHeaders(),
    ...corsHeaders(),
    ...headers
  });
  res.end(body);
}

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...securityHeaders(),
    ...corsHeaders(),
    ...headers
  });
  res.end(JSON.stringify(payload, null, 2));
}

function corsHeaders() {
  const origin = process.env.JAMANWG_CORS_ORIGIN;
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error('Request body is too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}

function requireAdmin(req, res) {
  if (getSession(req)) return true;
  applyRateLimit(req, 'admin-auth', { limit: 120, windowMs: 15 * 60 * 1000 });
  json(res, 401, { error: 'Admin session required' });
  return false;
}

function requireApiToken(req, res) {
  if (isBearerAuthorized(req)) return true;
  applyRateLimit(req, 'api-token', { limit: 120, windowMs: 15 * 60 * 1000 });
  json(res, 401, { error: 'Bearer token required' });
  return false;
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function applyRateLimit(req, scope, { limit, windowMs }) {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}`;
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneRateLimits(now);
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw Object.assign(new Error('RATE_LIMITED'), {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) }
    });
  }
}

function pruneRateLimits(now) {
  if (rateLimitBuckets.size < 5000) return;
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function parseClientPatch(body, existing = {}) {
  const patch = {};
  if ('name' in body) {
    const name = String(body.name || '').trim();
    if (!name || name.length > 80) throw Object.assign(new Error('name must be 1-80 characters'), { status: 400 });
    patch.name = name;
  }
  if ('email' in body) {
    const email = String(body.email || '').trim();
    if (email && email.length > 120) throw Object.assign(new Error('email is too long'), { status: 400 });
    patch.email = email || null;
  }
  if ('allowedIps' in body) {
    const allowedIps = String(body.allowedIps || '').trim();
    if (!allowedIps || allowedIps.length > 120) throw Object.assign(new Error('allowedIps is required'), { status: 400 });
    patch.allowedIps = allowedIps;
  }
  if ('dns' in body) {
    const dns = String(body.dns || '').trim();
    if (!dns || dns.length > 120) throw Object.assign(new Error('dns is required'), { status: 400 });
    patch.dns = dns;
  }
  if ('endpoint' in body) {
    const endpoint = String(body.endpoint || '').trim();
    if (!endpoint || endpoint.length > 200) throw Object.assign(new Error('endpoint is required'), { status: 400 });
    patch.endpoint = endpoint;
  }
  if ('enabled' in body) patch.enabled = Boolean(body.enabled);
  if ('trafficLimitBytes' in body) {
    const value = body.trafficLimitBytes === null || body.trafficLimitBytes === '' ? null : Number(body.trafficLimitBytes);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      throw Object.assign(new Error('trafficLimitBytes must be a positive number'), { status: 400 });
    }
    patch.trafficLimitBytes = value;
  }
  if ('deviceLimit' in body) {
    const value = body.deviceLimit === null || body.deviceLimit === '' ? 1 : Number(body.deviceLimit);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw Object.assign(new Error('deviceLimit must be an integer from 0 to 100'), { status: 400 });
    }
    patch.deviceLimit = value;
  }
  if ('expiresAt' in body) {
    const expiresAt = String(body.expiresAt || '').trim();
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
      throw Object.assign(new Error('expiresAt must be an ISO date'), { status: 400 });
    }
    patch.expiresAt = expiresAt || null;
  }

  return {
    name: existing.name,
    email: existing.email ?? null,
    allowedIps: existing.allowedIps ?? config.allowedIps,
    dns: existing.dns ?? config.dns,
    endpoint: existing.endpoint ?? config.endpoint,
    enabled: existing.enabled ?? true,
    trafficLimitBytes: existing.trafficLimitBytes ?? null,
    deviceLimit: existing.deviceLimit ?? 1,
    expiresAt: existing.expiresAt ?? null,
    ...patch
  };
}

function normalizeHwid(raw) {
  const hwid = String(raw || '').trim();
  if (!hwid || hwid.length < 4 || hwid.length > 180) {
    throw Object.assign(new Error('hwid must be 4-180 characters'), { status: 400 });
  }
  return hwid;
}

function assertClientUsable(client) {
  if (!client.enabled) throw Object.assign(new Error('CLIENT_DISABLED'), { status: 403 });
  if (client.expiresAt && Date.parse(client.expiresAt) <= Date.now()) {
    throw Object.assign(new Error('CLIENT_EXPIRED'), { status: 403 });
  }
  const usedTraffic = Number(client.rxBytes || 0) + Number(client.txBytes || 0);
  if (client.trafficLimitBytes && usedTraffic >= Number(client.trafficLimitBytes)) {
    throw Object.assign(new Error('CLIENT_TRAFFIC_LIMIT_REACHED'), { status: 403 });
  }
}

function authorizeClientHwid(client, body, req) {
  assertClientUsable(client);
  const hwid = normalizeHwid(body.hwid || req.headers['x-device-hwid']);
  const label = String(body.label || body.deviceName || '').trim().slice(0, 120) || null;
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 300) || null;

  const existing = getClientDeviceByHwid(client.id, hwid);
  if (existing && !existing.revokedAt) {
    return {
      device: touchClientDevice(client.id, hwid, { label, userAgent }),
      created: false
    };
  }

  const limit = Number(client.deviceLimit ?? 1);
  if (limit > 0 && countActiveClientDevices(client.id) >= limit) {
    throw Object.assign(new Error('DEVICE_LIMIT_REACHED'), { status: 403 });
  }

  return {
    device: createClientDevice({
      id: randomUUID(),
      clientId: client.id,
      hwid,
      label,
      userAgent
    }),
    created: true
  };
}

async function createClient(body) {
  const defaults = parseClientPatch({
    name: body.name,
    email: body.email,
    allowedIps: body.allowedIps || config.allowedIps,
    dns: body.dns || config.dns,
    endpoint: body.endpoint || defaultClientEndpoint(),
    enabled: body.enabled ?? true,
    trafficLimitBytes: body.trafficLimitBytes ?? null,
    deviceLimit: body.deviceLimit ?? 1,
    expiresAt: body.expiresAt || null
  });

  const keys = await generateKeyPair();
  const client = createClientRecord({
    id: randomUUID(),
    name: defaults.name,
    email: defaults.email,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
    presharedKey: await generatePresharedKey(),
    address: allocateClientAddress(),
    allowedIps: defaults.allowedIps,
    dns: defaults.dns,
    endpoint: defaults.endpoint,
    enabled: defaults.enabled,
    trafficLimitBytes: defaults.trafficLimitBytes,
    deviceLimit: defaults.deviceLimit,
    expiresAt: defaults.expiresAt
  });

  const result = { client };
  try {
    result.sync = await syncClient(client);
  } catch (error) {
    result.syncWarning = error.message;
    logEvent(client.id, 'sync.warning', error.message);
  }
  return result;
}

async function allocateBalancedClient(body) {
  const payload = normalizeBalancerAllocationPayload(body);
  const selection = selectBalancerNode({
    groupName: payload.groupName,
    includeLocal: payload.includeLocal
  });

  if (selection.selected.type === 'local') {
    const result = await createClient(payload);
    const bundle = await renderClientBundle(result.client);
    return {
      placement: 'local',
      node: publicBalancerNode(localBalanceNode()),
      candidates: selection.candidates,
      client: publicClient(result.client),
      config: await renderClientConfig(result.client),
      bundle: bundle.bundle,
      entries: bundle.entries,
      sync: result.sync,
      syncWarning: result.syncWarning
    };
  }

  const result = await createRemoteClient(selection.selected, payload);
  await refreshRemoteNodeHealth(selection.selected).catch(() => null);
  return {
    placement: 'remote',
    candidates: selection.candidates,
    ...result
  };
}

async function runPolicyMaintenance() {
  if (maintenanceRunning) return { skipped: true };
  maintenanceRunning = true;
  try {
    await refreshStatsCached().catch(() => null);
    const disabled = disableExpiredOrLimitedClients();
    let sync = null;
    if (disabled.length > 0) {
      sync = await syncInterface().catch((error) => ({ error: error.message }));
    }
    return { disabled: disabled.map(publicClient), sync };
  } finally {
    maintenanceRunning = false;
  }
}

async function handleAdminApi(req, res, url) {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const stats = await refreshStats().catch((error) => ({ refreshed: false, error: error.message }));
    const maintenance = await runPolicyMaintenance().catch((error) => ({ error: error.message }));
    const clients = listClients();
    json(res, 200, {
      ok: true,
      status: runtimeStatus(),
      monitor: systemReport(clients),
      stats,
      maintenance
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/maintenance/enforce') {
    json(res, 200, { ok: true, maintenance: await runPolicyMaintenance() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/traffic/summary') {
    await refreshStatsCached().catch(() => null);
    const period = url.searchParams.get('period') === 'monthly' ? 'monthly' : 'daily';
    const days = Number(url.searchParams.get('days') || (period === 'monthly' ? 366 : 30));
    const limit = Number(url.searchParams.get('limit') || 10);
    json(res, 200, {
      period,
      days,
      history: trafficHistory({ period, days }),
      topClients: topClientsByTraffic({ days, limit })
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    json(res, 200, {
      adminUsername: getAdminUsername(),
      apiToken: getApiToken(),
      restartAvailable: Boolean(config.restartCommand),
      status: runtimeStatus()
    });
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/settings') {
    const body = await readJsonBody(req);
    const currentUsername = getAdminUsername();
    const currentPasswordHash = getAdminPasswordHash();
    const requestedUsername = 'adminUsername' in body ? String(body.adminUsername || '').trim() : currentUsername;
    const wantsCredentialChange = requestedUsername !== currentUsername || String(body.newPassword || '').length > 0;
    let usernameChanged = false;

    if (wantsCredentialChange && !verifyPassword(body.currentPassword || '', currentPasswordHash, config.adminPassword)) {
      throw Object.assign(new Error('CURRENT_PASSWORD_INVALID'), { status: 403 });
    }

    if ('adminUsername' in body && requestedUsername !== currentUsername) {
      const nextUsername = requestedUsername;
      if (!nextUsername || nextUsername.length > 80) {
        throw Object.assign(new Error('adminUsername must be 1-80 characters'), { status: 400 });
      }
      setSetting('admin_username', nextUsername);
      logEvent(null, 'settings.username', `Admin username changed from ${currentUsername} to ${nextUsername}`);
      usernameChanged = true;
    }

    if ('newPassword' in body && String(body.newPassword || '').length > 0) {
      const nextPassword = String(body.newPassword || '');
      if (nextPassword.length < 10 || nextPassword.length > 200) {
        throw Object.assign(new Error('newPassword must be 10-200 characters'), { status: 400 });
      }
      setSetting('admin_password_hash', hashPassword(nextPassword));
      logEvent(null, 'settings.password', 'Admin password changed');
    }

    if ('apiToken' in body) {
      const nextToken = String(body.apiToken || '').trim();
      if (nextToken.length < 24 || nextToken.length > 512) {
        throw Object.assign(new Error('apiToken must be 24-512 characters'), { status: 400 });
      }
      setSetting('api_token', nextToken);
      logEvent(null, 'settings.api_token', 'API token changed');
    }

    const nextUsername = getAdminUsername();
    json(res, 200, {
      ok: true,
      adminUsername: nextUsername,
      apiToken: getApiToken()
    }, usernameChanged ? {
      'Set-Cookie': sessionCookieHeader(req, makeSessionCookie(nextUsername))
    } : {});
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/settings/api-token/regenerate') {
    const token = `jwg_${randomBytes(32).toString('base64url')}`;
    setSetting('api_token', token);
    logEvent(null, 'settings.api_token', 'API token regenerated');
    json(res, 200, { apiToken: token });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/restart') {
    if (!config.restartCommand) {
      throw Object.assign(new Error('JAMANWG_RESTART_COMMAND_NOT_SET'), { status: 400 });
    }
    logEvent(null, 'panel.restart', 'Restart requested from admin panel');
    json(res, 202, { ok: true, message: 'Restart command scheduled' });
    setTimeout(() => {
      const child = spawn('sh', ['-lc', config.restartCommand], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    }, 300);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/balancer') {
    json(res, 200, {
      ...balancerSnapshot(),
      assignments: listBalanceAssignments(50)
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/balancer/allocate') {
    const body = await readJsonBody(req);
    json(res, 201, await allocateBalancedClient(body));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/balancer/check-all') {
    const results = [];
    for (const node of listBalanceNodes({ includeToken: true })) {
      results.push(await refreshRemoteNodeHealth(node));
    }
    json(res, 200, {
      results,
      ...balancerSnapshot(),
      assignments: listBalanceAssignments(50)
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/balancer/nodes') {
    const body = await readJsonBody(req);
    const node = normalizeBalanceNodePayload(body);
    try {
      const created = createBalanceNodeRecord({
        id: randomUUID(),
        ...node
      });
      json(res, 201, { node: created, ...balancerSnapshot() });
    } catch (error) {
      if (String(error.message || '').includes('UNIQUE')) {
        throw Object.assign(new Error('Balancer node with this API URL already exists'), { status: 400 });
      }
      throw error;
    }
    return;
  }

  const balancerNodeMatch = url.pathname.match(/^\/api\/balancer\/nodes\/([^/]+)(?:\/([^/]+))?$/);
  if (balancerNodeMatch) {
    const [, id, action] = balancerNodeMatch;
    const node = getBalanceNode(id, { includeToken: true });
    if (!node) {
      json(res, 404, { error: 'Balancer node not found' });
      return;
    }

    if (req.method === 'PATCH' && !action) {
      const body = await readJsonBody(req);
      const patch = normalizeBalanceNodePayload(body, node);
      const updated = updateBalanceNodeRecord(id, patch);
      json(res, 200, { node: updated, ...balancerSnapshot() });
      return;
    }

    if (req.method === 'POST' && action === 'check') {
      const result = await refreshRemoteNodeHealth(node);
      json(res, 200, { ...result, ...balancerSnapshot() });
      return;
    }

    if (req.method === 'DELETE' && !action) {
      deleteBalanceNodeRecord(id);
      json(res, 200, { ok: true, ...balancerSnapshot() });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/endpoints') {
    json(res, 200, {
      endpoints: listEndpoints(),
      portProfiles
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/endpoints') {
    const body = await readJsonBody(req);
    const endpoint = normalizeEndpointPayload(body);
    try {
      const created = createEndpointRecord({
        id: randomUUID(),
        ...endpoint
      });
      json(res, 201, { endpoint: created, endpoints: listEndpoints() });
    } catch (error) {
      if (String(error.message || '').includes('UNIQUE')) {
        throw Object.assign(new Error('Endpoint with this host, port and transport already exists'), { status: 400 });
      }
      throw error;
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/endpoints/check-all') {
    const results = [];
    for (const endpoint of listEndpoints()) {
      const health = await checkEndpoint(endpoint);
      results.push({
        endpoint: updateEndpointHealth(endpoint.id, health),
        health
      });
    }
    json(res, 200, { results, endpoints: listEndpoints() });
    return;
  }

  const endpointMatch = url.pathname.match(/^\/api\/endpoints\/([^/]+)(?:\/([^/]+))?$/);
  if (endpointMatch) {
    const [, id, action] = endpointMatch;
    const endpoint = getEndpoint(id);
    if (!endpoint) {
      json(res, 404, { error: 'Endpoint not found' });
      return;
    }

    if (req.method === 'PATCH' && !action) {
      const body = await readJsonBody(req);
      const patch = normalizeEndpointPayload(body, endpoint);
      const updated = updateEndpointRecord(id, patch);
      json(res, 200, { endpoint: updated, endpoints: listEndpoints() });
      return;
    }

    if (req.method === 'POST' && action === 'check') {
      const health = await checkEndpoint(endpoint);
      json(res, 200, {
        endpoint: updateEndpointHealth(id, health),
        health
      });
      return;
    }

    if (req.method === 'DELETE' && !action) {
      deleteEndpointRecord(id);
      json(res, 200, { ok: true, endpoints: listEndpoints() });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/clients') {
    const result = listClientsPage({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
      query: url.searchParams.get('q'),
      status: url.searchParams.get('status')
    });
    json(res, 200, {
      clients: result.clients.map(publicClient),
      pagination: result.pagination
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/clients') {
    const body = await readJsonBody(req);
    const result = await createClient(body);
    result.config = await renderClientConfig(result.client);
    result.client = publicClient(result.client);
    json(res, 201, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    const result = recentEventsPage({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit')
    });
    json(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/sync') {
    const sync = await syncInterface();
    json(res, 200, { sync });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/server-config') {
    send(res, 200, await renderServerConfig(), {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${config.interfaceName}.conf"`
    });
    return;
  }

  const deviceDeleteMatch = url.pathname.match(/^\/api\/clients\/([^/]+)\/devices\/([^/]+)$/);
  if (deviceDeleteMatch && req.method === 'DELETE') {
    const [, clientId, deviceId] = deviceDeleteMatch;
    if (!getClient(clientId)) {
      json(res, 404, { error: 'Client not found' });
      return;
    }
    if (!revokeClientDevice(clientId, deviceId)) {
      json(res, 404, { error: 'Device not found' });
      return;
    }
    json(res, 200, { ok: true, devices: listClientDevices(clientId, true) });
    return;
  }

  const clientMatch = url.pathname.match(/^\/api\/clients\/([^/]+)(?:\/([^/]+))?$/);
  if (clientMatch) {
    const [, id, action] = clientMatch;
    const client = getClient(id);
    if (!client) {
      json(res, 404, { error: 'Client not found' });
      return;
    }

    if (req.method === 'GET' && action === 'config') {
      send(res, 200, await renderClientConfig(client), {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${client.name.replace(/[^a-z0-9_-]+/gi, '_')}.conf"`
      });
      return;
    }

    if (req.method === 'GET' && action === 'bundle') {
      const payload = await renderClientBundle(client);
      if (url.searchParams.get('format') === 'raw') {
        send(res, 200, payload.bundle, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${client.name.replace(/[^a-z0-9_-]+/gi, '_')}.txt"`
        });
      } else {
        json(res, 200, {
          client: publicClient(client),
          ...payload
        });
      }
      return;
    }

    if (req.method === 'GET' && action === 'devices') {
      json(res, 200, { devices: listClientDevices(id, true) });
      return;
    }

    if (req.method === 'POST' && action === 'reissue') {
      const oldPublicKey = client.publicKey;
      const keys = await generateKeyPair();
      const updated = reissueClientKeys(id, {
        ...keys,
        presharedKey: await generatePresharedKey()
      });
      await removePeer(oldPublicKey).catch((error) => logEvent(id, 'peer.remove.warning', error.message));
      const sync = await syncInterface().catch((error) => ({ error: error.message }));
      json(res, 200, { client: publicClient(updated), config: await renderClientConfig(updated), sync });
      return;
    }

    if (req.method === 'GET' && action === 'qr.svg') {
      try {
        const configText = await renderClientConfig(client);
        const svg = await renderQrSvg(buildAmneziaUri(configText, client.name));
        send(res, 200, svg, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
      } catch (error) {
        json(res, error.code === 'QR_NOT_AVAILABLE' ? 501 : 500, { error: error.message });
      }
      return;
    }

    if (req.method === 'PATCH' && !action) {
      const body = await readJsonBody(req);
      const patch = parseClientPatch(body, client);
      const updated = updateClientRecord(id, patch);
      const sync = await syncClient(updated).catch((error) => ({ error: error.message }));
      json(res, 200, { client: publicClient(updated), sync });
      return;
    }

    if (req.method === 'DELETE' && !action) {
      deleteClientRecord(id);
      const sync = await syncDeletedClient(client.publicKey).catch((error) => {
        logEvent(id, 'peer.remove.warning', error.message);
        return { error: error.message };
      });
      json(res, 200, { ok: true, sync });
      return;
    }
  }

  json(res, 404, { error: 'Not found' });
}

async function handleWebsiteApi(req, res, url) {
  if (!requireApiToken(req, res)) return;

  if (req.method === 'GET' && url.pathname === '/api/v1/health') {
    json(res, 200, {
      ok: true,
      service: 'jamanWG'
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/balancer') {
    json(res, 200, balancerSnapshot());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/monitor') {
    await refreshStatsCached().catch(() => null);
    const clients = listClients();
    const period = url.searchParams.get('period') === 'monthly' ? 'monthly' : 'daily';
    const days = Number(url.searchParams.get('days') || (period === 'monthly' ? 366 : 30));
    json(res, 200, {
      status: runtimeStatus(),
      monitor: systemReport(clients),
      traffic: {
        period,
        days,
        history: trafficHistory({ period, days }),
        topClients: topClientsByTraffic({ days, limit: Number(url.searchParams.get('limit') || 10) })
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/balancer/allocate') {
    const body = await readJsonBody(req);
    json(res, 201, await allocateBalancedClient(body));
    return;
  }

  const balancerAssignmentMatch = url.pathname.match(/^\/api\/v1\/balancer\/assignments\/([^/]+)(?:\/(.+))?$/);
  if (balancerAssignmentMatch) {
    const [, assignmentId, action] = balancerAssignmentMatch;

    if (req.method === 'GET' && !action) {
      json(res, 200, await getAssignmentClient(assignmentId));
      return;
    }

    if (req.method === 'PATCH' && !action) {
      const body = await readJsonBody(req);
      json(res, 200, await updateAssignmentClient(assignmentId, body));
      return;
    }

    if (req.method === 'POST' && action === 'disable') {
      json(res, 200, await disableAssignmentClient(assignmentId));
      return;
    }

    if (req.method === 'DELETE' && !action) {
      json(res, 200, await deleteAssignmentClient(assignmentId));
      return;
    }

    if (req.method === 'POST' && (action === 'hwid' || action === 'hwid/authorize')) {
      const body = await readJsonBody(req);
      json(res, 200, await authorizeAssignmentHwid(assignmentId, body, {
        'user-agent': String(req.headers['user-agent'] || '').slice(0, 300)
      }));
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/clients') {
    json(res, 200, { clients: listClients().map(publicApiClient) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/endpoints') {
    json(res, 200, { endpoints: activeEndpointProfiles() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/clients') {
    const body = await readJsonBody(req);
    const result = await createClient(body);
    json(res, 201, {
      client: publicClient(result.client),
      config: await renderClientConfig(result.client),
      sync: result.sync,
      syncWarning: result.syncWarning
    });
    return;
  }

  const hwidMatch = url.pathname.match(/^\/api\/v1\/clients\/([^/]+)\/hwid\/authorize$/);
  if (hwidMatch && req.method === 'POST') {
    const [, id] = hwidMatch;
    const client = getClient(id);
    if (!client) {
      json(res, 404, { error: 'Client not found' });
      return;
    }
    const body = await readJsonBody(req);
    const authorization = authorizeClientHwid(client, body, req);
    const freshClient = getClient(id);
    json(res, 200, {
      allowed: true,
      created: authorization.created,
      device: authorization.device,
      client: publicClient(freshClient),
      config: await renderClientConfig(freshClient)
    });
    return;
  }

  const match = url.pathname.match(/^\/api\/v1\/clients\/([^/]+)(?:\/([^/]+))?$/);
  if (match) {
    const [, id, action] = match;
    const client = getClient(id);
    if (!client) {
      json(res, 404, { error: 'Client not found' });
      return;
    }

    if (req.method === 'GET' && !action) {
      await refreshStatsCached().catch(() => null);
      json(res, 200, { client: publicClient(getClient(id)) });
      return;
    }

    if (req.method === 'GET' && action === 'config') {
      const hwid = url.searchParams.get('hwid') || req.headers['x-device-hwid'];
      if (hwid) authorizeClientHwid(client, { hwid }, req);
      const freshClient = getClient(id);
      json(res, 200, { client: publicClient(freshClient), config: await renderClientConfig(freshClient) });
      return;
    }

    if (req.method === 'GET' && action === 'bundle') {
      const hwid = url.searchParams.get('hwid') || req.headers['x-device-hwid'];
      if (hwid) {
        authorizeClientHwid(client, {
          hwid,
          label: url.searchParams.get('label') || undefined
        }, req);
      }
      const freshClient = getClient(id);
      const payload = await renderClientBundle(freshClient);
      if (url.searchParams.get('format') === 'raw') {
        send(res, 200, payload.bundle, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${freshClient.name.replace(/[^a-z0-9_-]+/gi, '_')}.txt"`
        });
      } else {
        json(res, 200, {
          client: publicClient(freshClient),
          ...payload
        });
      }
      return;
    }

    if (req.method === 'PATCH' && !action) {
      const body = await readJsonBody(req);
      const patch = parseClientPatch(body, client);
      const updated = updateClientRecord(id, patch);
      const sync = await syncClient(updated).catch((error) => ({ error: error.message }));
      json(res, 200, { client: publicClient(updated), config: await renderClientConfig(updated), sync });
      return;
    }

    if (req.method === 'POST' && action === 'disable') {
      const updated = updateClientRecord(id, { enabled: false });
      const sync = await syncClient(updated).catch((error) => ({ error: error.message }));
      json(res, 200, { client: publicClient(updated), sync });
      return;
    }

    if (req.method === 'POST' && action === 'enable') {
      const updated = updateClientRecord(id, { enabled: true });
      const sync = await syncClient(updated).catch((error) => ({ error: error.message }));
      json(res, 200, { client: publicClient(updated), config: await renderClientConfig(updated), sync });
      return;
    }

    if (req.method === 'POST' && action === 'reissue') {
      const oldPublicKey = client.publicKey;
      const keys = await generateKeyPair();
      const updated = reissueClientKeys(id, {
        ...keys,
        presharedKey: await generatePresharedKey()
      });
      await removePeer(oldPublicKey).catch((error) => logEvent(id, 'peer.remove.warning', error.message));
      const sync = await syncClient(updated).catch((error) => ({ error: error.message }));
      json(res, 200, { client: publicClient(updated), config: await renderClientConfig(updated), sync });
      return;
    }

    if (req.method === 'DELETE' && !action) {
      deleteClientRecord(id);
      const sync = await syncDeletedClient(client.publicKey).catch((error) => {
        logEvent(id, 'peer.remove.warning', error.message);
        return { error: error.message };
      });
      json(res, 200, { ok: true, sync });
      return;
    }
  }

  json(res, 404, { error: 'Not found' });
}

async function handleAuth(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/session') {
    const session = getSession(req);
    json(res, 200, {
      authenticated: Boolean(session),
      username: session?.username || null,
      status: runtimeStatus()
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    applyRateLimit(req, 'login', { limit: 20, windowMs: 15 * 60 * 1000 });
    const body = await readJsonBody(req);
    const adminUsername = getAdminUsername();
    const passwordHash = getAdminPasswordHash();
    if (safeEqual(body.username || '', adminUsername) && verifyPassword(body.password || '', passwordHash, config.adminPassword)) {
      json(res, 200, { ok: true }, {
        'Set-Cookie': sessionCookieHeader(req, makeSessionCookie(adminUsername))
      });
    } else {
      json(res, 401, { error: 'Invalid credentials' });
    }
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    json(res, 200, { ok: true }, {
      'Set-Cookie': sessionCookieHeader(req, '', 0)
    });
    return true;
  }

  return false;
}

function serveStatic(req, res, url) {
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  path = decodeURIComponent(path);
  const target = resolve(publicDir, `.${path}`);
  const relativeTarget = relative(publicDir, target);
  if (relativeTarget === '..' || relativeTarget.startsWith('../') || relativeTarget.startsWith('..\\') || relativeTarget === '') {
    send(res, 403, 'Forbidden');
    return;
  }

  const filePath = existsSync(target) ? target : join(publicDir, 'index.html');
  const contentType = mime[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, ...securityHeaders() });
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${config.host}:${config.port}`}`);

  try {
    if (req.method === 'OPTIONS') {
      json(res, 204, {});
      return;
    }

    if (req.method === 'GET' && url.pathname === '/metrics') {
      if (!requireMetricsToken(req, res, url)) return;
      await refreshStatsCached().catch(() => null);
      const clients = listClients();
      const status = runtimeStatus();
      const monitor = systemReport(clients);
      send(res, 200, prometheusMetrics({ clients, status, monitor }), {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      });
      return;
    }

    if (await handleAuth(req, res, url)) return;
    if (url.pathname.startsWith('/api/v1/')) {
      await handleWebsiteApi(req, res, url);
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      await handleAdminApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    const status = error.status || 500;
    json(res, status, { error: error.message || 'Internal server error' }, error.headers || {});
  }
});

server.listen(config.port, config.host, () => {
  const status = runtimeStatus();
  console.log(`jamanWG listening on http://${config.host}:${config.port}`);
  console.log(`Mode: ${status.mode}; interface: ${status.interfaceName}; config: ${status.configPath}`);
  if (config.adminPassword === 'change-me-now') {
    console.warn('Warning: set JAMANWG_ADMIN_PASSWORD before exposing this server.');
  }
  if (!getApiToken()) {
    console.warn('Warning: JAMANWG_API_TOKEN is empty; website API is disabled.');
  }
});

setInterval(() => {
  runPolicyMaintenance().catch((error) => {
    logEvent(null, 'maintenance.warning', error.message);
  });
}, 60 * 1000).unref();
