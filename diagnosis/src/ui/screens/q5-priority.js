export function render({ rootEl, store, nav }) {
  rootEl.innerHTML = '<div class="text-sm text-ink/60">画面 q5-priority は準備中です。</div>';
  nav.setNextEnabled(true, () => true);
}
