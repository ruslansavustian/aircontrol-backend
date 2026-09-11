import { MeasurementStatistics } from "../measurements/utils/calculate-statistics";
import { randomInt } from "node:crypto";
import facts from "./data/air-facts.uk.json";
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
  const period = minutes === 60 ? "Повітря за останню годину"
    : minutes === 1440 ? "Повітря за останні 24 години" : `Повітря за останні ${minutes} хв`;
  const lines = [
    "🌿 <b>Кривий Ріг · Гданцівка</b>",
    "Центрально-Міський район",
    "",
    `🕒 <b>${period}</b>`,
    `${date(start)} ${time(start)} — ${date(end)} ${time(end)} (Київ)`,
    "",
  ];
  if (rows.length) {
    lines.push(
      "🔎 Ми вимірюємо дрібні частинки в повітрі. Для порівняння: якщо товщина волосини — 70 мкм, то частинка розміром 10 мкм у <b>7 разів менша</b>, а 2,5 мкм — у <b>28 разів</b>.",
      "",
    );
  } else {
    lines.push("📡 За цей період немає показань із відомим часом вимірювання.");
  }
  for (const row of rows) {
    if (row.source === "mock") lines.push("🧪 <b>Тестовий режим — випадкові дані</b>", "");
    else if (rows.length > 1) lines.push("<b>Дані PMS5003</b>", "");
    for (const [label, stat] of [
      ["Частинки до 1 мкм · PM1.0", row.pm1],
      ["Частинки до 2,5 мкм · PM2.5", row.pm25],
      ["Частинки до 10 мкм · PM10", row.pm10],
    ] as const) {
      lines.push(
        `🔹 <b>${label}</b>`,
        `Середнє: <b>${number(stat.average)}</b>`,
        `⬆️ Максимум: <b>${number(stat.max.value)}</b> — ${pointTime(stat.max.at)}`,
        `⬇️ Мінімум: <b>${number(stat.min.value)}</b> — ${pointTime(stat.min.at)}`,
        "",
      );
    }
  }
  if (rows.length) lines.push(
    "<i>Усі значення — у мкг/м³: що менше число, то менше частинок за масою в кубометрі повітря.</i>",
  );
  if (unknownTime) lines.push(
    `Ще ${unknownTime} записів надійшло без часу вимірювання — вони не включені у статистику.`,
  );
  const sourceUrl = new URL(fact.sourceUrl);
  if (sourceUrl.protocol !== "https:") throw new Error("Fact source must use HTTPS");
  const sourceName = sourceUrl.hostname.replace(/^www\./, "");
  lines.push("", "💡 <b>Цікаво знати</b>", escapeHtml(fact.text),
    `<a href="${escapeHtml(sourceUrl.href)}">Джерело: ${escapeHtml(sourceName)}</a>`);
  return lines.join("\n");
}
