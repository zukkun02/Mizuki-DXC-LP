import { backLink, questionNum, h2, sub, optionRow } from '../components.js';

const SCALES = [
  { id: 'solo',  label: '1名（一人社長・個人事業主）', sub: '自分が動かないと売上が止まる' },
  { id: 'small', label: '2〜5名（少数精鋭）',         sub: '全員が複数業務を兼任している' },
  { id: 'mid',   label: '6〜15名（小規模）',           sub: '部門の境目ができ始めている' },
  { id: 'large', label: '16〜30名（中規模）',          sub: '組織化が進み、属人化が課題に' },
  { id: 'xl',    label: '30名以上',                     sub: '部門ごとの最適化が必要' },
];

export function render({ rootEl, store, nav }) {
  function html() {
    const s = store.get();
    const opts = SCALES.map((x, i) => optionRow({
      id: x.id,
      label: x.label,
      sub: x.sub,
      selected: s.scaleId === x.id,
      index: i,
    })).join('');
    return `
      <div class="dx-anim">
        ${backLink('← 前の質問に戻る')}
        ${questionNum(2, 7)}
        ${h2('事業規模を教えてください')}
        ${sub('雇用形態に関わらず、関わっている人数で選んでください。')}
        <div class="dx-options">${opts}</div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    rootEl.querySelectorAll('.dx-option').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set({ scaleId: btn.dataset.id });
        paint();
        setTimeout(() => nav.next(), 220);
      });
    });
  }
  paint();
}
