import { describe, it, expect } from 'vitest';
import { INDUSTRIES, getIndustryById } from '../src/data/industries.js';

describe('industries', () => {
  it('contains exactly 9 industries (8 fixed + その他)', () => {
    expect(INDUSTRIES).toHaveLength(9);
  });

  it('last entry is the freeform "other" industry', () => {
    const last = INDUSTRIES[INDUSTRIES.length - 1];
    expect(last.id).toBe('other');
    expect(last.requiresFreeText).toBe(true);
  });

  it('every entry has unique id and label', () => {
    const ids = new Set(INDUSTRIES.map(i => i.id));
    const labels = new Set(INDUSTRIES.map(i => i.label));
    expect(ids.size).toBe(9);
    expect(labels.size).toBe(9);
  });

  it('getIndustryById returns the matching entry', () => {
    expect(getIndustryById('tax').label).toBe('税理士・会計事務所');
    expect(getIndustryById('unknown')).toBeUndefined();
  });
});
