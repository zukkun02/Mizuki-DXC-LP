export const STORAGE_KEY = 'diagnosis-state-v1';

export const INITIAL_STATE = {
  step: 'q1',                      // q1..q7, result
  industryId: null,                // 'tax' | ... | 'other'
  industryFreeText: '',
  scaleId: null,                   // 'solo' | 'small' | 'mid' | 'large' | 'xl'
  selectedBusinessIds: [],         // string[]
  freeBusinessText: '',
  matrixInputs: {},                // { [businessId]: { frequency, timeKey } }
  priority: null,                  // 'time' | 'mistake' | 'silo' | 'growth' | 'hiring'
  literacy: null,                  // 'none' | 'tried' | 'using' | 'expert'
  hourlyRate: null,                // number; null = use default
  liffUserId: null,                // populated after LIFF init
};

export function createStore() {
  const subscribers = new Set();
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...INITIAL_STATE };
      return { ...INITIAL_STATE, ...JSON.parse(raw) };
    } catch {
      return { ...INITIAL_STATE };
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }

  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      persist();
      subscribers.forEach(fn => fn(state));
    },
    reset: () => {
      state = { ...INITIAL_STATE };
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      subscribers.forEach(fn => fn(state));
    },
    subscribe: (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
