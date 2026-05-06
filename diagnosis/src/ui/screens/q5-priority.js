import { backLink, questionNum, h2, sub, optionRow } from '../components.js';

const PRIORITIES = [
  { id: 'time',    label: '時間そのもの',     sub: '残業や休日業務を減らしたい' },
  { id: 'mistake', label: 'ミスの削減',       sub: '人為的なミスをなくしたい' },
  { id: 'silo',    label: '属人化の解消',     sub: '特定の人に依存しない仕組みに' },
  { id: 'growth',  label: '売上拡大',         sub: '人を増やさず売上を伸ばしたい' },
  { id: 'hiring',  label: '採用コスト削減',   sub: '人を雇わずに業務を回したい' },
];

export function render({ rootEl, store, nav }) {
  function html() {
    const s = store.get();
    const opts = PRIORITIES.map((x, i) => optionRow({
      id: x.id,
      label: x.label,
      sub: x.sub,
      selected: s.priority === x.id,
      index: i,
    })).join('');
    return `
      <div class="dx-anim">
        ${backLink('← 前の質問に戻る')}
        ${questionNum(5, 7)}
        ${h2('一番取り戻したいものは？')}
        ${sub('結果メッセージのトーンを調整します。1つだけ選んでください。')}
        <div class="dx-options">${opts}</div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    rootEl.querySelectorAll('.dx-option').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set({ priority: btn.dataset.id });
        paint();
        setTimeout(() => nav.next(), 220);
      });
    });
  }
  paint();
}
