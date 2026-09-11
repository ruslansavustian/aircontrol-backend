import { Measurement } from "../entities/measurement.entity";

export interface MetricStatistics {
  average: number;
  min: { value: number; at: Date };
  max: { value: number; at: Date };
}

export interface MeasurementStatistics {
  source: string;
  count: number;
  pm1: MetricStatistics;
  pm25: MetricStatistics;
  pm10: MetricStatistics;
}

function metric(value: number, at: Date): MetricStatistics {
  return { average: value, min: { value, at }, max: { value, at } };
}

function add(stat: MetricStatistics, value: number, at: Date) {
  stat.average += value; // Sum until the final division by group count.
  if (value < stat.min.value || (value === stat.min.value && at < stat.min.at)) {
    stat.min = { value, at };
  }
  if (value > stat.max.value || (value === stat.max.value && at < stat.max.at)) {
    stat.max = { value, at };
  }
}

// Equal weight per stored snapshot. Ties use the earliest measured_at, regardless of DB order.
export function calculateStatistics(measurements: Measurement[]): MeasurementStatistics[] {
  const groups = new Map<string, MeasurementStatistics>();
  for (const m of measurements) {
    if (!m.measuredAt) continue;
    const group = groups.get(m.source);
    if (!group) {
      groups.set(m.source, {
        source: m.source, count: 1,
        pm1: metric(m.pm1_ug_m3, m.measuredAt),
        pm25: metric(m.pm25_ug_m3, m.measuredAt),
        pm10: metric(m.pm10_ug_m3, m.measuredAt),
      });
    } else {
      group.count += 1;
      add(group.pm1, m.pm1_ug_m3, m.measuredAt);
      add(group.pm25, m.pm25_ug_m3, m.measuredAt);
      add(group.pm10, m.pm10_ug_m3, m.measuredAt);
    }
  }
  return [...groups.values()].sort((a, b) => a.source.localeCompare(b.source)).map(group => {
    for (const stat of [group.pm1, group.pm25, group.pm10]) stat.average /= group.count;
    return group;
  });
}
