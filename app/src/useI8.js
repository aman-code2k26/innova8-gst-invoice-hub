import { useSyncExternalStore } from 'react';

/* window.I8 is the domain layer (loaded as classic scripts before React mounts).
   storage.js swaps I8.db for a fresh object on every change, so this snapshot
   is stable between updates and changes exactly once per save()/notify(). */
export function useI8() {
  return useSyncExternalStore(I8.subscribe, () => I8.db);
}
