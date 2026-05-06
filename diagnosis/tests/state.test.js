import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore, INITIAL_STATE, STORAGE_KEY } from '../src/core/state.js';

const memoryStorage = () => {
  const store = new Map();
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
};

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

describe('createStore', () => {
  it('returns INITIAL_STATE when storage is empty', () => {
    const s = createStore();
    expect(s.get()).toEqual(INITIAL_STATE);
  });

  it('persists set() to localStorage', () => {
    const s = createStore();
    s.set({ industryId: 'tax' });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw).industryId).toBe('tax');
  });

  it('hydrates from localStorage on next createStore', () => {
    const a = createStore();
    a.set({ industryId: 'creator', scaleId: 'mid' });
    const b = createStore();
    expect(b.get()).toMatchObject({ industryId: 'creator', scaleId: 'mid' });
  });

  it('reset() clears storage and returns initial state', () => {
    const s = createStore();
    s.set({ industryId: 'tax' });
    s.reset();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(s.get()).toEqual(INITIAL_STATE);
  });

  it('subscribe receives updates after set()', () => {
    const s = createStore();
    let lastState = null;
    s.subscribe(state => { lastState = state; });
    s.set({ industryId: 'recruit' });
    expect(lastState.industryId).toBe('recruit');
  });
});
