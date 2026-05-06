export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function selectableCard({ id, label, selected, sub = '' }) {
  return `
    <button data-id="${escapeHtml(id)}" type="button"
      class="text-left w-full px-4 py-3 border rounded-lg transition
        ${selected ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink/40'}">
      <div class="font-semibold">${escapeHtml(label)}</div>
      ${sub ? `<div class="text-xs ${selected ? 'text-paper/70' : 'text-ink/60'} mt-1">${escapeHtml(sub)}</div>` : ''}
    </button>
  `;
}

export function checkboxRow({ id, label, checked }) {
  return `
    <label class="flex items-center gap-3 px-4 py-3 border border-line rounded-lg cursor-pointer hover:border-ink/40 ${checked ? 'border-ink bg-ink/5' : ''}">
      <input type="checkbox" data-id="${escapeHtml(id)}" ${checked ? 'checked' : ''}
        class="w-5 h-5 accent-cta-green" />
      <span class="text-sm">${escapeHtml(label)}</span>
    </label>
  `;
}

export function dropdown({ name, options, value }) {
  const opts = options.map(o => `
    <option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>
  `).join('');
  return `
    <select name="${escapeHtml(name)}"
      class="border border-line rounded-md px-2 py-2 text-sm bg-paper">
      <option value="">選択</option>
      ${opts}
    </select>
  `;
}

export function sectionTitle(text, sub = '') {
  return `
    <h2 class="text-xl font-bold mb-1">${escapeHtml(text)}</h2>
    ${sub ? `<p class="text-sm text-ink/60 mb-4">${escapeHtml(sub)}</p>` : '<div class="mb-4"></div>'}
  `;
}
