import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MeasurementsModule } from "../measurements/measurements.module";
import { TelegramDelivery } from "./entities/telegram-delivery.entity";
import { TelegramDeliveriesService } from "./telegram-deliveries.service";
import { TelegramClient } from "./telegram.client";
import { TelegramService } from "./telegram.service";

@Module({
  imports: [MeasurementsModule, TypeOrmModule.forFeature([TelegramDelivery])],
  providers: [TelegramClient, TelegramDeliveriesService, TelegramService],
})
export class TelegramModule {}
