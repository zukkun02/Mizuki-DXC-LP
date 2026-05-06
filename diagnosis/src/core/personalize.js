import { getIndustryById } from '../data/industries.js';

const SCALE_LABEL = {
  solo: '1人（個人事業主）',
  small: '2〜5人',
  mid: '6〜15人',
  large: '16〜30人',
  xl: '30人以上',
};

const PRIORITY_HEADLINE = {
  time:    '取り戻したい時間を、最大化するために',
  mistake: 'ミスを減らし、安心して任せられる仕組みへ',
  silo:    '属人化を解消し、誰がやっても同じ結果が出る仕組みへ',
  growth:  '人を増やさず、売上を伸ばすために',
  hiring:  '採用せず、いまの人数で業務を回すために',
};

const LITERACY_RECOMMEND = {
  none:   '【Layer 1】Notion 設計から段階的に。まずはデータの構造化が、あらゆる自動化の出発点になります。',
  tried:  '【Layer 2】AI自動化が一番効きます。Notion を触ったことがあるなら、AIにルーティンを任せる仕組みは比較的早く実装できます。',
  using:  '【Layer 2 → 3】既に Notion を業務で使っているあなたなら、AI自動化に加えてエージェント設計まで踏み込めます。',
  expert: '【Layer 3】エージェント設計が次のフロンティアです。複雑な判断を含む業務をAIエージェントに委ねる段階に入っています。',
};

export function buildIntro({ industryId, industryFreeText, scaleId }) {
  const industry = getIndustryById(industryId);
  let label;
  if (industry?.id === 'other') {
    label = industryFreeText?.trim() || 'あなたの業種';
  } else {
    label = industry?.label ?? 'あなたの業種';
  }
  const scale = SCALE_LABEL[scaleId];
  const scalePart = scale ? `（${scale}）` : '';
  return `${label}${scalePart}のあなたの業務分析が完了しました。`;
}

const ACTION_TEXT = {
  L1L2: 'Notion DB化 + AI自動化で、ルーティンを丸ごと削減できます。',
  L2:   'AI自動化（GPT/Claude等）で、人手を介さず処理できます。',
  L2L3: '自動化＋エージェントで、一次対応を無人化できます。',
  L3:   '複雑なエージェント設計が必要。詳細は無料相談で詰めましょう。',
  CONSULT: '個別の事情があるため、無料相談で診断します。',
};

export function buildPriorityActionText(layer) {
  return ACTION_TEXT[layer] ?? ACTION_TEXT.CONSULT;
}

export function buildPersonalMessage({ priority, literacy }) {
  const head = PRIORITY_HEADLINE[priority] ?? PRIORITY_HEADLINE.time;
  const body = LITERACY_RECOMMEND[literacy] ?? LITERACY_RECOMMEND.none;
  return `${head}\n\n${body}`;
}
