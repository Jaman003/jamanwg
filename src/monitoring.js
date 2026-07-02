import { spawnSync } from 'node:child_process';
import { arch, cpus, freemem, hostname, loadavg, platform, totalmem, uptime } from 'node:os';

let previousTrafficSnapshot = null;

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function percent(used, total) {
  if (!total || total <= 0) return 0;
  return round((used / total) * 100, 1);
}

function diskUsage(path = '/') {
  const result = spawnSync('df', ['-kP', path], {
    encoding: 'utf8',
    timeout: 3000
  });

  if (result.error || result.status !== 0) {
    return {
      path,
      error: result.error?.message || result.stderr?.trim() || 'df command failed'
    };
  }

  const line = result.stdout.trim().split(/\r?\n/)[1];
  const columns = line?.split(/\s+/);
  if (!columns || columns.length < 6) {
    return { path, error: 'Unable to parse df output' };
  }

  const totalBytes = Number(columns[1]) * 1024;
  const usedBytes = Number(columns[2]) * 1024;
  const freeBytes = Number(columns[3]) * 1024;
  return {
    path: columns[5] || path,
    totalBytes,
    usedBytes,
    freeBytes,
    usedPercent: percent(usedBytes, totalBytes)
  };
}

function trafficReport(clients) {
  const now = Date.now();
  const rxBytes = clients.reduce((sum, client) => sum + Number(client.rxBytes || 0), 0);
  const txBytes = clients.reduce((sum, client) => sum + Number(client.txBytes || 0), 0);
  const totalBytes = rxBytes + txBytes;
  const onlineSince = now - (5 * 60 * 1000);
  const enabledClients = clients.filter((client) => client.enabled).length;
  const onlineClients = clients.filter((client) => {
    const handshake = client.latestHandshakeAt ? new Date(client.latestHandshakeAt).getTime() : 0;
    return client.enabled && Number.isFinite(handshake) && handshake >= onlineSince;
  }).length;

  let rxBps = null;
  let txBps = null;
  let totalBps = null;
  if (previousTrafficSnapshot) {
    const seconds = Math.max(1, (now - previousTrafficSnapshot.at) / 1000);
    rxBps = Math.max(0, Math.round((rxBytes - previousTrafficSnapshot.rxBytes) / seconds));
    txBps = Math.max(0, Math.round((txBytes - previousTrafficSnapshot.txBytes) / seconds));
    totalBps = rxBps + txBps;
  }

  previousTrafficSnapshot = { at: now, rxBytes, txBytes };

  return {
    clients: clients.length,
    enabledClients,
    onlineClients,
    rxBytes,
    txBytes,
    totalBytes,
    rxBps,
    txBps,
    totalBps
  };
}

export function systemReport(clients = []) {
  const cpuList = cpus();
  const cpuCount = cpuList.length || 1;
  const [load1, load5, load15] = loadavg();
  const totalMemoryBytes = totalmem();
  const freeMemoryBytes = freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);
  const memoryUsage = process.memoryUsage();

  return {
    capturedAt: new Date().toISOString(),
    host: {
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      nodeVersion: process.version,
      uptimeSeconds: Math.round(uptime()),
      processUptimeSeconds: Math.round(process.uptime())
    },
    cpu: {
      cores: cpuCount,
      model: cpuList[0]?.model || 'unknown',
      load1: round(load1),
      load5: round(load5),
      load15: round(load15),
      loadPercent: round((load1 / cpuCount) * 100, 1)
    },
    memory: {
      totalBytes: totalMemoryBytes,
      usedBytes: usedMemoryBytes,
      freeBytes: freeMemoryBytes,
      usedPercent: percent(usedMemoryBytes, totalMemoryBytes),
      processRssBytes: memoryUsage.rss,
      processHeapUsedBytes: memoryUsage.heapUsed
    },
    disk: diskUsage('/'),
    traffic: trafficReport(clients)
  };
}
