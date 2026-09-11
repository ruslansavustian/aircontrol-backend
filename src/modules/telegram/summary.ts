import { MeasurementStatistics } from "../measurements/utils/calculate-statistics";
import { randomInt } from "node:crypto";
import facts from "./data/air-facts.uk.json";
export function pickFact(recent: string[]) {
  const available = facts.filter((f) => !recent.includes(f.id));
  const choices = available.length ? available : facts;
  return choices[randomInt(choices.length)];
}
export function renderSummary(
  start: Date,
  end: Date,
  rows: MeasurementStatistics[],
  unknownTime: number,
  fact: (typeof facts)[number],
): string {
  const time = (d: Date) =>
    new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/Kyiv",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  const date = (value: Date) => new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
  const number = (n: number) =>
    new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(n);
  const pointTime = (d: Date) => date(start) === date(end)
    ? time(d) : `${date(d)} ${time(d)}`;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const period = minutes === 60 ? "Звіт за останню годину"
    : minutes === 1440 ? "Звіт за останні 24 години" : `Звіт за останні ${minutes} хв`;
  const lines = [
    "🌿 Кривий Ріг · Гданцівка",
    "Центрально-Міський район",
    `📊 ${period}`,
    `🕒 ${date(start)} ${time(start)} — ${date(end)} ${time(end)} (Київ)`,
    "",
  ];
  if (!rows.length)
    lines.push(
      "📡 За цей період немає показань із відомим часом вимірювання. Причину відсутності даних ще не встановлено.",
    );
  for (const row of rows) {
    lines.push(
      row.source === "mock"
        ? "🧪 Тестовий режим — випадкові дані"
        : "📍 Вимірювання біля нашого датчика",
    );
    lines.push(`Збережених вимірювань: ${row.count}. Значення в мкг/м³.`);
    for (const [label, stat] of [["PM1.0", row.pm1], ["PM2.5", row.pm25], ["PM10", row.pm10]] as const) {
      lines.push(
        `• ${label}: середнє ${number(stat.average)}`,
        `  ↑ Максимум ${number(stat.max.value)} — ${pointTime(stat.max.at)}`,
        `  ↓ Мінімум ${number(stat.min.value)} — ${pointTime(stat.min.at)}`,
      );
    }
    lines.push("");
  }
  if (rows.length)
    lines.push(
      "Це локальні показання біля пристрою, а не оцінка всього району.",
      "Статистика за збереженими знімками; короткі піки між ними могли не потрапити у звіт. За однакових екстремумів вказано перший час.",
    );
  if (unknownTime)
    lines.push(
      `Ще ${unknownTime} записів надійшло без часу вимірювання — вони не включені у статистику.`,
    );
  lines.push("", `💡 Цікаво знати: ${fact.text}`, `Джерело: ${fact.sourceUrl}`);
  return lines.join("\n");
}
