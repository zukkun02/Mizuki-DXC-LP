import { describe, it, expect } from 'vitest';
import {
  buildIntro,
  buildPriorityActionText,
  buildPersonalMessage,
} from '../src/core/personalize.js';

describe('buildIntro', () => {
  it('uses fixed industry label when industry is preset', () => {
    const intro = buildIntro({
      industryId: 'tax', industryFreeText: '', scaleId: 'small',
    });
    expect(intro).toContain('税理士・会計事務所');
    expect(intro).toContain('2〜5人');
  });

  it('uses freeText label when industry is "other"', () => {
    const intro = buildIntro({
      industryId: 'other', industryFreeText: 'ジュエリー', scaleId: 'mid',
    });
    expect(intro).toContain('ジュエリー');
    expect(intro).toContain('6〜15人');
  });

  it('falls back to "あなたの業種" when other selected without freeText', () => {
    const intro = buildIntro({
      industryId: 'other', industryFreeText: '', scaleId: 'small',
    });
    expect(intro).toContain('あなたの業種');
  });

  it('omits the parenthetical when scaleId is unknown', () => {
    const intro = buildIntro({
      industryId: 'tax', industryFreeText: '', scaleId: 'unknown',
    });
    expect(intro).not.toContain('（）');
    expect(intro).toContain('税理士・会計事務所');
    expect(intro).toContain('のあなたの業務分析が完了しました。');
  });
});

describe('buildPriorityActionText', () => {
  it.each([
    ['L1L2', /Notion DB化/],
    ['L2',   /AI自動化/],
    ['L2L3', /エージェント/],
    ['L3',   /相談/],
  ])('%s produces matching action text', (layer, re) => {
    expect(buildPriorityActionText(layer)).toMatch(re);
  });
});

describe('buildPersonalMessage', () => {
  it('priority="time" + literacy="none" -> 段階的Layer1から', () => {
    const m = buildPersonalMessage({ priority: 'time', literacy: 'none' });
    expect(m).toMatch(/時間/);
    expect(m).toMatch(/Layer 1|Notion 設計/);
  });

  it('priority="mistake" + literacy="expert" -> Layer3深堀り', () => {
    const m = buildPersonalMessage({ priority: 'mistake', literacy: 'expert' });
    expect(m).toMatch(/ミス/);
    expect(m).toMatch(/Layer 3|エージェント/);
  });

  it('priority="silo" -> 属人化文言', () => {
    expect(buildPersonalMessage({ priority: 'silo', literacy: 'using' })).toMatch(/属人化/);
  });

  it('priority="growth" -> 売上文言', () => {
    expect(buildPersonalMessage({ priority: 'growth', literacy: 'tried' })).toMatch(/売上|拡大/);
  });

  it('priority="hiring" -> 採用コスト文言', () => {
    expect(buildPersonalMessage({ priority: 'hiring', literacy: 'using' })).toMatch(/採用|雇/);
  });
});
