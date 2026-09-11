require("dotenv/config");
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Set TELEGRAM_BOT_TOKEN in .env");
  const body = {
    timeout: 0,
    allowed_updates: ["message", "channel_post", "my_chat_member"],
  };
  const response = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error(
      `Telegram API rejected request (${response.status}). Check token, chat and webhook settings.`,
    );
  const chats = new Map();
  for (const update of result.result) {
    const chat =
      update.message?.chat ||
      update.channel_post?.chat ||
      update.my_chat_member?.chat;
    if (chat)
      chats.set(chat.id, {
        id: chat.id,
        type: chat.type,
        title: chat.title,
        username: chat.username,
      });
  }
  console.log(
    chats.size
      ? [...chats.values()]
      : "No messages. Open your bot, press Start, then retry.",
  );
}
// Do not print errors containing the token-bearing request URL.
main().catch((error) => {
  console.error(
    error.message.startsWith("Telegram API") ||
      /^(Set |Use )/.test(error.message)
      ? error.message
      : "Telegram request failed. Check network and configuration.",
  );
  process.exitCode = 1;
});
