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

  hasAttempt(deviceId: string, chatId: string, windowEnd: Date) {
    return this.repository.existsBy({ deviceId, chatId, windowEnd });
  }

  async recentFactIds(deviceId: string, chatId: string) {
    const deliveries = await this.repository.find({
      where: { deviceId, chatId }, select: { factId: true },
      order: { windowEnd: "DESC" }, take: 10,
    });
    return deliveries.map(delivery => delivery.factId);
  }

  async reserve(deviceId: string, chatId: string, windowEnd: Date, text: string, factId: string) {
    // Insert before sending. Only one process can claim this period, even after restart.
    const result = await this.repository.createQueryBuilder().insert()
      .values({ deviceId, chatId, windowEnd, text, factId, status: "sending", attempts: 1 })
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
