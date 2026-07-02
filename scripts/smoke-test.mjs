import assert from 'node:assert/strict';

const base = process.env.JAMANWG_TEST_URL || 'http://127.0.0.1:8787';

const jar = new Map();

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (jar.size) headers.set('Cookie', [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; '));

  const response = await fetch(`${base}${path}`, { ...options, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const [cookie] = setCookie.split(';');
    const [key, value] = cookie.split('=');
    jar.set(key, value);
  }
  const text = await response.text();
  const payload = text && response.headers.get('content-type')?.includes('application/json')
    ? JSON.parse(text)
    : text;
  if (!response.ok) throw new Error(payload?.error || payload || `HTTP ${response.status}`);
  return payload;
}

const sessionBefore = await request('/api/session');
assert.equal(sessionBefore.authenticated, false);

await request('/api/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'change-me-now' })
});

const health = await request('/api/health');
assert.equal(health.ok, true);
assert.equal(health.status.addressPool.prefix, 22);
assert.ok(health.status.addressPool.total >= 1021);
assert.ok(health.monitor.cpu.cores >= 1);
assert.ok(health.monitor.memory.totalBytes > 0);
assert.ok(health.monitor.traffic.totalBytes >= 0);

const traffic = await request('/api/traffic/summary');
assert.equal(traffic.period, 'daily');
assert.ok(Array.isArray(traffic.history));
assert.ok(Array.isArray(traffic.topClients));

if (process.env.JAMANWG_API_TOKEN) {
  const metrics = await request('/metrics', {
    headers: { Authorization: `Bearer ${process.env.JAMANWG_API_TOKEN}` }
  });
  assert.match(metrics, /jamanwg_clients_total/);

  const monitor = await request('/api/v1/monitor', {
    headers: { Authorization: `Bearer ${process.env.JAMANWG_API_TOKEN}` }
  });
  assert.ok(monitor.status.addressPool.total >= 1021);
  assert.ok(monitor.monitor.memory.totalBytes > 0);
}

const endpointList = await request('/api/endpoints');
assert.ok(endpointList.endpoints.length >= 1);
assert.ok(endpointList.portProfiles.some((profile) => profile.port === 443));

const created = await request('/api/clients', {
  method: 'POST',
  body: JSON.stringify({ name: `smoke-${Date.now()}` })
});
assert.ok(created.client.id);
assert.match(created.config, /\[Interface\]/);

const subscription = await request(`/api/clients/${created.client.id}/subscription`);
assert.ok(subscription.entries.length >= 1);
assert.match(subscription.subscription, /amneziawg:\/\//);

const list = await request('/api/clients');
assert.ok(list.clients.some((client) => client.id === created.client.id));

const conf = await request(`/api/clients/${created.client.id}/config`);
assert.match(conf, /PrivateKey/);

await request(`/api/clients/${created.client.id}`, { method: 'DELETE' });

console.log('jamanWG smoke test passed');
