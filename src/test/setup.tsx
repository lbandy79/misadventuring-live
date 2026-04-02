import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
// Cache components per tag so React doesn't unmount/remount on every render
const motionCache: Record<string, any> = {};
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const key = String(prop);
      if (!motionCache[key]) {
        const component = ({ children, ...props }: any) => {
          const {
            initial, animate, exit, transition, variants,
            whileHover, whileTap, whileFocus, whileInView,
            layout, layoutId, onAnimationComplete,
            ...domProps
          } = props;
          return React.createElement(key, domProps, children);
        };
        component.displayName = `motion.${key}`;
        motionCache[key] = component;
      }
      return motionCache[key];
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useMotionValue: (initial: number) => ({ get: () => initial, set: vi.fn() }),
  useTransform: () => ({ get: () => 0, set: vi.fn() }),
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

// Firestore mock helpers
const mockQuerySnapshot = (docs: any[] = []) => ({
  empty: docs.length === 0,
  docs: docs.map((d, i) => ({
    id: d.id ?? `doc-${i}`,
    data: () => {
      const { id, ...rest } = d;
      return rest;
    },
    exists: () => true,
  })),
  size: docs.length,
  forEach: (fn: any) => docs.forEach((d, i) => fn({
    id: d.id ?? `doc-${i}`,
    data: () => {
      const { id, ...rest } = d;
      return rest;
    },
  })),
});

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: any, path: string) => ({ path })),
  query: vi.fn((...args: any[]) => args),
  where: vi.fn((field: string, op: string, value: any) => ({ field, op, value })),
  getDocs: vi.fn(() => Promise.resolve(mockQuerySnapshot([]))),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  doc: vi.fn((_db: any, path: string, id: string) => ({ path, id })),
  updateDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn((_query: any, callback: any) => {
    callback(mockQuerySnapshot([]));
    return vi.fn(); // unsubscribe
  }),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  setDoc: vi.fn(() => Promise.resolve()),
}));

// Export for test files to use
export { mockQuerySnapshot };
