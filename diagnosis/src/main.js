import { createStore } from './core/state.js';
import { renderProgress, nextStep, prevStep, ORDER_LIST } from './ui/progress.js';
import { renderScreen } from './ui/router.js';

const store = createStore();
const screenRoot = document.getElementById('screen-root');

const nav = {
  next: () => {
    const target = nextStep(store.get().step);
    store.set({ step: target });
    paint();
  },
  back: () => {
    const target = prevStep(store.get().step);
    store.set({ step: target });
    paint();
  },
  goTo: (step) => {
    store.set({ step });
    paint();
  },
};

async function paint() {
  const { step } = store.get();
  renderProgress(step);
  await renderScreen(screenRoot, step, store, nav);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

const initial = store.get();
if (!ORDER_LIST.includes(initial.step)) {
  store.set({ step: 'intro' });
}

paint();
