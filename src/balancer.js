import { randomUUID } from 'node:crypto';
import {
  createBalanceAssignmentRecord,
  deleteBalanceAssignmentRecord,
  getBalanceAssignment,
  getBalanceNode,
  listBalanceNodes,
  listClients,
  updateBalanceNodeHealth
} from './db.js';

const requestTimeoutMs = 5000;

export function normalizeBalanceNodePayload(body, existing = {}) {
  const name = 'name' in body ? String(body.name || '').trim() : existing.name;
  const apiUrl = 'apiUrl' in body ? normalizeApiUrl(body.apiUrl) : existing.apiUrl;
  const apiToken = 'apiToken' in body
    ? String(body.apiToken || '').trim()
    : existing.apiToken;
  const groupName = 'groupName' in body
    ? String(body.groupName || 'default').trim()
    : existing.groupName || 'default';
  const weight = 'weight' in body ? Number(body.weight || 100) : existing.weight ?? 100;
  const maxClients = normalizeOptionalPositiveInteger(
    'maxClients' in body ? body.maxClients : existing.maxClients,
    'maxClients'
  );
  const maxTrafficBytes = normalizeOptionalPositiveInteger(
    'maxTrafficBytes' in body ? body.maxTrafficBytes : existing.maxTrafficBytes,
    'maxTrafficBytes'
  );

  if (!name || name.length > 80) {
    throw Object.assign(new Error('name must be 1-80 characters'), { status: 400 });
  }
  if (!apiUrl) {
    throw Object.assign(new Error('apiUrl is required'), { status: 400 });
  }
  if (!apiToken || apiToken.length < 16 || apiToken.length > 512) {
    throw Object.assign(new Error('apiToken must be 16-512 characters'), { status: 400 });
  }
  if (!groupName || groupName.length > 60) {
    throw Object.assign(new Error('groupName must be 1-60 characters'), { status: 400 });
  }
  if (!Number.isFinite(weight) || weight < 1 || weight > 1000) {
    throw Object.assign(new Error('weight must be a number from 1 to 1000'), { status: 400 });
  }

  return {
    name,
    apiUrl,
    apiToken,
    groupName,
    enabled: 'enabled' in body ? Boolean(body.enabled) : existing.enabled ?? true,
    weight: Math.round(weight),
    maxClients,
    maxTrafficBytes,
    notes: 'notes' in body ? String(body.notes || '').trim().slice(0, 500) || null : existing.notes || null
  };
}

export function normalizeBalancerAllocationPayload(body) {
  return {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim() || null,
    allowedIps: body.allowedIps,
    dns: body.dns,
    endpoint: body.endpoint,
    enabled: body.enabled ?? true,
    trafficLimitBytes: body.trafficLimitBytes ?? null,
    deviceLimit: body.deviceLimit ?? 1,
    expiresAt: body.expiresAt || null,
    groupName: String(body.groupName || 'default').trim() || 'default',
    externalUserId: String(body.externalUserId || body.email || '').trim() || null,
    includeLocal: body.includeLocal !== false
  };
}

export function localBalanceNode() {
  const clients = listClients();
  const remoteEnabledClients = clients.filter((client) => client.enabled).length;
  const remoteRxBytes = clients.reduce((sum, client) => sum + Number(client.rxBytes || 0), 0);
  const remoteTxBytes = clients.reduce((sum, client) => sum + Number(client.txBytes || 0), 0);
  return {
    id: 'local',
    type: 'local',
    name: 'Local jamanWG',
    apiUrl: 'local',
    groupName: 'default',
    enabled: true,
    weight: 100,
    maxClients: null,
    maxTrafficBytes: null,
    lastCheckStatus: 'ok',
    lastCheckMs: 0,
    lastCheckError: null,
    remoteClients: clients.length,
    remoteEnabledClients,
    remoteRxBytes,
    remoteTxBytes,
    remoteTrafficBytes: remoteRxBytes + remoteTxBytes
  };
}

export function publicBalancerNode(node) {
  const score = calculateNodeScore(node);
  return {
    ...node,
    apiToken: undefined,
    apiTokenMasked: node.apiTokenMasked,
    score,
    loadPercent: Math.round(score.loadRatio * 1000) / 10,
    selectable: isNodeSelectable(node)
  };
}

