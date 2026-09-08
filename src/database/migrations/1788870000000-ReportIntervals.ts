import { MigrationInterface, QueryRunner } from "typeorm";

export class ReportIntervals1788870000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE telegram_deliveries
      ADD COLUMN window_start timestamptz,
      ADD COLUMN attempted_at timestamptz,
      ADD COLUMN schedule_key text`);
    await q.query(`UPDATE telegram_deliveries SET
      window_start = window_end - interval '15 minutes',
      attempted_at = COALESCE(sent_at, window_end)`);
    await q.query(`ALTER TABLE telegram_deliveries
      ALTER COLUMN window_start SET NOT NULL,
      ALTER COLUMN attempted_at SET NOT NULL`);
    await q.query(`CREATE UNIQUE INDEX telegram_deliveries_schedule
      ON telegram_deliveries(device_id, chat_id, schedule_key)`);
    await q.query(`CREATE INDEX telegram_deliveries_latest
      ON telegram_deliveries(device_id, chat_id, attempted_at DESC)`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX telegram_deliveries_latest`);
    await q.query(`DROP INDEX telegram_deliveries_schedule`);
    await q.query(`ALTER TABLE telegram_deliveries
      DROP COLUMN window_start, DROP COLUMN attempted_at, DROP COLUMN schedule_key`);
  }
}
