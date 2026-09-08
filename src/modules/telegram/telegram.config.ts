function minutes(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 44640) {
    throw new Error(`${name} must be an integer between 1 and 44640 minutes`);
  }
  return value * 60_000;
}

export const telegramConfig = {
  checkIntervalMs: 10_000,
  reportIntervalMs: minutes("TELEGRAM_REPORT_INTERVAL_MINUTES", 1440),
  reportWindowMs: minutes("TELEGRAM_REPORT_WINDOW_MINUTES", 1440),
  enabled: process.env.TELEGRAM_ENABLED === "true",
  token: process.env.TELEGRAM_BOT_TOKEN ?? "",
  chatId: process.env.TELEGRAM_CHAT_ID ?? "",
};
if (
  telegramConfig.enabled &&
  (!telegramConfig.token || !/^-?\d+$/.test(telegramConfig.chatId))
) {
  throw new Error(
    "Telegram requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID when enabled",
  );
}
