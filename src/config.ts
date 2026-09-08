import 'dotenv/config';

const port = Number(process.env.PORT ?? 3000);
const deviceId = process.env.DEVICE_ID ?? 'home-air-01';
const deviceToken = process.env.DEVICE_TOKEN ?? '';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535');
}
if (!/^[A-Za-z0-9_-]{1,64}$/.test(deviceId)) {
  throw new Error('DEVICE_ID must contain 1-64 letters, digits, underscores or hyphens');
}
if (!/^[A-Za-z0-9_-]{32,128}$/.test(deviceToken)) {
  throw new Error('Set DEVICE_TOKEN to 32-128 letters/digits/underscores/hyphens in .env');
}

export const config = { port, deviceId, deviceToken } as const;
