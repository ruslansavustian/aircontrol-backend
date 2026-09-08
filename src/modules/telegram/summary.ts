import { randomInt } from 'node:crypto';
import facts from './data/air-facts.uk.json';
export const WINDOW_MS = 15 * 60 * 1000;
export const GRACE_MS = 60 * 1000;
export interface SummaryRow { source: string; count: number; pm1: number; pm25: number; pm10: number }
export function completedWindow(now: Date): Date {
  return new Date(Math.floor((now.getTime() - GRACE_MS) / WINDOW_MS) * WINDOW_MS);
}
export function pickFact(recent: string[]) {
  const available = facts.filter(f => !recent.includes(f.id));
  const choices = available.length ? available : facts;
  return choices[randomInt(choices.length)];
}
export function renderSummary(end: Date, rows: SummaryRow[], unknownTime: number, fact: typeof facts[number]): string {
  const time = (d: Date) => new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).format(d);
  const start = new Date(end.getTime() - WINDOW_MS);
  const date = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric' }).format(start);
  const number = (n: number) => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 }).format(n);
  const lines = ['🌿 Кривий Ріг · Гданцівка', 'Центрально-Міський район', `🕒 ${date} · ${time(start)}–${time(end)} (Київ)`, ''];
  if (!rows.length) lines.push('📡 За ці 15 хвилин немає показань із відомим часом вимірювання. Причину відсутності даних ще не встановлено.');
  for (const row of rows) {
    lines.push(row.source === 'mock' ? '🧪 Тестовий режим — випадкові дані' : '📍 Вимірювання біля нашого датчика');
    lines.push(`Ось середні показники за 15 хвилин (кількість вимірювань: ${row.count}):`,
      `• PM1: ${number(row.pm1)} мкг/м³`, `• PM2.5: ${number(row.pm25)} мкг/м³`, `• PM10: ${number(row.pm10)} мкг/м³`, '');
  }
  if (rows.length) lines.push('Це локальні показання біля пристрою, а не оцінка всього району.');
  if (unknownTime) lines.push(`Ще ${unknownTime} записів надійшло без часу вимірювання — вони не включені в середні.`);
  lines.push('', `💡 Цікаво знати: ${fact.text}`, `Джерело: ${fact.sourceUrl}`);
  return lines.join('\n');
}
