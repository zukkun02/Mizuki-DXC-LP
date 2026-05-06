import { primaryButton, metaRow } from '../components.js';

export function render({ rootEl, store, nav }) {
  rootEl.innerHTML = `
    <div class="dx-anim">
      <div class="dx-intro-card">
        <div class="dx-eyebrow">FOR&nbsp;1-30人企業</div>
        <h1 class="dx-h1 dx-serif">
          あなたの会社で、<br/>
          AIが<span style="color: var(--accent)">月いくら</span>を<br/>
          生み出せるか。
        </h1>
        <p class="dx-sub">
          7つの質問に答えるだけ。<br/>
          現場の業務時間とリテラシーから、<br/>
          AI自動化による削減額を算出します。
        </p>
        <div class="dx-stat-row">
          <div class="dx-stat"><div class="num">7<small>問</small></div><div class="lbl">QUESTIONS</div></div>
          <div class="dx-stat"><div class="num">5<small>分</small></div><div class="lbl">DURATION</div></div>
          <div class="dx-stat"><div class="num">¥0</div><div class="lbl">FREE</div></div>
        </div>
      </div>
      ${primaryButton({ label: '診断をはじめる', action: 'next' })}
      ${metaRow(['登録不要','個人情報なし','結果即表示'])}
      <div style="margin-top:28px;">
        <div class="dx-trust"><b>Notion × AI 業務改善コンサル</b>として税理士・人材・EC・コーチ・コンサルなど多業種の中小企業様を支援してきたナレッジを基に設計された診断シートです。</div>
      </div>
    </div>
  `;
  rootEl.querySelector('[data-action="next"]').addEventListener('click', () => nav.next());
}
