export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function eyebrow(text) {
  return `<div class="dx-eyebrow">${escapeHtml(text)}</div>`;
}

export function h1(text) {
  return `<h1 class="dx-h1 dx-serif">${escapeHtml(text)}</h1>`;
}

export function h2(text) {
  return `<h2 class="dx-h2 dx-serif">${escapeHtml(text)}</h2>`;
}

export function sub(text) {
  return `<p class="dx-sub">${escapeHtml(text)}</p>`;
}

export function questionNum(n, total) {
  return `<div class="dx-question-num dx-serif">Q.<b>${String(n).padStart(2,'0')}</b><span style="color:rgba(26,26,26,0.3)">&nbsp;/&nbsp;${String(total).padStart(2,'0')}</span></div>`;
}

export function sectionTitle(text) {
  return `<h3 class="dx-section-title dx-serif">${escapeHtml(text)}</h3>`;
}

export function optionRow({ id, label, sub = '', selected = false, index = 0 }) {
  const letter = String.fromCharCode(65 + index);
  return `
    <button class="dx-option ${selected ? 'is-selected' : ''}" data-id="${escapeHtml(id)}" type="button">
      <span class="dx-option-bullet">${letter}</span>
      <span class="dx-option-body">
        <span class="dx-option-label">${escapeHtml(label)}</span>
        ${sub ? `<span class="dx-option-sub">${escapeHtml(sub)}</span>` : ''}
      </span>
      <span class="dx-option-arrow">→</span>
    </button>
  `;
}

export function checkboxRow({ id, label, checked = false }) {
  return `
    <label class="dx-checkbox-row ${checked ? 'is-checked' : ''}">
      <input type="checkbox" class="dx-checkbox-input" data-id="${escapeHtml(id)}" ${checked ? 'checked' : ''} />
      <span class="dx-checkbox-label">${escapeHtml(label)}</span>
    </label>
  `;
}

export function nativeSelect({ name, options, value = '', placeholder = '選択してください' }) {
  const opts = options.map(o =>
    `<option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
  ).join('');
  return `
    <select class="dx-select" name="${escapeHtml(name)}">
      <option value="">${escapeHtml(placeholder)}</option>
      ${opts}
    </select>
  `;
}

export function primaryButton({ label, action = 'next', disabled = false, withArrow = true }) {
  return `
    <button class="dx-cta-primary" data-action="${escapeHtml(action)}" type="button" ${disabled ? 'disabled' : ''}>
      <span>${escapeHtml(label)}</span>${withArrow ? '<span class="arrow">→</span>' : ''}
    </button>
  `;
}

export function secondaryButton({ label, action }) {
  return `
    <button class="dx-cta-secondary" data-action="${escapeHtml(action)}" type="button">${escapeHtml(label)}</button>
  `;
}

export function backLink(label = '← 前の質問に戻る') {
  return `<button class="dx-back" data-action="back" type="button">${escapeHtml(label)}</button>`;
}

export function metaRow(items) {
  return `<div class="dx-meta">${items.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;
}

export function trust(htmlContent) {
  return `<div class="dx-trust">${htmlContent}</div>`;
}
