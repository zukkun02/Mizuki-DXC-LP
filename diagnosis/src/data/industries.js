export const INDUSTRIES = [
  { id: 'tax',         label: '税理士・会計事務所',           requiresFreeText: false },
  { id: 'recruit',     label: '人材エージェント・採用支援',   requiresFreeText: false },
  { id: 'creator',     label: 'コンテンツクリエイター・メディア', requiresFreeText: false },
  { id: 'consulting',  label: '経営・戦略コンサル',           requiresFreeText: false },
  { id: 'wellness',    label: '整体院・治療院・サロン',       requiresFreeText: false },
  { id: 'ecommerce',   label: 'EC・物販',                     requiresFreeText: false },
  { id: 'coach',       label: 'コーチ・カウンセラー',         requiresFreeText: false },
  { id: 'realestate',  label: '不動産・建設',                 requiresFreeText: false },
  { id: 'other',       label: 'その他（業種を入力）',         requiresFreeText: true  },
];

export function getIndustryById(id) {
  return INDUSTRIES.find(i => i.id === id);
}
