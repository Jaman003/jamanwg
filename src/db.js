import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    private_key TEXT NOT NULL,
    public_key TEXT NOT NULL UNIQUE,
    preshared_key TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    allowed_ips TEXT NOT NULL DEFAULT '0.0.0.0/0, ::/0',
    dns TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    traffic_limit_bytes INTEGER,
    device_limit INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    latest_handshake_at TEXT,
    rx_bytes INTEGER NOT NULL DEFAULT 0,
    tx_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS traffic_daily (
    day TEXT PRIMARY KEY,
    rx_bytes INTEGER NOT NULL DEFAULT 0,
    tx_bytes INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS client_traffic_daily (
    client_id TEXT NOT NULL,
    day TEXT NOT NULL,
    rx_bytes INTEGER NOT NULL DEFAULT 0,
    tx_bytes INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (client_id, day),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    action TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS client_devices (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    hwid TEXT NOT NULL,
    label TEXT,
    user_agent TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    revoked_at TEXT,
    UNIQUE(client_id, hwid),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    transport TEXT NOT NULL DEFAULT 'udp',
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 100,
    mtu INTEGER,
    persistent_keepalive INTEGER,
    notes TEXT,
    last_check_at TEXT,
    last_check_status TEXT,
    last_check_ms INTEGER,
    last_check_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(host, port, transport)
  );

  CREATE TABLE IF NOT EXISTS balance_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_url TEXT NOT NULL UNIQUE,
    api_token TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT 'default',
    enabled INTEGER NOT NULL DEFAULT 1,
    weight INTEGER NOT NULL DEFAULT 100,
    max_clients INTEGER,
    max_traffic_bytes INTEGER,
    notes TEXT,
    last_check_at TEXT,
    last_check_status TEXT,
    last_check_ms INTEGER,
    last_check_error TEXT,
    remote_clients INTEGER NOT NULL DEFAULT 0,
    remote_enabled_clients INTEGER NOT NULL DEFAULT 0,
    remote_rx_bytes INTEGER NOT NULL DEFAULT 0,
    remote_tx_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS balance_assignments (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    local_client_id TEXT,
    remote_client_id TEXT,
    external_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (node_id) REFERENCES balance_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (local_client_id) REFERENCES clients(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_client_traffic_daily_day ON client_traffic_daily(day);
  CREATE INDEX IF NOT EXISTS idx_client_traffic_daily_client ON client_traffic_daily(client_id);
`);

function tableColumns(tableName) {
  return new Set(db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name));
}

function ensureColumn(tableName, columnName, ddl) {
  if (!tableColumns(tableName).has(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
  }
}

ensureColumn('clients', 'device_limit', 'device_limit INTEGER NOT NULL DEFAULT 1');

function endpointParts(raw) {
  const endpoint = String(raw || '').trim();
  const match = endpoint.match(/^\[?([^\]]+)\]?:(\d+)$/);
  if (!match) {
    return { host: '127.0.0.1', port: Number(config.listenPort || 51820) };
  }
  return { host: match[1], port: Number(match[2]) };
}

function ensureDefaultEndpoint() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM endpoints').get().count;
  if (count > 0) return;
  const { host, port } = endpointParts(config.endpoint);
  const stamp = nowIso();
  db.prepare(`
    INSERT INTO endpoints (
      id, label, host, port, transport, enabled, priority, mtu,
      persistent_keepalive, notes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'udp', 1, 100, ?, 25, ?, ?, ?)
  `).run(
    'primary',
    'Primary UDP',
    host,
    port,
    config.mtu || null,
    'Created automatically from JAMANWG_ENDPOINT',
    stamp,
    stamp
  );
}

ensureDefaultEndpoint();

function nowIso() {
  return new Date().toISOString();
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function clientFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    privateKey: row.private_key,
    publicKey: row.public_key,
    presharedKey: row.preshared_key,
    address: row.address,
    allowedIps: row.allowed_ips,
    dns: row.dns,
    endpoint: row.endpoint,
    enabled: Boolean(row.enabled),
    trafficLimitBytes: row.traffic_limit_bytes,
    deviceLimit: row.device_limit,
    expiresAt: row.expires_at,
    latestHandshakeAt: row.latest_handshake_at,
    rxBytes: row.rx_bytes,
    txBytes: row.tx_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function endpointFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    host: row.host,
    port: row.port,
    endpoint: `${row.host}:${row.port}`,
    transport: row.transport,
    enabled: Boolean(row.enabled),
    priority: row.priority,
    mtu: row.mtu,
    persistentKeepalive: row.persistent_keepalive,
    notes: row.notes,
    lastCheckAt: row.last_check_at,
    lastCheckStatus: row.last_check_status,
    lastCheckMs: row.last_check_ms,
    lastCheckError: row.last_check_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function balanceNodeFromRow(row, { includeToken = false } = {}) {
  if (!row) return null;
  const totalTraffic = Number(row.remote_rx_bytes || 0) + Number(row.remote_tx_bytes || 0);
  const token = row.api_token || '';
  return {
    id: row.id,
    name: row.name,
    apiUrl: row.api_url,
    apiToken: includeToken ? token : undefined,
    apiTokenMasked: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : '',
    groupName: row.group_name,
    enabled: Boolean(row.enabled),
    weight: row.weight,
    maxClients: row.max_clients,
    maxTrafficBytes: row.max_traffic_bytes,
    notes: row.notes,
    lastCheckAt: row.last_check_at,
    lastCheckStatus: row.last_check_status,
    lastCheckMs: row.last_check_ms,
    lastCheckError: row.last_check_error,
    remoteClients: row.remote_clients,
    remoteEnabledClients: row.remote_enabled_clients,
    remoteRxBytes: row.remote_rx_bytes,
    remoteTxBytes: row.remote_tx_bytes,
    remoteTrafficBytes: totalTraffic,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assignmentFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nodeId: row.node_id,
    localClientId: row.local_client_id,
    remoteClientId: row.remote_client_id,
    externalUserId: row.external_user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? null;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, nowIso());
}

export function listClients() {
  return db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all().map(clientFromRow);
}

export function listClientsPage(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const requestedPage = Math.max(Number(options.page) || 1, 1);
  const query = String(options.query || '').trim();
  const status = String(options.status || 'all').toLowerCase();
  const where = [];
  const params = [];

  if (status === 'enabled') {
    where.push('enabled = 1');
  } else if (status === 'disabled') {
    where.push('enabled = 0');
  } else if (status === 'online') {
    where.push('enabled = 1 AND latest_handshake_at IS NOT NULL AND latest_handshake_at >= ?');
    params.push(new Date(Date.now() - 5 * 60 * 1000).toISOString());
  }

  if (query) {
    const pattern = `%${query.toLowerCase()}%`;
    where.push(`(
      LOWER(COALESCE(id, '')) LIKE ?
      OR LOWER(COALESCE(name, '')) LIKE ?
      OR LOWER(COALESCE(email, '')) LIKE ?
      OR LOWER(COALESCE(address, '')) LIKE ?
      OR LOWER(COALESCE(allowed_ips, '')) LIKE ?
      OR LOWER(COALESCE(dns, '')) LIKE ?
      OR LOWER(COALESCE(endpoint, '')) LIKE ?
      OR LOWER(COALESCE(private_key, '')) LIKE ?
      OR LOWER(COALESCE(public_key, '')) LIKE ?
      OR LOWER(COALESCE(preshared_key, '')) LIKE ?
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare('SELECT COUNT(*) AS count FROM clients').get().count;
  const filtered = db.prepare(`SELECT COUNT(*) AS count FROM clients ${whereSql}`).get(...params).count;
  const totalPages = Math.max(1, Math.ceil(filtered / limit));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * limit;
  const clients = db.prepare(`
    SELECT * FROM clients
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset).map(clientFromRow);

  return {
    clients,
    pagination: {
      page,
      limit,
      total,
      filtered,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  };
}

export function listEnabledClients() {
  return db.prepare('SELECT * FROM clients WHERE enabled = 1 ORDER BY created_at ASC').all().map(clientFromRow);
}

export function getClient(id) {
  return clientFromRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(id));
}

export function getClientByPublicKey(publicKey) {
  return clientFromRow(db.prepare('SELECT * FROM clients WHERE public_key = ?').get(publicKey));
}

export function listEndpoints(includeDisabled = true) {
  const where = includeDisabled ? '' : 'WHERE enabled = 1';
  return db.prepare(`
    SELECT * FROM endpoints
    ${where}
    ORDER BY priority ASC, created_at ASC
  `).all().map(endpointFromRow);
}

export function listEnabledEndpoints() {
  return listEndpoints(false);
}

export function getEndpoint(id) {
  return endpointFromRow(db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id));
}

export function createEndpointRecord(endpoint) {
  const stamp = nowIso();
  db.prepare(`
    INSERT INTO endpoints (
      id, label, host, port, transport, enabled, priority, mtu,
      persistent_keepalive, notes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    endpoint.id,
    endpoint.label,
    endpoint.host,
    endpoint.port,
    endpoint.transport || 'udp',
    endpoint.enabled ? 1 : 0,
    Number.isFinite(Number(endpoint.priority)) ? Number(endpoint.priority) : 100,
    endpoint.mtu ?? null,
    endpoint.persistentKeepalive ?? 25,
    endpoint.notes || null,
    stamp,
    stamp
  );
  logEvent(null, 'endpoint.created', `Created endpoint ${endpoint.label} ${endpoint.host}:${endpoint.port}`);
  return getEndpoint(endpoint.id);
}

export function updateEndpointRecord(id, patch) {
  const existing = getEndpoint(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  db.prepare(`
    UPDATE endpoints
    SET label = ?, host = ?, port = ?, transport = ?, enabled = ?, priority = ?,
        mtu = ?, persistent_keepalive = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.label,
    next.host,
    next.port,
    next.transport || 'udp',
    next.enabled ? 1 : 0,
    Number.isFinite(Number(next.priority)) ? Number(next.priority) : 100,
    next.mtu ?? null,
    next.persistentKeepalive ?? 25,
    next.notes || null,
    nowIso(),
    id
  );
  logEvent(null, 'endpoint.updated', `Updated endpoint ${next.label} ${next.host}:${next.port}`);
  return getEndpoint(id);
}

export function deleteEndpointRecord(id) {
  const existing = getEndpoint(id);
  if (!existing) return false;
  db.prepare('DELETE FROM endpoints WHERE id = ?').run(id);
  logEvent(null, 'endpoint.deleted', `Deleted endpoint ${existing.label} ${existing.host}:${existing.port}`);
  return true;
}

export function updateEndpointHealth(id, health) {
  db.prepare(`
    UPDATE endpoints
    SET last_check_at = ?, last_check_status = ?, last_check_ms = ?, last_check_error = ?, updated_at = ?
    WHERE id = ?
  `).run(
    health.checkedAt || nowIso(),
    health.status || 'unknown',
    health.ms ?? null,
    health.error || null,
    nowIso(),
    id
  );
  return getEndpoint(id);
}

export function listBalanceNodes(options = {}) {
  return db.prepare(`
    SELECT * FROM balance_nodes
    ORDER BY enabled DESC, group_name ASC, name ASC, created_at ASC
  `).all().map((row) => balanceNodeFromRow(row, options));
}

export function listEnabledBalanceNodes(options = {}) {
  return db.prepare(`
    SELECT * FROM balance_nodes
    WHERE enabled = 1
    ORDER BY group_name ASC, name ASC, created_at ASC
  `).all().map((row) => balanceNodeFromRow(row, options));
}

export function getBalanceNode(id, options = {}) {
  return balanceNodeFromRow(db.prepare('SELECT * FROM balance_nodes WHERE id = ?').get(id), options);
}

export function createBalanceNodeRecord(node) {
  const stamp = nowIso();
  db.prepare(`
    INSERT INTO balance_nodes (
      id, name, api_url, api_token, group_name, enabled, weight,
      max_clients, max_traffic_bytes, notes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    node.id,
    node.name,
    node.apiUrl,
    node.apiToken,
    node.groupName || 'default',
    node.enabled ? 1 : 0,
    Number.isFinite(Number(node.weight)) ? Number(node.weight) : 100,
    node.maxClients ?? null,
    node.maxTrafficBytes ?? null,
    node.notes || null,
    stamp,
    stamp
  );
  logEvent(null, 'balancer.node.created', `Created balancer node ${node.name}`);
  return getBalanceNode(node.id);
}

export function updateBalanceNodeRecord(id, patch) {
  const existing = getBalanceNode(id, { includeToken: true });
  if (!existing) return null;
  const next = { ...existing, ...patch };
  db.prepare(`
    UPDATE balance_nodes
    SET name = ?, api_url = ?, api_token = ?, group_name = ?, enabled = ?,
        weight = ?, max_clients = ?, max_traffic_bytes = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.apiUrl,
    next.apiToken || existing.apiToken,
    next.groupName || 'default',
    next.enabled ? 1 : 0,
    Number.isFinite(Number(next.weight)) ? Number(next.weight) : 100,
    next.maxClients ?? null,
    next.maxTrafficBytes ?? null,
    next.notes || null,
    nowIso(),
    id
  );
  logEvent(null, 'balancer.node.updated', `Updated balancer node ${next.name}`);
  return getBalanceNode(id);
}

export function deleteBalanceNodeRecord(id) {
  const existing = getBalanceNode(id);
  if (!existing) return false;
  db.prepare('DELETE FROM balance_nodes WHERE id = ?').run(id);
  logEvent(null, 'balancer.node.deleted', `Deleted balancer node ${existing.name}`);
  return true;
}

export function updateBalanceNodeHealth(id, health) {
  db.prepare(`
    UPDATE balance_nodes
    SET last_check_at = ?, last_check_status = ?, last_check_ms = ?, last_check_error = ?,
        remote_clients = ?, remote_enabled_clients = ?, remote_rx_bytes = ?, remote_tx_bytes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    health.checkedAt || nowIso(),
    health.status || 'unknown',
    health.ms ?? null,
    health.error || null,
    health.remoteClients ?? 0,
    health.remoteEnabledClients ?? 0,
    health.remoteRxBytes ?? 0,
    health.remoteTxBytes ?? 0,
    nowIso(),
    id
  );
  return getBalanceNode(id);
}

export function createBalanceAssignmentRecord(assignment) {
  const stamp = nowIso();
  db.prepare(`
    INSERT INTO balance_assignments (
      id, node_id, local_client_id, remote_client_id, external_user_id, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    assignment.id,
    assignment.nodeId,
    assignment.localClientId || null,
    assignment.remoteClientId || null,
    assignment.externalUserId || null,
    assignment.status || 'active',
    stamp,
    stamp
  );
  logEvent(assignment.localClientId || null, 'balancer.assignment.created', `Assigned client to node ${assignment.nodeId}`);
  return getBalanceAssignment(assignment.id);
}

export function getBalanceAssignment(id) {
  return assignmentFromRow(db.prepare('SELECT * FROM balance_assignments WHERE id = ?').get(id));
}

export function deleteBalanceAssignmentRecord(id) {
  const assignment = getBalanceAssignment(id);
  if (!assignment) return null;
  db.prepare('DELETE FROM balance_assignments WHERE id = ?').run(id);
  logEvent(assignment.localClientId || null, 'balancer.assignment.deleted', `Deleted balancer assignment ${id}`);
  return assignment;
}

export function listBalanceAssignments(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return db.prepare(`
    SELECT * FROM balance_assignments
    ORDER BY id DESC
    LIMIT ?
  `).all(safeLimit).map(assignmentFromRow);
}

export function createClientRecord(client) {
  const stamp = nowIso();
  db.prepare(`
    INSERT INTO clients (
      id, name, email, private_key, public_key, preshared_key, address,
      allowed_ips, dns, endpoint, enabled, traffic_limit_bytes, expires_at,
      device_limit, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    client.id,
    client.name,
    client.email || null,
    client.privateKey,
    client.publicKey,
    client.presharedKey,
    client.address,
    client.allowedIps,
    client.dns,
    client.endpoint,
    client.enabled ? 1 : 0,
    client.trafficLimitBytes ?? null,
    client.expiresAt || null,
    Number.isFinite(Number(client.deviceLimit)) ? Number(client.deviceLimit) : 1,
    stamp,
    stamp
  );
  logEvent(client.id, 'client.created', `Created client ${client.name}`);
  return getClient(client.id);
}

export function updateClientRecord(id, patch) {
  const existing = getClient(id);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    email: patch.email === '' ? null : patch.email,
    expiresAt: patch.expiresAt === '' ? null : patch.expiresAt,
    trafficLimitBytes: patch.trafficLimitBytes === '' ? null : patch.trafficLimitBytes
  };

  db.prepare(`
    UPDATE clients
    SET name = ?, email = ?, allowed_ips = ?, dns = ?, endpoint = ?,
        enabled = ?, traffic_limit_bytes = ?, expires_at = ?, device_limit = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.email || null,
    next.allowedIps,
    next.dns,
    next.endpoint,
    next.enabled ? 1 : 0,
    next.trafficLimitBytes ?? null,
    next.expiresAt || null,
    Number.isFinite(Number(next.deviceLimit)) ? Number(next.deviceLimit) : 1,
    nowIso(),
    id
  );
  logEvent(id, 'client.updated', `Updated client ${next.name}`);
  return getClient(id);
}

export function reissueClientKeys(id, keys) {
  const existing = getClient(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE clients
    SET private_key = ?, public_key = ?, preshared_key = ?, updated_at = ?
    WHERE id = ?
  `).run(keys.privateKey, keys.publicKey, keys.presharedKey, nowIso(), id);
  logEvent(id, 'client.reissued', `Reissued keys for ${existing.name}`);
  return getClient(id);
}

export function deleteClientRecord(id) {
  const existing = getClient(id);
  if (!existing) return false;
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  logEvent(null, 'client.deleted', `Deleted client ${existing.name}`);
  return true;
}

export function disableExpiredOrLimitedClients() {
  const now = nowIso();
  const rows = db.prepare(`
    SELECT * FROM clients
    WHERE enabled = 1
      AND (
        (expires_at IS NOT NULL AND expires_at != '' AND expires_at <= ?)
        OR (
          traffic_limit_bytes IS NOT NULL
          AND traffic_limit_bytes > 0
          AND (rx_bytes + tx_bytes) >= traffic_limit_bytes
        )
      )
  `).all(now);

  for (const row of rows) {
    const reason =
      row.expires_at && row.expires_at <= now
        ? 'expired'
        : 'traffic limit reached';
    db.prepare('UPDATE clients SET enabled = 0, updated_at = ? WHERE id = ?').run(now, row.id);
    logEvent(row.id, 'client.auto_disabled', `Client ${row.name} auto disabled: ${reason}`);
  }

  return rows.map(clientFromRow);
}

export function updateStats(publicKey, stats) {
  const existing = db.prepare('SELECT id, rx_bytes, tx_bytes FROM clients WHERE public_key = ?').get(publicKey);
  if (!existing) return;

  const stamp = nowIso();
  const rxBytes = Number.isFinite(Number(stats.rxBytes)) ? Number(stats.rxBytes) : 0;
  const txBytes = Number.isFinite(Number(stats.txBytes)) ? Number(stats.txBytes) : 0;
  const rxDelta = Math.max(0, rxBytes - Number(existing.rx_bytes || 0));
  const txDelta = Math.max(0, txBytes - Number(existing.tx_bytes || 0));

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      UPDATE clients
      SET latest_handshake_at = ?, rx_bytes = ?, tx_bytes = ?, updated_at = ?
      WHERE public_key = ?
    `).run(
      stats.latestHandshakeAt || null,
      rxBytes,
      txBytes,
      stamp,
      publicKey
    );

    if (rxDelta > 0 || txDelta > 0) {
      const day = dayKey();
      db.prepare(`
        INSERT INTO traffic_daily (day, rx_bytes, tx_bytes, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(day) DO UPDATE SET
          rx_bytes = rx_bytes + excluded.rx_bytes,
          tx_bytes = tx_bytes + excluded.tx_bytes,
          updated_at = excluded.updated_at
      `).run(day, rxDelta, txDelta, stamp);

      db.prepare(`
        INSERT INTO client_traffic_daily (client_id, day, rx_bytes, tx_bytes, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(client_id, day) DO UPDATE SET
          rx_bytes = rx_bytes + excluded.rx_bytes,
          tx_bytes = tx_bytes + excluded.tx_bytes,
          updated_at = excluded.updated_at
      `).run(existing.id, day, rxDelta, txDelta, stamp);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function trafficSinceClause(days) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 366);
  const since = dayKey(new Date(Date.now() - ((safeDays - 1) * 24 * 60 * 60 * 1000)));
  return { safeDays, since };
}

export function trafficHistory({ period = 'daily', days = 30 } = {}) {
  const normalizedPeriod = period === 'monthly' ? 'monthly' : 'daily';
  const { safeDays, since } = trafficSinceClause(days);

  if (normalizedPeriod === 'monthly') {
    return db.prepare(`
      SELECT
        substr(day, 1, 7) AS period,
        SUM(rx_bytes) AS rxBytes,
        SUM(tx_bytes) AS txBytes,
        SUM(rx_bytes + tx_bytes) AS totalBytes
      FROM traffic_daily
      WHERE day >= ?
      GROUP BY substr(day, 1, 7)
      ORDER BY period ASC
    `).all(since).map((row) => ({
      period: row.period,
      rxBytes: row.rxBytes || 0,
      txBytes: row.txBytes || 0,
      totalBytes: row.totalBytes || 0
    }));
  }

  return db.prepare(`
    SELECT day AS period, rx_bytes AS rxBytes, tx_bytes AS txBytes, rx_bytes + tx_bytes AS totalBytes
    FROM traffic_daily
    WHERE day >= ?
    ORDER BY day ASC
    LIMIT ?
  `).all(since, safeDays).map((row) => ({
    period: row.period,
    rxBytes: row.rxBytes || 0,
    txBytes: row.txBytes || 0,
    totalBytes: row.totalBytes || 0
  }));
}

export function topClientsByTraffic({ days = 30, limit = 10 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const { since } = trafficSinceClause(days);

  return db.prepare(`
    SELECT
      c.id,
      c.name,
      c.email,
      c.address,
      c.enabled,
      c.rx_bytes AS rxBytes,
      c.tx_bytes AS txBytes,
      COALESCE(SUM(d.rx_bytes), 0) AS periodRxBytes,
      COALESCE(SUM(d.tx_bytes), 0) AS periodTxBytes
    FROM clients c
    LEFT JOIN client_traffic_daily d ON d.client_id = c.id AND d.day >= ?
    GROUP BY c.id
    ORDER BY (periodRxBytes + periodTxBytes) DESC, (c.rx_bytes + c.tx_bytes) DESC
    LIMIT ?
  `).all(since, safeLimit).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    address: row.address,
    enabled: Boolean(row.enabled),
    rxBytes: row.rxBytes || 0,
    txBytes: row.txBytes || 0,
    totalBytes: Number(row.rxBytes || 0) + Number(row.txBytes || 0),
    periodRxBytes: row.periodRxBytes || 0,
    periodTxBytes: row.periodTxBytes || 0,
    periodTotalBytes: Number(row.periodRxBytes || 0) + Number(row.periodTxBytes || 0)
  }));
}

function deviceFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    hwid: row.hwid,
    label: row.label,
    userAgent: row.user_agent,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at
  };
}

export function listClientDevices(clientId, includeRevoked = false) {
  const where = includeRevoked ? 'client_id = ?' : 'client_id = ? AND revoked_at IS NULL';
  return db.prepare(`
    SELECT * FROM client_devices
    WHERE ${where}
    ORDER BY last_seen_at DESC
  `).all(clientId).map(deviceFromRow);
}

export function countActiveClientDevices(clientId) {
  return db.prepare('SELECT COUNT(*) AS count FROM client_devices WHERE client_id = ? AND revoked_at IS NULL')
    .get(clientId).count;
}

export function getClientDeviceByHwid(clientId, hwid) {
  return deviceFromRow(db.prepare(`
    SELECT * FROM client_devices
    WHERE client_id = ? AND hwid = ?
  `).get(clientId, hwid));
}

export function createClientDevice(device) {
  const stamp = nowIso();
  db.prepare(`
    INSERT INTO client_devices (id, client_id, hwid, label, user_agent, first_seen_at, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    device.id,
    device.clientId,
    device.hwid,
    device.label || null,
    device.userAgent || null,
    stamp,
    stamp
  );
  logEvent(device.clientId, 'device.bound', `Bound HWID ${device.hwid}`);
  return getClientDeviceByHwid(device.clientId, device.hwid);
}

export function touchClientDevice(clientId, hwid, patch = {}) {
  const existing = getClientDeviceByHwid(clientId, hwid);
  if (!existing) return null;
  db.prepare(`
    UPDATE client_devices
    SET label = COALESCE(?, label),
        user_agent = COALESCE(?, user_agent),
        last_seen_at = ?,
        revoked_at = NULL
    WHERE client_id = ? AND hwid = ?
  `).run(
    patch.label || null,
    patch.userAgent || null,
    nowIso(),
    clientId,
    hwid
  );
  return getClientDeviceByHwid(clientId, hwid);
}

export function revokeClientDevice(clientId, deviceId) {
  const existing = db.prepare('SELECT * FROM client_devices WHERE client_id = ? AND id = ?').get(clientId, deviceId);
  if (!existing) return false;
  db.prepare('UPDATE client_devices SET revoked_at = ?, last_seen_at = ? WHERE client_id = ? AND id = ?')
    .run(nowIso(), nowIso(), clientId, deviceId);
  logEvent(clientId, 'device.revoked', `Revoked HWID ${existing.hwid}`);
  return true;
}

export function logEvent(clientId, action, message) {
  db.prepare('INSERT INTO events (client_id, action, message, created_at) VALUES (?, ?, ?, ?)')
    .run(clientId || null, action, message, nowIso());
}

export function recentEvents(limit = 30) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  return db.prepare(`
    SELECT id, client_id AS clientId, action, message, created_at AS createdAt
    FROM events
    ORDER BY id DESC
    LIMIT ?
  `).all(safeLimit);
}

export function recentEventsPage(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const requestedPage = Math.max(Number(options.page) || 1, 1);
  const total = db.prepare('SELECT COUNT(*) AS count FROM events').get().count;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * limit;
  const events = db.prepare(`
    SELECT id, client_id AS clientId, action, message, created_at AS createdAt
    FROM events
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      filtered: total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  };
}