export function balancerSnapshot() {
  const local = publicBalancerNode(localBalanceNode());
  const nodes = listBalanceNodes().map(publicBalancerNode);
  return {
    strategy: 'weighted-least-loaded',
    local,
    nodes,
    assignmentsHint: 'Use POST /api/v1/balancer/allocate from your billing or subscription backend.'
  };
}

export function selectBalancerNode({ groupName = 'default', includeLocal = true } = {}) {
  const requestedGroup = String(groupName || 'default').trim() || 'default';
  const remoteNodes = listBalanceNodes({ includeToken: true })
    .filter((node) => node.enabled && node.groupName === requestedGroup);
  const candidates = remoteNodes.map((node) => ({ ...node, type: 'remote' }));
  if (includeLocal && requestedGroup === 'default') {
    candidates.push(localBalanceNode());
  }

  const selectable = candidates
    .filter(isNodeSelectable)
    .map((node) => ({
      node,
      score: calculateNodeScore(node)
    }))
    .sort((a, b) => {
      if (a.score.total !== b.score.total) return a.score.total - b.score.total;
      if (a.node.remoteEnabledClients !== b.node.remoteEnabledClients) {
        return a.node.remoteEnabledClients - b.node.remoteEnabledClients;
      }
      return String(a.node.name).localeCompare(String(b.node.name));
    });

  if (!selectable.length) {
    throw Object.assign(new Error('No healthy balancer nodes are available'), { status: 503 });
  }

  return {
    selected: selectable[0].node,
    score: selectable[0].score,
    candidates: selectable.map((item) => ({
      node: publicBalancerNode(item.node),
      score: item.score
    }))
  };
}

export async function checkRemoteNode(node) {
  const startedAt = performance.now();
  try {
    const clientsPayload = await requestNodeJson(node, '/api/v1/clients');
    const clients = Array.isArray(clientsPayload.clients) ? clientsPayload.clients : [];
    await requestNodeJson(node, '/api/v1/endpoints').catch(() => null);
    const remoteRxBytes = clients.reduce((sum, client) => sum + Number(client.rxBytes || 0), 0);
    const remoteTxBytes = clients.reduce((sum, client) => sum + Number(client.txBytes || 0), 0);
    return {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      ms: Math.max(1, Math.round(performance.now() - startedAt)),
      remoteClients: clients.length,
      remoteEnabledClients: clients.filter((client) => client.enabled).length,
      remoteRxBytes,
      remoteTxBytes
    };
  } catch (error) {
    return {
      status: 'down',
      checkedAt: new Date().toISOString(),
      ms: Math.max(1, Math.round(performance.now() - startedAt)),
      error: error.message,
      remoteClients: 0,
      remoteEnabledClients: 0,
      remoteRxBytes: 0,
      remoteTxBytes: 0
    };
  }
}

export async function refreshRemoteNodeHealth(node) {
  const health = await checkRemoteNode(node);
  return {
    health,
    node: updateBalanceNodeHealth(node.id, health)
  };
}

export async function createRemoteClient(node, payload) {
  const created = await requestNodeJson(node, '/api/v1/clients', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      allowedIps: payload.allowedIps,
      dns: payload.dns,
      endpoint: payload.endpoint,
      enabled: payload.enabled,
      trafficLimitBytes: payload.trafficLimitBytes,
      deviceLimit: payload.deviceLimit,
      expiresAt: payload.expiresAt
    })
  });

  const remoteClient = created.client;
  let subscription = null;
  if (remoteClient?.id) {
    subscription = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(remoteClient.id)}/subscription`)
      .catch(() => null);
  }

  const assignment = createBalanceAssignmentRecord({
    id: randomUUID(),
    nodeId: node.id,
    remoteClientId: remoteClient?.id || null,
    externalUserId: payload.externalUserId || payload.email || payload.name || null,
    status: 'active'
  });

  return {
    node: publicBalancerNode(node),
    assignment,
    client: remoteClient,
    config: created.config,
    subscription: subscription?.subscription || null,
    entries: subscription?.entries || []
  };
}

export async function getAssignmentClient(assignmentId) {
  const { assignment, node } = loadRemoteAssignment(assignmentId);
  const payload = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}`);
  const subscription = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}/subscription`)
    .catch(() => null);
  return {
    node: publicBalancerNode(node),
    assignment,
    client: payload.client || null,
    subscription: subscription?.subscription || null,
    entries: subscription?.entries || []
  };
}

export async function updateAssignmentClient(assignmentId, patch) {
  const { assignment, node } = loadRemoteAssignment(assignmentId);
  const payload = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
  const subscription = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}/subscription`)
    .catch(() => null);
  return {
    node: publicBalancerNode(node),
    assignment,
    client: payload.client || null,
    config: payload.config,
    subscription: subscription?.subscription || null,
    entries: subscription?.entries || [],
    sync: payload.sync
  };
}

