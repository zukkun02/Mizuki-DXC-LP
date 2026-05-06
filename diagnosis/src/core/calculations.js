export const REDUCTION_RATIO = 0.66;
export const WORKING_DAYS_PER_MONTH = 22;
export const BUILD_STANDARD_MEDIAN = 450000;

const TIME_MAP = {
  lt5: 5, m15: 15, m30: 30, m60: 60, h2: 120, h3plus: 180,
};

const FREQ_MAP = {
  daily: WORKING_DAYS_PER_MONTH,
  weekly: 4,
  biweekly: 2,
  monthly: 1,
  ad_hoc: 1,
};

const SCALE_RATE = {
  solo: 3500,
  small: 2800,
  mid: 3200,
  large: 3500,
  xl: 3800,
};

const LAYER_EASE_RANK = {
  L1L2: 0, L2: 1, L2L3: 2, L3: 3, CONSULT: 4,
};

export function parseTimeMinutes(key) {
  if (!(key in TIME_MAP)) throw new Error(`Unknown time key: ${key}`);
  return TIME_MAP[key];
}

export function monthlyFreqMultiplier(freq) {
  if (!(freq in FREQ_MAP)) throw new Error(`Unknown frequency: ${freq}`);
  return FREQ_MAP[freq];
}

export function monthlyHoursForBusiness({ frequency, timeKey }) {
  const minutes = parseTimeMinutes(timeKey);
  const mult = monthlyFreqMultiplier(frequency);
  return (minutes * mult) / 60;
}

export function defaultHourlyRateForScale(scaleId) {
  return SCALE_RATE[scaleId] ?? SCALE_RATE.small;
}

export function computeAggregates(items, { hourlyRate }) {
  const totalHours = items.reduce((s, x) => s + x.monthlyHours, 0);
  const automatableHours = items
    .filter(x => x.recommendedLayer !== 'CONSULT')
    .reduce((s, x) => s + x.monthlyHours, 0);
  const reducibleHours = automatableHours * REDUCTION_RATIO;
  const monthlySavingsYen = Math.round(reducibleHours * hourlyRate);
  const annualSavingsYen = monthlySavingsYen * 12;
  const paybackMonths = monthlySavingsYen > 0
    ? BUILD_STANDARD_MEDIAN / monthlySavingsYen
    : Infinity;
  return { totalHours, automatableHours, reducibleHours, monthlySavingsYen, annualSavingsYen, paybackMonths };
}

export function countBusinessesByLayer(items) {
  const out = { L1L2: 0, L2: 0, L2L3: 0, L3: 0, CONSULT: 0 };
  for (const x of items) {
    if (x.recommendedLayer in out) out[x.recommendedLayer]++;
  }
  return out;
}

export function topPriorityBusinesses(items) {
  return [...items]
    .filter(x => x.recommendedLayer !== 'CONSULT')
    .sort((a, b) => {
      if (b.monthlyHours !== a.monthlyHours) return b.monthlyHours - a.monthlyHours;
      return LAYER_EASE_RANK[a.recommendedLayer] - LAYER_EASE_RANK[b.recommendedLayer];
    })
    .slice(0, 3);
}
