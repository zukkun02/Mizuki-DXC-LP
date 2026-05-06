import { defaultHourlyRateForScale } from '../../core/calculations.js';
import { backLink, questionNum, h2, sub, primaryButton, escapeHtml } from '../components.js';

export function render({ rootEl, store, nav }) {
  function isValid() {
    const v = store.get().hourlyRate ?? defaultHourlyRateForScale(store.get().scaleId);
    return Number.isFinite(v) && v >= 500 && v <= 20000;
  }

  function html() {
    const s = store.get();
    const def = defaultHourlyRateForScale(s.scaleId);
    const cur = s.hourlyRate ?? def;
    return `
      <div class="dx-anim">
        ${backLink('← 前の質問に戻る')}
        ${questionNum(7, 7)}
        ${h2('時給単価を確認してください')}
        ${sub('人件費換算に使います。あなたの実情に合わせて変更できます。')}
        <div style="background: var(--cream); border-left: 3px solid var(--accent); padding: 20px; border-radius: 0 3px 3px 0; margin-bottom: 20px;">
          <div style="font-size: 11px; letter-spacing: 0.12em; color: rgba(26,26,26,0.55); margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;">あなたの規模の標準値</div>
          <div style="font-family: 'Noto Serif JP', serif; font-size: 32px; font-weight: 700; line-height: 1; color: var(--ink);">¥${def.toLocaleString()}<span style="font-size: 14px; opacity: 0.6; margin-left: 4px;">/時</span></div>
          <div style="font-size: 11px; color: rgba(26,26,26,0.55); margin-top: 10px; line-height: 1.6;">出典: 厚労省賃金構造基本統計調査・中小企業実態調査より算出（社保込み）</div>
        </div>
        <div>
          <label class="dx-field-label">時給を変更する場合のみ入力（円）</label>
          <input class="dx-input" id="rate-input" type="number" inputmode="numeric" min="500" max="20000" step="100" value="${cur}" />
          <div style="font-size: 11px; color: var(--muted); margin-top: 6px; line-height: 1.6;">迷ったら標準値のままでOKです。</div>
        </div>
        <div style="margin-top: 28px;">
          ${primaryButton({ label: '結果を見る', action: 'next', disabled: !isValid() })}
        </div>
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    rootEl.querySelector('[data-action="back"]').addEventListener('click', () => nav.back());
    const inp = rootEl.querySelector('#rate-input');
    inp.addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v)) return;
      store.set({ hourlyRate: v });
      // Update button disabled state without full repaint to avoid input losing focus
      const btn = rootEl.querySelector('[data-action="next"]');
      if (btn) btn.disabled = !isValid();
    });
    const nextBtn = rootEl.querySelector('[data-action="next"]');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (isValid()) nav.next(); });
  }
  paint();
}
