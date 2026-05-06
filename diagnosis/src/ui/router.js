const SCREEN_LOADERS = {
  intro: () => import('./screens/intro.js'),
  q1: () => import('./screens/q1-industry.js'),
  q2: () => import('./screens/q2-scale.js'),
  q3: () => import('./screens/q3-business-checklist.js'),
  q4: () => import('./screens/q4-matrix.js'),
  q5: () => import('./screens/q5-priority.js'),
  q6: () => import('./screens/q6-literacy.js'),
  q7: () => import('./screens/q7-hourly-rate.js'),
  result: () => import('./screens/result.js'),
};

export async function renderScreen(rootEl, step, store, nav) {
  const loader = SCREEN_LOADERS[step] || SCREEN_LOADERS.intro;
  const mod = await loader();
  rootEl.innerHTML = '';
  return mod.render({ rootEl, store, nav });
}
