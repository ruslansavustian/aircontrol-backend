require('dotenv/config');
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in .env');
  const action = process.argv[2];
  if (!['chat', 'test'].includes(action)) throw new Error('Use telegram:chat or telegram:test');
  const method = action === 'chat' ? 'getUpdates' : 'sendMessage';
  if (action === 'test' && !/^-?\d+$/.test(process.env.TELEGRAM_CHAT_ID || '')) throw new Error('Set TELEGRAM_CHAT_ID in .env');
  const body = action === 'chat' ? { timeout: 0, allowed_updates: ['message'] } : {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: 'Aircontrol: подключение к Telegram работает. Это тест, не показания датчика.',
  };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram API rejected request (${response.status}). Check token, chat and webhook settings.`);
  if (action === 'test') { console.log('Test message sent.'); return; }
  const chats = new Map();
  for (const update of result.result) {
    const chat = update.message?.chat;
    if (chat) chats.set(chat.id, { id: chat.id, type: chat.type });
  }
  console.log(chats.size ? [...chats.values()] : 'No messages. Open your bot, press Start, then retry.');
}
// Do not print errors containing the token-bearing request URL.
main().catch(error => {
  console.error(error.message.startsWith('Telegram API') || /^(Set |Use )/.test(error.message) ? error.message : 'Telegram request failed. Check network and configuration.');
  process.exitCode = 1;
});