export async function disableAssignmentClient(assignmentId) {
  const { assignment, node } = loadRemoteAssignment(assignmentId);
  const payload = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}/disable`, {
    method: 'POST'
  });
  return {
    node: publicBalancerNode(node),
    assignment,
    client: payload.client || null,
    sync: payload.sync
  };
}

export async function deleteAssignmentClient(assignmentId) {
  const { assignment, node } = loadRemoteAssignment(assignmentId);
  let payload = null;
  try {
    payload = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}`, {
      method: 'DELETE'
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.includes('404') && !message.toLowerCase().includes('not found')) {
      throw error;
    }
  }
  const deleted = deleteBalanceAssignmentRecord(assignmentId);
  return {
    ok: true,
    node: publicBalancerNode(node),
    assignment: deleted || assignment,
    remote: payload
  };
}

export async function authorizeAssignmentHwid(assignmentId, body, headers = {}) {
  const { assignment, node } = loadRemoteAssignment(assignmentId);
  const payload = await requestNodeJson(node, `/api/v1/clients/${encodeURIComponent(assignment.remoteClientId)}/hwid/authorize`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return {
    node: publicBalancerNode(node),
    assignment,
    ...payload
  };
}

function calculateNodeScore(node) {
  const enabledClients = Number(node.remoteEnabledClients || 0);
  const trafficBytes = Number(node.remoteTrafficBytes ?? (Number(node.remoteRxBytes || 0) + Number(node.remoteTxBytes || 0)));
  const clientRatio = node.maxClients ? enabledClients / Math.max(1, Number(node.maxClients)) : enabledClients / 100;
  const trafficRatio = node.maxTrafficBytes ? trafficBytes / Math.max(1, Number(node.maxTrafficBytes)) : 0;
  const dominantRatio = Math.max(clientRatio, trafficRatio);
  const weightFactor = Math.max(1, Number(node.weight || 100)) / 100;
  const healthPenalty = node.lastCheckStatus === 'down' ? 1000 : node.lastCheckStatus ? 0 : 0.05;
  const total = (dominantRatio / weightFactor) + healthPenalty;
  return {
    total: Math.round(total * 10000) / 10000,
    loadRatio: Math.max(clientRatio, trafficRatio),
    clientRatio,
    trafficRatio,
    healthPenalty
  };
}

function isNodeSelectable(node) {
  if (!node.enabled) return false;
  if (node.lastCheckStatus === 'down') return false;
  if (node.maxClients && Number(node.remoteEnabledClients || 0) >= Number(node.maxClients)) return false;
  const trafficBytes = Number(node.remoteTrafficBytes ?? (Number(node.remoteRxBytes || 0) + Number(node.remoteTxBytes || 0)));
  if (node.maxTrafficBytes && trafficBytes >= Number(node.maxTrafficBytes)) return false;
  return true;
}

async function requestNodeJson(node, path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${node.apiUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${node.apiToken}`,
        ...(options.headers || {})
      },
      body: options.body,
      signal: controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(payload?.error || payload || `HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function loadRemoteAssignment(assignmentId) {
  const assignment = getBalanceAssignment(assignmentId);
  if (!assignment || !assignment.remoteClientId) {
    throw Object.assign(new Error('Balancer assignment not found'), { status: 404 });
  }
  const node = getBalanceNode(assignment.nodeId, { includeToken: true });
  if (!node) {
    throw Object.assign(new Error('Balancer node not found'), { status: 404 });
  }
  return { assignment, node };
}

function normalizeApiUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error('apiUrl must be a valid URL'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('apiUrl must use http or https'), { status: 400 });
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

function normalizeOptionalPositiveInteger(raw, fieldName) {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive number`), { status: 400 });
  }
  return Math.round(value);
}
