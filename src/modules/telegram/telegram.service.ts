import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { config } from '../../config';
import { telegramConfig } from './telegram.config';
import { TelegramClient, TelegramFailure } from './telegram.client';
import { completedWindow, pickFact, renderSummary, SummaryRow, WINDOW_MS } from './summary';

@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;
  constructor(private readonly db: DataSource, private readonly client: TelegramClient) {}
  onApplicationBootstrap() {
    if (!telegramConfig.enabled) return;
    this.timer = setInterval(() => this.schedule(), 15000);
    this.timer.unref();
    this.schedule();
  }
  async onApplicationShutdown() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  private schedule() {
    if (this.running || this.stopping) return;
    this.running = this.tick().catch(() => this.logger.error('Telegram worker failed; check database availability'))
      .finally(() => { this.running = undefined; });
  }
  async tick(now = new Date()): Promise<void> {
    const q = this.db.createQueryRunner();
    let locked = false;
    try {
      await q.connect();
      // Session lock covers preparation + sending, across API processes.
      locked = (await q.query('SELECT pg_try_advisory_lock(741925, 1) AS locked'))[0].locked;
      if (!locked) return;
      const end = completedWindow(now);
      const start = new Date(end.getTime() - WINDOW_MS);
      const args = [config.deviceId, telegramConfig.chatId];
      // A crashed sender may already have delivered: do not blindly send twice.
      await q.query(`UPDATE telegram_deliveries SET status='unknown', last_error='Interrupted delivery; outcome unknown'
        WHERE device_id=$1 AND chat_id=$2 AND status='sending'`, args);
      await q.query(`UPDATE telegram_deliveries SET status='failed', last_error='Expired window'
        WHERE device_id=$1 AND chat_id=$2 AND status='pending' AND window_end < $3`, [...args, end]);
      let delivery = (await q.query(`SELECT * FROM telegram_deliveries WHERE device_id=$1 AND chat_id=$2 AND window_end=$3`, [...args, end]))[0];
      if (!delivery) {
        const rows: SummaryRow[] = await q.query(`SELECT source, count(*)::int AS count,
          avg(pm1_ug_m3)::float8 AS pm1, avg(pm25_ug_m3)::float8 AS pm25, avg(pm10_ug_m3)::float8 AS pm10
          FROM measurements WHERE device_id=$1 AND measured_at >= $2 AND measured_at < $3 AND received_at <= $4
          GROUP BY source ORDER BY source`, [config.deviceId, start, end, now]);
        const unknown = (await q.query(`SELECT count(*)::int AS count FROM measurements
          WHERE device_id=$1 AND measured_at IS NULL AND received_at >= $2 AND received_at < $3`, [config.deviceId, start, end]))[0].count;
        const recent = await q.query(`SELECT fact_id FROM telegram_deliveries WHERE device_id=$1 AND chat_id=$2 ORDER BY window_end DESC LIMIT 10`, args);
        const fact = pickFact(recent.map((r: {fact_id: string}) => r.fact_id));
        const text = renderSummary(end, rows, unknown, fact);
        delivery = (await q.query(`INSERT INTO telegram_deliveries(device_id,chat_id,window_end,text,fact_id,next_attempt_at)
          VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(device_id,chat_id,window_end) DO NOTHING RETURNING *`, [...args, end, text, fact.id, now]))[0];
      }
      if (!delivery || delivery.status !== 'pending' || new Date(delivery.next_attempt_at) > now) return;
      await q.query(`UPDATE telegram_deliveries SET status='sending', attempts=attempts+1 WHERE id=$1`, [delivery.id]);
      try {
        const messageId = await this.client.send(delivery.text);
        await q.query(`UPDATE telegram_deliveries SET status='sent', sent_at=now(), message_id=$2 WHERE id=$1`, [delivery.id, messageId]);
      } catch (error) {
        const known = error instanceof TelegramFailure;
        const retry = known && !error.uncertain && error.retrySeconds !== null && delivery.attempts < 4;
        const status = retry ? 'pending' : (!known || error.uncertain ? 'unknown' : 'failed');
        const next = new Date(now.getTime() + (retry ? error.retrySeconds! : 60) * 1000);
        await q.query(`UPDATE telegram_deliveries SET status=$2, next_attempt_at=$3, last_error=$4 WHERE id=$1`,
          [delivery.id, status, next, known ? error.message : 'Delivery persistence outcome unknown']);
        this.logger.error(`Telegram delivery ${status}; id=${delivery.id}`);
      }
    } finally {
      if (locked) await q.query('SELECT pg_advisory_unlock(741925, 1)').catch(() => undefined);
      await q.release();
    }
  }
}
