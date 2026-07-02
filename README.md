# jamanWG

jamanWG is a small admin panel and HTTP API for managing AmneziaWG peers.
It manages the AmneziaWG interface directly through `awg` and writes an
`awg-quick` compatible config.

## What is included

- Admin login
- SQLite storage
- Client creation, disable, delete
- Admin settings: login/password change, visible API token, token regeneration
- Panel restart action through `JAMANWG_RESTART_COMMAND`
- Client key reissue
- HWID/device slots API for app-side device binding
- Multi-endpoint bundles for fallback ports such as UDP 443/8443
- Endpoint health checks from the admin panel
- Weighted least-loaded balancer for distributing users between jamanWG nodes
- `/22` address pool by default, enough for about 1021 client slots per node
- Server report with CPU load, RAM, disk, uptime, online clients, and total traffic
- Daily/monthly traffic history, top clients by traffic, and Prometheus metrics export
- Automatic disabling when expiry or traffic limit is reached
- `.conf` export for AmneziaWG clients
- Optional QR SVG export through `qrencode`
- External API with Bearer token
- Mock mode for local development without AmneziaWG installed
- Linux production mode through `awg set` and generated server config
- Optional HayVon client import links in the admin UI

## Local run on macOS

```bash
cd ~/Desktop/JamanWG
npm run dev
```

Open:

```text
http://127.0.0.1:8787
```

Default local login:

```text
admin / change-me-now
```

Local macOS will run in `mock` mode because `awg` is not installed. Mock mode
is enough to test the panel, database, API, and config generation.

## Production checklist

Use a Linux server. jamanWG needs root-level access because AmneziaWG interface
management requires privileged network operations.

1. Install Node.js 24+.
2. Install AmneziaWG tools so `awg` and `awg-quick` are available.
3. Install `qrencode` if you want QR export.
4. Copy `.env.example` to `.env`.
5. Change at least:
   - `JAMANWG_ADMIN_PASSWORD`
   - `JAMANWG_SESSION_SECRET`
   - `JAMANWG_API_TOKEN`
   - `JAMANWG_ENDPOINT`
   - `JAMANWG_ADDRESS`
   - `JAMANWG_CONFIG_PATH`
   - optional `JAMANWG_RESTART_COMMAND` if your systemd unit is not named `jamanwg`
6. Start with `npm start`.
7. Put the panel behind HTTPS and restrict access with firewall rules.

## Address pool size

The default AmneziaWG interface address is:

```text
JAMANWG_ADDRESS=10.66.64.1/22
```

That creates the `10.66.64.0/22` private tunnel network. The server uses
`10.66.64.1`, and clients are issued individual `/32` addresses from
`10.66.64.2` through `10.66.67.254`. In practice this gives about 1021 client
slots on one jamanWG node instead of about 253 slots with `/24`.

If you already have an installed node using `10.66.66.1/24`, you can expand it
without reissuing existing clients by changing only the prefix:

```text
JAMANWG_ADDRESS=10.66.66.1/22
```

Existing `10.66.66.x/32` clients remain inside the wider `10.66.64.0/22`
network. New installations should use the cleaner `10.66.64.1/22` default.
Use different non-overlapping pools for different locations, for example
`10.66.64.1/22`, `10.66.68.1/22`, `10.66.72.1/22`, `10.66.76.1/22`.

## Apply modes

`JAMANWG_APPLY_MODE` controls how jamanWG touches AmneziaWG:

- `auto`: uses `both` on Linux when `awg` exists, otherwise `mock`
- `mock`: no system changes, only DB/config generation
- `config`: writes the server config file only
- `live`: applies peers with `awg set` only
- `both`: writes config and applies peers live

For first production testing, use:

```text
JAMANWG_APPLY_MODE=config
```

Review the generated config, then switch to:

```text
JAMANWG_APPLY_MODE=both
```

## Monitoring and Prometheus

The admin dashboard includes:

- CPU, memory, disk, uptime, online clients, and total traffic.
- Daily and monthly traffic history.
- Top clients by period traffic.

Prometheus/Grafana can scrape:

```text
GET /metrics
Authorization: Bearer <JAMANWG_METRICS_TOKEN>
```

If `JAMANWG_METRICS_TOKEN` is empty, `/metrics` accepts `JAMANWG_API_TOKEN`.
If both are empty, metrics export is disabled.

External dashboards can also use the JSON monitor endpoint with the regular
API token:

```text
GET /api/v1/monitor
Authorization: Bearer <JAMANWG_API_TOKEN>
```

## External API

Use `Authorization: Bearer <JAMANWG_API_TOKEN>`.

Create a client:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/clients \
  -H "Authorization: Bearer replace-with-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site-user-1001",
    "email": "user@example.com",
    "trafficLimitBytes": 107374182400,
    "expiresAt": "2026-06-22T00:00:00.000Z"
  }'
