import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvFile() {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

readEnvFile();

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function stringEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function modeEnv() {
  const mode = stringEnv('JAMANWG_APPLY_MODE', 'auto').toLowerCase();
  if (['auto', 'mock', 'config', 'live', 'both'].includes(mode)) return mode;
  return 'auto';
}

const dataDir = resolve(rootDir, stringEnv('JAMANWG_DATA_DIR', './data'));
mkdirSync(dataDir, { recursive: true });

export const config = {
  rootDir,
  dataDir,
  dbPath: resolve(dataDir, 'jamanwg.sqlite'),
  host: stringEnv('JAMANWG_HOST', '127.0.0.1'),
  port: numberEnv('JAMANWG_PORT', 8787),
  adminUser: stringEnv('JAMANWG_ADMIN_USER', 'admin'),
  adminPassword: stringEnv('JAMANWG_ADMIN_PASSWORD', 'change-me-now'),
  sessionSecret: stringEnv('JAMANWG_SESSION_SECRET', randomBytes(32).toString('hex')),
  apiToken: stringEnv('JAMANWG_API_TOKEN', ''),
  metricsToken: stringEnv('JAMANWG_METRICS_TOKEN', ''),
  interfaceName: stringEnv('JAMANWG_INTERFACE', 'awg0'),
  serverAddress: stringEnv('JAMANWG_ADDRESS', '10.66.64.1/22'),
  listenPort: numberEnv('JAMANWG_LISTEN_PORT', 51820),
  endpoint: stringEnv('JAMANWG_ENDPOINT', `127.0.0.1:${numberEnv('JAMANWG_LISTEN_PORT', 51820)}`),
  dns: stringEnv('JAMANWG_DNS', '1.1.1.1'),
  allowedIps: stringEnv('JAMANWG_ALLOWED_IPS', '0.0.0.0/0'),
  mtu: numberEnv('JAMANWG_MTU', 1420),
  configPath: stringEnv('JAMANWG_CONFIG_PATH', `/etc/amnezia/amneziawg/${stringEnv('JAMANWG_INTERFACE', 'awg0')}.conf`),
  applyMode: modeEnv(),
  restartCommand: stringEnv('JAMANWG_RESTART_COMMAND', process.platform === 'linux' ? 'systemctl restart jamanwg' : ''),
  postUp: stringEnv('JAMANWG_POST_UP', ''),
  postDown: stringEnv('JAMANWG_POST_DOWN', ''),
  obfuscation: {
    jc: numberEnv('JAMANWG_JC', 4),
    jmin: numberEnv('JAMANWG_JMIN', 8),
    jmax: numberEnv('JAMANWG_JMAX', 80),
    s1: numberEnv('JAMANWG_S1', 30),
    s2: numberEnv('JAMANWG_S2', 80),
    h1: numberEnv('JAMANWG_H1', 123456789),
    h2: numberEnv('JAMANWG_H2', 234567891),
    h3: numberEnv('JAMANWG_H3', 345678912),
    h4: numberEnv('JAMANWG_H4', 456789123)
  }
};
