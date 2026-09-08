require('dotenv/config');
const { randomBytes } = require('node:crypto');
const sample = require('../examples/measurement.json');
async function main() {
  if (!process.env.DEVICE_TOKEN) throw new Error('Set DEVICE_TOKEN in .env');
  const base = new URL(process.argv[2] || `http://localhost:${process.env.PORT || 3000}`);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) {
    throw new Error('Use HTTPS for a remote server');
  }
  const response = await fetch(new URL('/api/v1/measurements', base), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEVICE_TOKEN}` },
    body: JSON.stringify({ ...sample, deviceId: process.env.DEVICE_ID || 'home-air-01', bootId: randomBytes(16).toString('hex'), measuredAt: new Date().toISOString() }),
  });
  console.log(`HTTP ${response.status}`);
  console.log(await response.text());
  if (response.status !== 202) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
