import { backLink, questionNum, h2, sub, optionRow } from '../components.js';

const LEVELS = [
  { id: 'none',   label: '未経験',           sub: 'Notion を使ったことがない' },
  { id: 'tried',  label: '触ったことがある', sub: 'メモやタスクで使った程度' },
  { id: 'using',  label: '業務で使っている', sub: 'チームで運用中' },
  { id: 'expert', label: '使いこなしている', sub: '複雑なDB設計やAI連携も' },
];

export function render({ rootEl, store, nav }) {
  function html() {
    const s = store.get();
    const opts = LEVELS.map((x, i) => optionRow({
      id: x.id,
      label: x.label,
      sub: x.sub,
      selected: s.literacy === x.id,
      index: i,
    })).join('');
    return `
      <div class="dx-anim">
        ${backLink('← 前の質問に戻る')}
        ${questionNum(6, 7)}
        ${h2('Notion・AI の利用状況は？')}
        ${sub('提案内容のレベル感を合わせます。')}
        <div class="dx-options">${opts}</div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    rootEl.querySelectorAll('.dx-option').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set({ literacy: btn.dataset.id });
        paint();
        setTimeout(() => nav.next(), 220);
      });
    });
  }
  paint();
}
