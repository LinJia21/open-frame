"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  DEMO_PROGRESS_STORAGE_KEY,
  parseDemoProgress,
  writeDemoProgress,
  type DemoProgressSnapshot,
} from "@/lib/home/demo-progress";

const CHANGE_EVENT = "openframe:demo-progress-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(DEMO_PROGRESS_STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useDemoProgress() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const progress = useMemo(() => parseDemoProgress(raw), [raw]);
  const setProgress = useCallback((next: DemoProgressSnapshot) => {
    writeDemoProgress(window.localStorage, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  const clearProgress = useCallback(() => {
    window.localStorage.removeItem(DEMO_PROGRESS_STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return { progress, setProgress, clearProgress };
}
