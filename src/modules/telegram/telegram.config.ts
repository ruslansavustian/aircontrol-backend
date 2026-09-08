export const telegramConfig = {
  enabled: process.env.TELEGRAM_ENABLED === 'true',
  token: process.env.TELEGRAM_BOT_TOKEN ?? '',
  chatId: process.env.TELEGRAM_CHAT_ID ?? '',
};
if (telegramConfig.enabled && (!telegramConfig.token || !/^-?\d+$/.test(telegramConfig.chatId))) {
  throw new Error('Telegram requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID when enabled');
}
