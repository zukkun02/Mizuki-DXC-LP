import { getBusinessesForIndustry } from '../../data/businesses.js';
import {
  monthlyHoursForBusiness,
  computeAggregates,
  countBusinessesByLayer,
  topPriorityBusinesses,
  defaultHourlyRateForScale,
} from '../../core/calculations.js';
import { buildIntro, buildPriorityActionText, buildPersonalMessage } from '../../core/personalize.js';
import { primaryButton, escapeHtml } from '../components.js';

const JICOO_URL = 'https://www.jicoo.com/t/2F9NLFDIxGrz/e/xOqhR1kD';

function buildSelectedItems(state) {
  const all = getBusinessesForIndustry(state.industryId);
  return state.selectedBusinessIds.map(id => {
    const b = all.find(x => x.id === id);
    if (!b) return null;
    const inp = state.matrixInputs[id];
    if (!inp || !inp.frequency || !inp.timeKey) return null;
    const monthlyHours = monthlyHoursForBusiness({ frequency: inp.frequency, timeKey: inp.timeKey });
    return { ...b, monthlyHours };
  }).filter(Boolean);
}

const yen = n => `¥${Math.round(n).toLocaleString()}`;
const hr = n => `${Math.round(n)}時間`;

export function render({ rootEl, store, nav }) {
  const s = store.get();
  const items = buildSelectedItems(s);
  const hourlyRate = s.hourlyRate ?? defaultHourlyRateForScale(s.scaleId);
  const agg = computeAggregates(items, { hourlyRate });
  const layerCount = countBusinessesByLayer(items);
  const top3 = topPriorityBusinesses(items);
  const intro = buildIntro(s);
  const personal = buildPersonalMessage({ priority: s.priority, literacy: s.literacy });

  const top3Html = top3.length
    ? top3.map((b, i) => `
        <div class="dx-priority-item">
          <div class="dx-priority-rank">PRIORITY ${String(i+1).padStart(2,'0')}</div>
          <div class="dx-priority-label">${escapeHtml(b.label)}</div>
          <div class="dx-priority-meta">月 ${hr(b.monthlyHours)} ／ 推奨 Layer ${escapeHtml(b.recommendedLayer)}</div>
          <div class="dx-priority-action">${escapeHtml(buildPriorityActionText(b.recommendedLayer))}</div>
        </div>
      `).join('')
    : '<div style="font-size: 13px; color: var(--muted); padding: 16px; text-align: center;">対象業務がありません。</div>';

  const paybackText = Number.isFinite(agg.paybackMonths) ? `${agg.paybackMonths.toFixed(1)}ヶ月` : '—';

  rootEl.innerHTML = `
    <div class="dx-anim">
      <div class="dx-result-hero">
        <div class="dx-result-tag">DIAGNOSIS COMPLETE</div>
        <div class="dx-result-intro">${escapeHtml(intro)}</div>
        <div class="dx-result-intro-en">YOUR AUTOMATION POTENTIAL</div>
        <div class="dx-result-savings-row">
          <div class="dx-result-savings-label">月の人件費削減<br/>ポテンシャル</div>
          <div class="dx-result-savings-num">${yen(agg.monthlySavingsYen)}</div>
        </div>
      </div>

      <div class="dx-result-body">
        <div class="dx-roi-block">
          <div class="dx-roi-eyebrow">ANNUAL COST SAVING</div>
          <div class="dx-roi-main">年間 ${yen(agg.annualSavingsYen)} <small>を削減</small></div>
          <div class="dx-roi-sub">月${hr(agg.reducibleHours)} × 時給¥${hourlyRate.toLocaleString()} で算出</div>
          <div class="dx-roi-stamp">VERIFIED</div>
        </div>

        <div class="dx-stat-grid">
          <div class="dx-stat-cell">
            <div class="lbl">月削減時間</div>
            <div class="val">${Math.round(agg.reducibleHours)}<small>時間</small></div>
          </div>
          <div class="dx-stat-cell">
            <div class="lbl">月総業務時間</div>
            <div class="val">${Math.round(agg.totalHours)}<small>時間</small></div>
          </div>
          <div class="dx-stat-cell">
            <div class="lbl">年間削減効果</div>
            <div class="val">${yen(agg.annualSavingsYen)}</div>
          </div>
          <div class="dx-stat-cell">
            <div class="lbl">投資回収目安</div>
            <div class="val">${paybackText}</div>
          </div>
        </div>

        <h3 class="dx-section-title dx-serif">あなたの業務 × 4層マッピング</h3>
        <div class="dx-layer-grid">
          <div class="dx-layer-cell">
            <div class="lbl">Layer 1+2<br/>Notion設計+自動化</div>
            <div class="val">${layerCount.L1L2}<small>件</small></div>
          </div>
          <div class="dx-layer-cell">
            <div class="lbl">Layer 2<br/>AI自動化</div>
            <div class="val">${layerCount.L2}<small>件</small></div>
          </div>
          <div class="dx-layer-cell">
            <div class="lbl">Layer 2+3<br/>自動化+エージェント</div>
            <div class="val">${layerCount.L2L3}<small>件</small></div>
          </div>
          <div class="dx-layer-cell">
            <div class="lbl">Layer 3 / 要相談<br/>複雑な判断</div>
            <div class="val">${layerCount.L3 + layerCount.CONSULT}<small>件</small></div>
          </div>
        </div>

        <h3 class="dx-section-title dx-serif">最優先で取り組むべき業務 TOP 3</h3>
        <div class="dx-priority-list">${top3Html}</div>

        <div class="dx-personal-msg">
          <p>${escapeHtml(personal)}</p>
        </div>

        <div class="dx-cta-block">
          <h3>御社の数字で、もう少し詳しく。</h3>
          <p>この結果をスクショで保存して、<br/>無料相談でそのまま実装プランをご提案します。</p>
          <a href="${JICOO_URL}" target="_blank" rel="noopener" class="dx-cta-primary" data-action="jicoo" style="text-decoration: none;">
            <span>無料相談を予約する</span><span class="arrow">→</span>
          </a>
          <div class="dx-meta" style="color: rgba(245,240,225,0.55); margin-top: 14px;">
            <span>30分</span><span>オンライン</span><span>無理な営業なし</span>
          </div>
        </div>

        <div class="dx-screenshot-tip">
          <span class="icon">📸</span>
          <div>
            <b>この画面をスクショで保存</b>しておくと、無料相談で<br/>
            そのまま実装プランの議論に入れます。
          </div>
        </div>

        <details class="dx-premise">
          <summary>計算前提を確認する</summary>
          <ul>
            <li>削減係数 0.66（自動化候補のうち実際に削減可能な保守的見積もり）</li>
            <li>月稼働日 22日</li>
            <li>時給 ¥${hourlyRate.toLocaleString()}（規模別デフォルト or あなたの入力値）</li>
            <li>Build Standard 中央値 ¥450,000</li>
            <li>出典: 厚労省賃金構造基本統計調査・中小企業実態調査ほか</li>
          </ul>
        </details>

        <button class="dx-restart" data-action="restart" type="button">もう一度診断する</button>
      </div>
    </div>
  `;

  const restartBtn = rootEl.querySelector('[data-action="restart"]');
  if (restartBtn) restartBtn.addEventListener('click', () => {
    if (confirm('診断結果をクリアしてやり直しますか？')) {
      store.reset();
      store.set({ step: 'intro' });
      location.reload();
    }
  });
}
