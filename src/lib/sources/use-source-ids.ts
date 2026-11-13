"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  SUBSCRIPTION_STORAGE_KEY,
  parseSourceSnapshot,
  writeSourceIds,
} from "@/lib/sources/subscriptions";

const CHANGE_EVENT = "openframe:source-ids-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useSourceIds() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ids = useMemo(() => parseSourceSnapshot(raw), [raw]);
  const setIds = useCallback((next: string[]) => {
    writeSourceIds(window.localStorage, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return { ids, setIds };
}
