import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { config } from "../../config";
import { MeasurementsService } from "../measurements/measurements.service";
import { calculateStatistics } from "../measurements/utils/calculate-statistics";
import { telegramConfig } from "./telegram.config";
import { TelegramClient } from "./telegram.client";
import { TelegramDeliveriesService } from "./telegram-deliveries.service";
import { pickFact, renderSummary } from "./summary";

@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  constructor(
    private readonly measurements: MeasurementsService,
    private readonly deliveries: TelegramDeliveriesService,
    private readonly client: TelegramClient,
  ) {}

  onApplicationBootstrap() {
    if (!telegramConfig.enabled) return;
    this.timer = setInterval(() => this.schedule(), telegramConfig.checkIntervalMs);
    this.timer.unref();
    this.schedule();
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  private schedule() {
    if (this.running) return;
    this.running = this.sendSummary()
      .catch(() => this.logger.error("Telegram summary failed; check database and delivery history"))
      .finally(() => { this.running = undefined; });
  }

  async sendSummary(now = new Date()): Promise<void> {
    const { deviceId } = config;
    const { chatId } = telegramConfig;
    const latest = await this.deliveries.latest(deviceId, chatId);
    const lastActivity = latest?.sentAt ?? latest?.attemptedAt;
    if (lastActivity && now.getTime() - lastActivity.getTime() < telegramConfig.reportIntervalMs) return;

    const end = now;
    const start = new Date(end.getTime() - telegramConfig.reportWindowMs);

    const measurements = await this.measurements.findForPeriod(deviceId, start, end, now);
    const statistics = calculateStatistics(measurements);
    const unknownTime = await this.measurements.countWithoutTime(deviceId, start, end);
    const recentFacts = await this.deliveries.recentFactIds(deviceId, chatId);
    const fact = pickFact(recentFacts);
    const text = renderSummary(start, end, statistics, unknownTime, fact);

    const deliveryId = await this.deliveries.reserve(deviceId, chatId, start, end, text, fact.id, latest?.id);
    if (!deliveryId) return;
    try {
      const messageId = await this.client.send(text);
      await this.deliveries.markSent(deliveryId, messageId);
    } catch {
      await this.deliveries.markUnknown(deliveryId);
      this.logger.error(`Telegram delivery not confirmed; id=${deliveryId}`);
    }
  }
}
