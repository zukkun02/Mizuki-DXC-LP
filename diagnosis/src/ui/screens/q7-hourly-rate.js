import { backLink, primaryButton, h2, sub } from '../components.js';

export function render({ rootEl, store, nav }) {
  rootEl.innerHTML = `
    <div class="dx-anim">
      ${backLink()}
      ${h2('画面 q7-hourly-rate は準備中')}
      ${sub('実装後に表示されます。次へで先に進めます。')}
      ${primaryButton({ label: '次へ', action: 'next' })}
    </div>
  `;
  rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
  rootEl.querySelector('[data-action="next"]').addEventListener('click', () => nav.next());
}
