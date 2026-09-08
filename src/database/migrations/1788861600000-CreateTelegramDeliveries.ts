import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateTelegramDeliveries1788861600000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE telegram_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id varchar(64) NOT NULL, chat_id text NOT NULL,
      window_end timestamptz NOT NULL, text text NOT NULL, fact_id text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','unknown')),
      attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz, message_id bigint, last_error text,
      UNIQUE(device_id, chat_id, window_end)
    )`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE telegram_deliveries'); }
}
