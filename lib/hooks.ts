"use client";

import { useRef, useSyncExternalStore } from "react";

function subscribeToBrowser(callback: () => void) {
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
  };
}

export function useBrowserValue<T>(
  getSnapshot: () => T,
  serverSnapshot: T
) {
  const cachedSnapshot = useRef({
    serialized: JSON.stringify(serverSnapshot),
    value: serverSnapshot,
  });

  function getCachedSnapshot() {
    const nextSnapshot = getSnapshot();
    const serializedSnapshot = JSON.stringify(nextSnapshot);

    if (serializedSnapshot === cachedSnapshot.current.serialized) {
      return cachedSnapshot.current.value;
    }

    cachedSnapshot.current = {
      serialized: serializedSnapshot,
      value: nextSnapshot,
    };

    return cachedSnapshot.current.value;
  }

  return useSyncExternalStore(
    subscribeToBrowser,
    getCachedSnapshot,
    () => serverSnapshot
  );
}

export function useAsyncBrowserValue<T>(
  getValue: () => Promise<T>,
  initialValue: T
) {
  const serverState = useRef({
    initialized: false,
    value: initialValue,
    error: null as string | null,
  });
  const state = useRef({
    initialized: false,
    value: initialValue,
    error: null as string | null,
  });

  return useSyncExternalStore(
    (callback) => {
      let isActive = true;

      getValue()
        .then((value) => {
          if (!isActive) return;

          state.current = {
            initialized: true,
            value,
            error: null,
          };
          callback();
        })
        .catch((error: unknown) => {
          if (!isActive) return;

          state.current = {
            ...state.current,
            initialized: true,
            error:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить данные.",
          };
          callback();
        });

      return () => {
        isActive = false;
      };
    },
    () => state.current,
    () => serverState.current
  );
}
