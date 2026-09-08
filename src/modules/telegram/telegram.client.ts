import { Injectable } from '@nestjs/common';
import { telegramConfig } from './telegram.config';
export class TelegramFailure extends Error {
  constructor(public readonly uncertain: boolean, public readonly retrySeconds: number | null, message: string) { super(message); }
}
@Injectable()
export class TelegramClient {
  async send(text: string): Promise<number> {
    let response: Response;
    try {
      response = await fetch(`https://api.telegram.org/bot${telegramConfig.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramConfig.chatId, text, link_preview_options: { is_disabled: true } }),
        redirect: 'error', signal: AbortSignal.timeout(15000),
      });
    } catch { throw new TelegramFailure(true, null, 'Telegram transport outcome unknown'); }
    let body: { ok?: boolean; result?: { message_id?: number }; parameters?: { retry_after?: number } };
    try { body = await response.json() as typeof body; }
    catch { throw new TelegramFailure(true, null, 'Telegram response outcome unknown'); }
    if (response.ok && body.ok && Number.isInteger(body.result?.message_id)) return body.result!.message_id!;
    if (response.status === 429) {
      const retry = body.parameters?.retry_after;
      throw new TelegramFailure(false, typeof retry === 'number' && Number.isFinite(retry) ? Math.max(1, retry) : 60, 'Telegram rate limit');
    }
    // A gateway/server failure may happen after Telegram has accepted the message.
    throw new TelegramFailure(response.status >= 500, null, `Telegram rejected request (${response.status})`);
  }
}
