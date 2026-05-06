import { getBusinessesForIndustry } from '../../data/businesses.js';
import { backLink, questionNum, h2, sub, checkboxRow, primaryButton, escapeHtml } from '../components.js';

export function render({ rootEl, store, nav }) {
  function isValid() {
    return store.get().selectedBusinessIds.length >= 1;
  }

  function html() {
    const s = store.get();
    const businesses = getBusinessesForIndustry(s.industryId);
    const rows = businesses.map(b => checkboxRow({
      id: b.id,
      label: b.label,
      checked: s.selectedBusinessIds.includes(b.id),
    })).join('');
    const count = s.selectedBusinessIds.length;
    return `
      <div class="dx-anim">
        ${backLink('← 前の質問に戻る')}
        ${questionNum(3, 7)}
        ${h2('やっている業務をすべてチェック')}
        ${sub('思い当たるものを直感でタップしてください。最低1件選んで次へ進めます。')}
        <div style="display:flex; flex-direction:column; gap:8px;">${rows}</div>
        <div style="margin-top:24px;">
          <label class="dx-field-label">その他の業務（任意・複数あればカンマ区切り）</label>
          <input class="dx-input" id="free-input" type="text" placeholder="例: 仕入先との価格交渉、SNS広告運用" value="${escapeHtml(s.freeBusinessText || '')}" />
          <div style="font-size:11px; color:var(--muted); margin-top:6px; line-height:1.6;">
            自由記入のみではROI計算ができないため、上のチェックも1件以上必要です。
          </div>
        </div>
        <div style="margin-top:28px; display:flex; align-items:center; justify-content:space-between; font-size:12px; color:var(--muted);">
          <span>選択中: <b style="color:var(--ink); font-family:'JetBrains Mono', monospace;">${count}</b> 件</span>
        </div>
        <div style="margin-top:16px;">
          ${primaryButton({ label: '次へ', action: 'next', disabled: !isValid() })}
        </div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    rootEl.querySelectorAll('.dx-checkbox-input').forEach(cb => {
      cb.addEventListener('change', () => {
        const cur = store.get();
        const id = cb.dataset.id;
        const next = cb.checked
          ? [...cur.selectedBusinessIds, id]
          : cur.selectedBusinessIds.filter(x => x !== id);
        store.set({ selectedBusinessIds: Array.from(new Set(next)) });
        paint();
      });
    });
    const free = rootEl.querySelector('#free-input');
    if (free) free.addEventListener('input', e => {
      store.set({ freeBusinessText: e.target.value });
    });
    const nextBtn = rootEl.querySelector('[data-action="next"]');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (isValid()) nav.next(); });
  }
  paint();
}
