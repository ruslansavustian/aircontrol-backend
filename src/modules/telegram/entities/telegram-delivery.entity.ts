import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// Maps the existing table. Its unique device/chat/window constraint remains in PostgreSQL.
@Entity("telegram_deliveries")
export class TelegramDelivery {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "device_id", type: "varchar", length: 64 }) deviceId!: string;
  @Column({ name: "chat_id", type: "text" }) chatId!: string;
  @Column({ name: "window_start", type: "timestamptz" }) windowStart!: Date;
  @Column({ name: "attempted_at", type: "timestamptz" }) attemptedAt!: Date;
  @Column({ name: "schedule_key", type: "text", nullable: true }) scheduleKey!: string | null;
  @Column({ name: "window_end", type: "timestamptz" }) windowEnd!: Date;
  @Column({ type: "text" }) text!: string;
  @Column({ name: "fact_id", type: "text" }) factId!: string;
  @Column({ type: "text" }) status!: string;
  @Column({ type: "integer", default: 0 }) attempts!: number;
  @Column({ name: "sent_at", type: "timestamptz", nullable: true }) sentAt!: Date | null;
  @Column({ name: "message_id", type: "bigint", nullable: true }) messageId!: string | null;
  @Column({ name: "last_error", type: "text", nullable: true }) lastError!: string | null;
}
