import { describe, it, expect } from 'vitest';
import { BUSINESSES_BY_INDUSTRY, COMMON_BUSINESSES, getBusinessesForIndustry } from '../src/data/businesses.js';
import { INDUSTRIES } from '../src/data/industries.js';

const VALID_LAYERS = new Set(['L1L2', 'L2', 'L2L3', 'L3', 'CONSULT']);
const VALID_CATEGORIES = new Set([
  'transcribe', 'summarize', 'notify', 'aggregate',
  'customer', 'docgen', 'inventory', 'other'
]);

describe('businesses', () => {
  it('has 15 common businesses', () => {
    expect(COMMON_BUSINESSES).toHaveLength(15);
  });

  it('every fixed industry (8) has 12-15 preset businesses', () => {
    for (const ind of INDUSTRIES.filter(i => i.id !== 'other')) {
      const list = BUSINESSES_BY_INDUSTRY[ind.id];
      expect(list, `industry ${ind.id} missing`).toBeDefined();
      expect(list.length).toBeGreaterThanOrEqual(12);
      expect(list.length).toBeLessThanOrEqual(15);
    }
  });

  it('"other" industry uses common businesses via getBusinessesForIndustry', () => {
    expect(getBusinessesForIndustry('other')).toEqual(COMMON_BUSINESSES);
  });

  it('all businesses have valid metadata', () => {
    const all = [...COMMON_BUSINESSES, ...Object.values(BUSINESSES_BY_INDUSTRY).flat()];
    for (const b of all) {
      expect(b.id, `missing id: ${b.label}`).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(VALID_CATEGORIES.has(b.category), `invalid category for ${b.label}`).toBe(true);
      expect(VALID_LAYERS.has(b.recommendedLayer), `invalid layer for ${b.label}`).toBe(true);
    }
  });

  it('business ids are unique within each list', () => {
    for (const [ind, list] of Object.entries(BUSINESSES_BY_INDUSTRY)) {
      const ids = list.map(b => b.id);
      expect(new Set(ids).size, `duplicate id in ${ind}`).toBe(ids.length);
    }
  });

  it('getBusinessesForIndustry returns common list for unknown industry', () => {
    expect(getBusinessesForIndustry('unknown')).toEqual(COMMON_BUSINESSES);
  });
});
