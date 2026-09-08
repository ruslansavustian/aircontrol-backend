import { Measurement } from "../entities/measurement.entity";

export interface MeasurementAverage {
  source: string;
  count: number;
  pm1: number;
  pm25: number;
  pm10: number;
}

// Each stored measurement has equal weight; mock and sensor data stay separate.
export function calculateAverages(measurements: Measurement[]): MeasurementAverage[] {
  const groups = new Map<string, MeasurementAverage>();
  for (const measurement of measurements) {
    const group = groups.get(measurement.source) ?? {
      source: measurement.source, count: 0, pm1: 0, pm25: 0, pm10: 0,
    };
    group.count += 1;
    group.pm1 += measurement.pm1_ug_m3;
    group.pm25 += measurement.pm25_ug_m3;
    group.pm10 += measurement.pm10_ug_m3;
    groups.set(measurement.source, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.source.localeCompare(b.source))
    .map(group => ({
      ...group,
      pm1: group.pm1 / group.count,
      pm25: group.pm25 / group.count,
      pm10: group.pm10 / group.count,
    }));
}