```

Response contains:

- `client`
- `config`
- `sync`
- `syncWarning` when the DB write succeeded but system sync failed

List clients:

```bash
curl http://127.0.0.1:8787/api/v1/clients \
  -H "Authorization: Bearer replace-with-api-token"
```

Get client stats:

```bash
curl http://127.0.0.1:8787/api/v1/clients/<client-id> \
  -H "Authorization: Bearer replace-with-api-token"
```

Get config again:

```bash
curl http://127.0.0.1:8787/api/v1/clients/<client-id>/config \
  -H "Authorization: Bearer replace-with-api-token"
```

Get all active endpoint links for one client:

```bash
curl http://127.0.0.1:8787/api/v1/clients/<client-id>/bundle \
  -H "Authorization: Bearer replace-with-api-token"
```

For a plain bundle body:

```bash
curl "http://127.0.0.1:8787/api/v1/clients/<client-id>/bundle?format=raw" \
  -H "Authorization: Bearer replace-with-api-token"
```

List enabled panel endpoints:

```bash
curl http://127.0.0.1:8787/api/v1/endpoints \
  -H "Authorization: Bearer replace-with-api-token"
```

Balancer snapshot:

```bash
curl http://127.0.0.1:8787/api/v1/balancer \
  -H "Authorization: Bearer replace-with-api-token"
```

Create a client through the balancer:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/balancer/allocate \
  -H "Authorization: Bearer replace-with-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site-user-1001",
    "email": "user@example.com",
    "groupName": "default",
    "trafficLimitBytes": 107374182400,
    "expiresAt": "2026-06-22T00:00:00.000Z"
  }'
```

The balancer uses a weighted least-loaded strategy. It ignores disabled nodes,
nodes marked as down, nodes that reached `maxClients`, and nodes that reached
`maxTrafficBytes`. When no remote node is better than the local panel, it
creates the client locally and returns the same `config` and `bundle`
shape.

Update client:

```bash
curl -X PATCH http://127.0.0.1:8787/api/v1/clients/<client-id> \
  -H "Authorization: Bearer replace-with-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "trafficLimitBytes": 214748364800,
    "expiresAt": "2026-07-22T00:00:00.000Z"
  }'
```

Reissue client keys:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/clients/<client-id>/reissue \
  -H "Authorization: Bearer replace-with-api-token"
```

Authorize one app/device by HWID and receive config:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/clients/<client-id>/hwid/authorize \
  -H "Authorization: Bearer replace-with-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "hwid": "device-hwid-from-client-app",
    "label": "iPhone 15"
  }'
```

If the client has `deviceLimit: 1`, the first HWID is bound and a second HWID
receives `DEVICE_LIMIT_REACHED`. Use `deviceLimit: 0` for no HWID slot limit.

Disable client:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/clients/<client-id>/disable \
  -H "Authorization: Bearer replace-with-api-token"
```

Delete client:

```bash
curl -X DELETE http://127.0.0.1:8787/api/v1/clients/<client-id> \
  -H "Authorization: Bearer replace-with-api-token"
```

## Bundle integration

Any website, bot, or external automation can provision clients
through this API and store AmneziaWG configs as one-line bundle entries:

```text
amneziawg://<base64url-client-conf>#<server-name>
```

That line can be merged into a base64 bundle response for your own
customer portal or automation backend. Client apps must decode the base64url
payload after `amneziawg://` back into the original AmneziaWG `.conf`.

jamanWG can now return several entries for the same client through
`/api/v1/clients/<client-id>/bundle`. Each entry uses the same client keys
but a different panel endpoint. This lets your external automation add a new
fallback port or domain in jamanWG and then sync user bundles without
reissuing all client keys.

For multiple physical servers, add each server's jamanWG panel in the
`Balancer` page. Your website should call `/api/v1/balancer/allocate` instead
of choosing a panel itself. The response contains the selected node, created
client, generated config, and bundle body, so the website can store them
next to the user's account or external account record.

## Client app links

The admin UI contains placeholder links for HayVon builds. Replace the
`href="#"` values in `public/index.html` with your public download pages when
you publish the app links. HayVon can also connect to a JamanWG panel by panel
URL and API token, then load the issued WireGuard and AmneziaWG client entries.
The Settings page can copy or open a HayVon panel connection for the current
panel using the visible API token.

## Security notes

- Do not expose jamanWG directly without HTTPS.
- Keep the admin panel closed by firewall or VPN when possible.
- Use a long random `JAMANWG_SESSION_SECRET`.
- Use a long random `JAMANWG_API_TOKEN` for external integrations.
- Do not run arbitrary user input in hooks like `JAMANWG_POST_UP`.
- Back up `data/jamanwg.sqlite`; it contains client private keys.
- HWID limits require the client app/site to request configs through
  `/hwid/authorize`. If you expose the raw `.conf` or `amneziawg://...` line
  directly in a bundle, AmneziaWG itself cannot know the hardware ID.
