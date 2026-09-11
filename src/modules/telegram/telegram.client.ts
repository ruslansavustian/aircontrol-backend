import { Injectable } from "@nestjs/common";
import { telegramConfig } from "./telegram.config";

@Injectable()
export class TelegramClient {
  async send(text: string): Promise<number> {
    // Do not expose fetch errors: their URL contains the bot token.
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${telegramConfig.token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramConfig.chatId,
            text,
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
          }),
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        },
      );
      const body = await response.json() as {
        ok?: boolean; result?: { message_id?: number };
      };
      if (response.ok && body.ok && Number.isInteger(body.result?.message_id)) {
        return body.result!.message_id!;
      }
    } catch {
      throw new Error("Telegram delivery not confirmed");
    }
    throw new Error("Telegram delivery not confirmed");
  }
}
