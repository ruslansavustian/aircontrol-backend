import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TelegramDelivery } from "./entities/telegram-delivery.entity";

@Injectable()
export class TelegramDeliveriesService {
  constructor(
    @InjectRepository(TelegramDelivery)
    private readonly repository: Repository<TelegramDelivery>,
  ) {}

  latest(deviceId: string, chatId: string) {
    return this.repository.findOne({
      where: { deviceId, chatId }, order: { attemptedAt: "DESC", id: "DESC" },
    });
  }

  async recentFactIds(deviceId: string, chatId: string) {
    const deliveries = await this.repository.find({
      where: { deviceId, chatId }, select: { factId: true },
      order: { windowEnd: "DESC" }, take: 10,
    });
    return deliveries.map(delivery => delivery.factId);
  }

  async reserve(
    deviceId: string, chatId: string, start: Date, end: Date,
    text: string, factId: string, previousId?: string,
  ) {
    // Concurrent checks reference the same preceding report, so only one can insert.
    const result = await this.repository.createQueryBuilder().insert()
      .values({
        deviceId, chatId, windowStart: start, windowEnd: end, attemptedAt: end,
        scheduleKey: previousId ?? "first", text, factId, status: "sending", attempts: 1,
      })
      .orIgnore().returning("id").execute();
    return result.raw[0]?.id as string | undefined;
  }

  markSent(id: string, messageId: number) {
    return this.repository.update(id, {
      status: "sent", sentAt: new Date(), messageId: String(messageId),
    });
  }

  markUnknown(id: string) {
    return this.repository.update(id, {
      status: "unknown", lastError: "Delivery not confirmed; check channel manually",
    });
  }
}
