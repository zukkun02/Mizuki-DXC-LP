import { getBusinessesForIndustry } from '../../data/businesses.js';
import { backLink, questionNum, h2, sub, primaryButton, escapeHtml } from '../components.js';

const FREQ_OPTIONS = [
  { value: 'daily',    label: '毎日' },
  { value: 'weekly',   label: '週次' },
  { value: 'biweekly', label: '隔週' },
  { value: 'monthly',  label: '月次' },
  { value: 'ad_hoc',   label: '不定期' },
];

const TIME_OPTIONS = [
  { value: 'lt5',    label: '5分以下' },
  { value: 'm15',    label: '15分' },
  { value: 'm30',    label: '30分' },
  { value: 'm60',    label: '60分' },
  { value: 'h2',     label: '2時間' },
  { value: 'h3plus', label: '3時間以上' },
];

function renderSelect(name, options, value, placeholder) {
  const opts = options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
  return `
    <select class="dx-select" name="${escapeHtml(name)}" style="min-height: 48px; padding: 10px 12px; font-size: 14px;">
      <option value="">${escapeHtml(placeholder)}</option>
      ${opts}
    </select>
  `;
}

export function render({ rootEl, store, nav }) {
  function isValid() {
    const cur = store.get();
    if (cur.selectedBusinessIds.length === 0) return false;
    return cur.selectedBusinessIds.every(id => {
      const v = cur.matrixInputs[id];
      return v && v.frequency && v.timeKey;
    });
  }

  function html() {
    const s = store.get();
    const all = getBusinessesForIndustry(s.industryId);
    const selected = all.filter(b => s.selectedBusinessIds.includes(b.id));
    if (selected.length === 0) {
      return `
        <div class="dx-anim">
          ${backLink('← 業務を選び直す')}
          ${questionNum(4, 7)}
          ${h2('業務が選択されていません')}
          ${sub('Q3 に戻って、やっている業務を最低1件チェックしてください。')}
        </div>
      `;
    }
    const rows = selected.map(b => {
      const cur = s.matrixInputs[b.id] || { frequency: '', timeKey: '' };
      return `
        <div style="background: var(--card); border: 1px solid var(--line); border-radius: 3px; padding: 14px 16px;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; line-height: 1.4;">${escapeHtml(b.label)}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.04em;">頻度</div>
              ${renderSelect(`freq:${b.id}`, FREQ_OPTIONS, cur.frequency, '選択')}
            </div>
            <div>
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.04em;">1回あたり</div>
              ${renderSelect(`time:${b.id}`, TIME_OPTIONS, cur.timeKey, '選択')}
            </div>
          </div>
        </div>
      `;
    }).join('');
    const filledCount = selected.filter(b => {
      const v = s.matrixInputs[b.id];
      return v && v.frequency && v.timeKey;
    }).length;
    return `
      <div class="dx-anim">
        ${backLink('← 前の質問に戻る')}
        ${questionNum(4, 7)}
        ${h2('それぞれの頻度と時間を')}
        ${sub('体感でOKです。1〜2分で終わります。')}
        <div style="display: flex; flex-direction: column; gap: 10px;">${rows}</div>
        <div style="margin-top: 24px; display:flex; align-items:center; justify-content:space-between; font-size:12px; color:var(--muted);">
          <span>入力済み: <b style="color:var(--ink); font-family:'JetBrains Mono', monospace;">${filledCount}</b> / ${selected.length}</span>
        </div>
        <div style="margin-top: 16px;">
          ${primaryButton({ label: '次へ', action: 'next', disabled: !isValid() })}
        </div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    rootEl.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => {
        const [field, id] = sel.name.split(':');
        const cur = store.get();
        const inputs = { ...cur.matrixInputs };
        inputs[id] = { ...(inputs[id] || { frequency: '', timeKey: '' }) };
        if (field === 'freq') inputs[id].frequency = sel.value;
        if (field === 'time') inputs[id].timeKey = sel.value;
        store.set({ matrixInputs: inputs });
        paint();
      });
    });
    const nextBtn = rootEl.querySelector('[data-action="next"]');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (isValid()) nav.next(); });
  }
  paint();
}
