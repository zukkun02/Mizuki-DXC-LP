import { createStore } from './core/state.js';
import { renderProgress, nextStep, prevStep } from './ui/progress.js';
import { renderScreen } from './ui/router.js';

const store = createStore();

const screenRoot = document.getElementById('screen-root');
const progressRoot = document.getElementById('progress-root');
const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');

let currentValidator = () => false;

const nav = {
  setNextEnabled: (enabled, validator) => {
    btnNext.disabled = !enabled;
    if (typeof validator === 'function') currentValidator = validator;
  },
  goNext: () => {
    if (!currentValidator()) return;
    const target = nextStep(store.get().step);
    store.set({ step: target });
    paint();
  },
  goBack: () => {
    const target = prevStep(store.get().step);
    store.set({ step: target });
    paint();
  },
};

btnNext.addEventListener('click', () => nav.goNext());
btnBack.addEventListener('click', () => nav.goBack());

async function paint() {
  const { step } = store.get();
  renderProgress(progressRoot, step);
  btnBack.disabled = step === 'q1';
  btnNext.style.display = step === 'result' ? 'none' : '';
  btnBack.style.display = step === 'result' ? 'none' : '';
  await renderScreen(screenRoot, step, store, nav);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

paint();
