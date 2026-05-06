const ORDER = ['intro', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'result'];
const QUESTION_COUNT = 7;

export const ORDER_LIST = ORDER;

export function renderProgress(currentStep) {
  const idx = ORDER.indexOf(currentStep);
  const questionIdx = idx; // intro=0, q1=1...q7=7, result=8
  let pct = 0;
  if (currentStep === 'intro') pct = 0;
  else if (currentStep === 'result') pct = 100;
  else pct = Math.min(100, Math.max(0, (questionIdx / QUESTION_COUNT) * 100));

  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = `${pct}%`;

  const indicator = document.getElementById('step-indicator');
  if (indicator) {
    if (currentStep === 'intro') indicator.textContent = 'INTRO';
    else if (currentStep === 'result') indicator.textContent = 'RESULT';
    else indicator.innerHTML = `<b>${String(questionIdx).padStart(2,'0')}</b> / ${String(QUESTION_COUNT).padStart(2,'0')}`;
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
