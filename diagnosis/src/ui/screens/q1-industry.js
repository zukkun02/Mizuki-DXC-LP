import { INDUSTRIES } from '../../data/industries.js';
import { selectableCard, sectionTitle, escapeHtml } from '../components.js';

export function render({ rootEl, store, nav }) {
  const s = store.get();

  function html() {
    const cards = INDUSTRIES.map(i => selectableCard({
      id: i.id, label: i.label, selected: s.industryId === i.id,
    })).join('');
    const isOther = s.industryId === 'other';
    return `
      ${sectionTitle('まず、業種を教えてください', '一番近いものを1つ選んでください。')}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${cards}</div>
      <div class="mt-4 ${isOther ? '' : 'hidden'}" id="other-wrap">
        <label class="text-sm font-medium">業種名（自由記入）</label>
        <input id="other-input" value="${escapeHtml(s.industryFreeText || '')}"
          class="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm"
          placeholder="例: ジュエリー販売" />
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    bind();
    syncNext();
  }

  function bind() {
    rootEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set({ industryId: btn.dataset.id, industryFreeText: '' });
        paint();
      });
    });
    const input = rootEl.querySelector('#other-input');
    if (input) input.addEventListener('input', e => {
      store.set({ industryFreeText: e.target.value });
      syncNext();
    });
  }

  function isValid() {
    const cur = store.get();
    if (!cur.industryId) return false;
    if (cur.industryId === 'other' && !cur.industryFreeText.trim()) return false;
    return true;
  }

  function syncNext() {
    nav.setNextEnabled(isValid(), isValid);
  }

  paint();
}
