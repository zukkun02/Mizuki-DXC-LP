const ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'result'];

export function renderProgress(rootEl, currentStep) {
  const idx = ORDER.indexOf(currentStep);
  const total = ORDER.length - 1; // result は数えない
  const pct = Math.min(100, Math.max(0, (idx / total) * 100));
  rootEl.innerHTML = `
    <div class="h-1 bg-line rounded-full overflow-hidden">
      <div class="h-full bg-cta-green transition-all duration-300" style="width:${pct}%"></div>
    </div>
  `;
  const indicator = document.getElementById('step-indicator');
  if (indicator) {
    indicator.textContent = currentStep === 'result' ? '完了' : `STEP ${idx + 1} / ${total}`;
  }
}

export function nextStep(current) {
  const i = ORDER.indexOf(current);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : current;
}

export function prevStep(current) {
  const i = ORDER.indexOf(current);
  return i > 0 ? ORDER[i - 1] : current;
}
