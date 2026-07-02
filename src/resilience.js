import { lookup } from 'node:dns/promises';
import dgram from 'node:dgram';
import { performance } from 'node:perf_hooks';
import { config } from './config.js';

export const portProfiles = [
  {
    id: 'udp443',
    label: 'UDP 443',
    port: 443,
    transport: 'udp',
    mtu: 1280,
    persistentKeepalive: 15,
    notes: 'Best first try for strict mobile networks and public Wi-Fi.'
  },
  {
    id: 'udp8443',
    label: 'UDP 8443',
    port: 8443,
    transport: 'udp',
    mtu: 1360,
    persistentKeepalive: 15,
    notes: 'Fallback port when UDP 443 is already used or filtered.'
  },
  {
    id: 'udp51820',
    label: 'UDP 51820',
    port: 51820,
    transport: 'udp',
    mtu: 1420,
    persistentKeepalive: 25,
    notes: 'Standard WireGuard/AmneziaWG profile for clean networks.'
  }
];

export function defaultEndpointTuning(port) {
  const value = Number(port);
  if (value === 443) {
    return { mtu: 1280, persistentKeepalive: 15 };
  }
  if (value === 8443) {
    return { mtu: 1360, persistentKeepalive: 15 };
  }
  return { mtu: config.mtu, persistentKeepalive: 25 };
}

export function endpointString(endpoint) {
  const host = String(endpoint.host || '').includes(':') && !String(endpoint.host).startsWith('[')
    ? `[${endpoint.host}]`
    : endpoint.host;
  return `${host}:${endpoint.port}`;
}

export function parseEndpointValue(raw) {
  const value = String(raw || '').trim();
  const match = value.match(/^\[?([^\]]+)\]?:(\d+)$/);
  if (!match) return null;
  return {
    host: match[1],
    port: Number(match[2])
  };
}

function cleanHost(raw) {
  const host = String(raw || '').trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!host || host.length > 253 || /[\s/\\]/.test(host)) {
    throw Object.assign(new Error('host must be a domain or IP address'), { status: 400 });
  }
  return host;
}

function cleanPort(raw) {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error('port must be an integer from 1 to 65535'), { status: 400 });
  }
  return port;
}

function cleanOptionalInteger(raw, { min, max, fallback = null, field }) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw Object.assign(new Error(`${field} must be an integer from ${min} to ${max}`), { status: 400 });
  }
  return value;
}

export function normalizeEndpointPayload(body, existing = {}) {
  const fromEndpoint = parseEndpointValue(body.endpoint);
  const label = 'label' in body ? String(body.label || '').trim() : existing.label;
  if (!label || label.length > 80) {
    throw Object.assign(new Error('label must be 1-80 characters'), { status: 400 });
  }

  const host = 'host' in body || fromEndpoint
    ? cleanHost(body.host || fromEndpoint?.host)
    : existing.host;
  const port = 'port' in body || fromEndpoint
    ? cleanPort(body.port || fromEndpoint?.port)
    : existing.port;
  const transport = String(body.transport || existing.transport || 'udp').trim().toLowerCase();
  if (!['udp'].includes(transport)) {
    throw Object.assign(new Error('transport must be udp'), { status: 400 });
  }
  const defaultTuning = defaultEndpointTuning(port);

  return {
    label,
    host,
    port,
    transport,
    enabled: 'enabled' in body ? Boolean(body.enabled) : (existing.enabled ?? true),
    priority: cleanOptionalInteger(body.priority, {
      min: 1,
      max: 9999,
      fallback: existing.priority ?? 100,
      field: 'priority'
    }),
    mtu: cleanOptionalInteger(body.mtu, {
      min: 1200,
      max: 1500,
      fallback: existing.mtu ?? defaultTuning.mtu,
      field: 'mtu'
    }),
    persistentKeepalive: cleanOptionalInteger(body.persistentKeepalive, {
      min: 0,
      max: 120,
      fallback: existing.persistentKeepalive ?? defaultTuning.persistentKeepalive,
      field: 'persistentKeepalive'
    }),
    notes: 'notes' in body ? String(body.notes || '').trim().slice(0, 500) || null : existing.notes ?? null
  };
}

export function base64UrlEncodeUtf8(value) {
  return Buffer.from(String(value), 'utf8').toString('base64url');
}

export function buildAmneziaUri(configText, label) {
  return `amneziawg://${base64UrlEncodeUtf8(configText)}#${encodeURIComponent(label || 'jamanWG')}`;
}

function udpProbe(host, port, timeoutMs, family = 4) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(family === 6 ? 'udp6' : 'udp4');
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('UDP probe timed out'));
    }, timeoutMs);

    socket.once('error', (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });

    socket.send(Buffer.from([0]), port, host, (error) => {
      clearTimeout(timer);
      socket.close();
      if (error) {
        reject(error);
        return;
      }
      resolve(true);
    });
  });
}

export async function checkEndpoint(endpoint, { timeoutMs = 1800 } = {}) {
  const startedAt = performance.now();
  const checkedAt = new Date().toISOString();
  const details = {
    checkedAt,
    endpoint: endpointString(endpoint),
    transport: endpoint.transport || 'udp',
    dnsResolved: false,
    udpProbeSent: false
  };

  try {
    const resolved = await lookup(endpoint.host, { all: true });
    details.dnsResolved = resolved.length > 0;
    details.addresses = resolved.map((item) => item.address);

    if ((endpoint.transport || 'udp') === 'udp') {
      const target = resolved[0]?.address || endpoint.host;
      await udpProbe(target, endpoint.port, timeoutMs, resolved[0]?.family || 4);
      details.udpProbeSent = true;
    }

    const ms = Math.max(1, Math.round(performance.now() - startedAt));
    return {
      status: 'ok',
      checkedAt,
      ms,
      error: null,
      details
    };
  } catch (error) {
    const ms = Math.max(1, Math.round(performance.now() - startedAt));
    return {
      status: details.dnsResolved ? 'warning' : 'error',
      checkedAt,
      ms,
      error: error.message,
      details
    };
  }
}
