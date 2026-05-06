import { INDUSTRIES } from '../../data/industries.js';
import { backLink, questionNum, h2, sub, primaryButton, nativeSelect, escapeHtml } from '../components.js';

export function render({ rootEl, store, nav }) {
  function isValid() {
    const cur = store.get();
    if (!cur.industryId) return false;
    if (cur.industryId === 'other' && !cur.industryFreeText.trim()) return false;
    return true;
  }

  function html() {
    const s = store.get();
    const isOther = s.industryId === 'other';
    const opts = INDUSTRIES.map(i => ({ value: i.id, label: i.label }));
    return `
      <div class="dx-anim">
        ${backLink('← TOP に戻る')}
        ${questionNum(1, 7)}
        ${h2('まず、業種を教えてください')}
        ${sub('一番近いものを1つ選んでください。')}
        <div style="margin-bottom:20px;">
          <label class="dx-field-label">業種</label>
          ${nativeSelect({ name: 'industry', options: opts, value: s.industryId || '', placeholder: '選択してください' })}
        </div>
        ${isOther ? `
          <div style="margin-bottom:20px;">
            <label class="dx-field-label">業種名（自由記入）</label>
            <input class="dx-input" id="other-input" type="text" placeholder="例: ジュエリー販売" value="${escapeHtml(s.industryFreeText || '')}" />
          </div>
        ` : ''}
        <div style="margin-top:24px;">
          ${primaryButton({ label: '次へ', action: 'next', disabled: !isValid() })}
        </div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    rootEl.querySelector('select[name="industry"]').addEventListener('change', e => {
      store.set({ industryId: e.target.value, industryFreeText: '' });
      paint();
    });
    const otherInput = rootEl.querySelector('#other-input');
    if (otherInput) otherInput.addEventListener('input', e => {
      store.set({ industryFreeText: e.target.value });
      paint();
    });
    const nextBtn = rootEl.querySelector('[data-action="next"]');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (isValid()) nav.next(); });
  }
  paint();
}
