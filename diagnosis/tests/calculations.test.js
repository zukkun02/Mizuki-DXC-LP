import { describe, it, expect } from 'vitest';
import {
  parseTimeMinutes,
  monthlyFreqMultiplier,
  monthlyHoursForBusiness,
  defaultHourlyRateForScale,
  REDUCTION_RATIO,
  WORKING_DAYS_PER_MONTH,
  BUILD_STANDARD_MEDIAN,
  computeAggregates,
  countBusinessesByLayer,
  topPriorityBusinesses,
} from '../src/core/calculations.js';

describe('parseTimeMinutes', () => {
  it.each([
    ['lt5', 5], ['m15', 15], ['m30', 30], ['m60', 60], ['h2', 120], ['h3plus', 180],
  ])('parses %s to %d minutes', (input, expected) => {
    expect(parseTimeMinutes(input)).toBe(expected);
  });

  it('throws on unknown', () => {
    expect(() => parseTimeMinutes('invalid')).toThrow();
  });
});

describe('monthlyFreqMultiplier', () => {
  it.each([['daily', 22], ['weekly', 4], ['biweekly', 2], ['monthly', 1], ['ad_hoc', 1]])(
    '%s -> %d', (f, m) => expect(monthlyFreqMultiplier(f)).toBe(m)
  );

  it('throws on unknown', () => {
    expect(() => monthlyFreqMultiplier('yearly')).toThrow();
  });
});

describe('monthlyHoursForBusiness', () => {
  it('daily 30min = 11h/month', () => {
    expect(monthlyHoursForBusiness({ frequency: 'daily', timeKey: 'm30' })).toBe(11);
  });

  it('weekly 60min = 4h/month', () => {
    expect(monthlyHoursForBusiness({ frequency: 'weekly', timeKey: 'm60' })).toBe(4);
  });

  it('monthly 3h+ = 3h/month', () => {
    expect(monthlyHoursForBusiness({ frequency: 'monthly', timeKey: 'h3plus' })).toBe(3);
  });
});

describe('defaultHourlyRateForScale', () => {
  it.each([
    ['solo', 3500], ['small', 2800], ['mid', 3200], ['large', 3500], ['xl', 3800],
  ])('%s -> %d', (s, r) => expect(defaultHourlyRateForScale(s)).toBe(r));

  it('falls back to small on unknown', () => {
    expect(defaultHourlyRateForScale('weird')).toBe(2800);
  });
});

describe('computeAggregates', () => {
  it('totals, automatable, and savings reflect inputs', () => {
    const items = [
      { monthlyHours: 20, recommendedLayer: 'L1L2' },
      { monthlyHours: 10, recommendedLayer: 'L2' },
      { monthlyHours: 15, recommendedLayer: 'CONSULT' },
    ];
    const agg = computeAggregates(items, { hourlyRate: 3000 });
    expect(agg.totalHours).toBe(45);
    expect(agg.automatableHours).toBe(30);
    expect(agg.reducibleHours).toBeCloseTo(30 * REDUCTION_RATIO, 4);
    expect(agg.monthlySavingsYen).toBe(Math.round(30 * REDUCTION_RATIO * 3000));
    expect(agg.annualSavingsYen).toBe(agg.monthlySavingsYen * 12);
    expect(agg.paybackMonths).toBeCloseTo(BUILD_STANDARD_MEDIAN / agg.monthlySavingsYen, 4);
  });

  it('returns zero metrics for empty', () => {
    const agg = computeAggregates([], { hourlyRate: 3000 });
    expect(agg.totalHours).toBe(0);
    expect(agg.monthlySavingsYen).toBe(0);
    expect(agg.paybackMonths).toBe(Infinity);
  });

  it('hourlyRate change recalculates linearly', () => {
    const items = [{ monthlyHours: 10, recommendedLayer: 'L2' }];
    const a = computeAggregates(items, { hourlyRate: 2000 });
    const b = computeAggregates(items, { hourlyRate: 4000 });
    expect(b.monthlySavingsYen).toBe(a.monthlySavingsYen * 2);
  });

  it('uses default constants', () => {
    expect(REDUCTION_RATIO).toBe(0.66);
    expect(WORKING_DAYS_PER_MONTH).toBe(22);
    expect(BUILD_STANDARD_MEDIAN).toBe(450000);
  });
});

describe('countBusinessesByLayer', () => {
  it('counts each layer including CONSULT', () => {
    const items = [
      { recommendedLayer: 'L1L2' }, { recommendedLayer: 'L1L2' },
      { recommendedLayer: 'L2' }, { recommendedLayer: 'L2L3' },
      { recommendedLayer: 'L3' }, { recommendedLayer: 'CONSULT' },
    ];
    expect(countBusinessesByLayer(items)).toEqual({
      L1L2: 2, L2: 1, L2L3: 1, L3: 1, CONSULT: 1,
    });
  });
});

describe('topPriorityBusinesses', () => {
  it('returns top 3 by monthlyHours then layer ease', () => {
    const items = [
      { id: 'a', monthlyHours: 5, recommendedLayer: 'L1L2' },
      { id: 'b', monthlyHours: 20, recommendedLayer: 'L2L3' },
      { id: 'c', monthlyHours: 15, recommendedLayer: 'L1L2' },
      { id: 'd', monthlyHours: 15, recommendedLayer: 'L2' },
      { id: 'e', monthlyHours: 30, recommendedLayer: 'CONSULT' },
    ];
    // CONSULT は除外、その後 monthlyHours desc → 同点は layer ease 順 (L1L2 > L2 > L2L3)
    const top = topPriorityBusinesses(items);
    expect(top.map(t => t.id)).toEqual(['b', 'c', 'd']);
  });

  it('returns fewer than 3 if not enough items', () => {
    const items = [{ id: 'a', monthlyHours: 5, recommendedLayer: 'L2' }];
    expect(topPriorityBusinesses(items)).toHaveLength(1);
  });

  it('excludes CONSULT', () => {
    const items = [{ id: 'a', monthlyHours: 99, recommendedLayer: 'CONSULT' }];
    expect(topPriorityBusinesses(items)).toHaveLength(0);
  });
});
