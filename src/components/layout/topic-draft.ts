"use client";

let query = "";
let error: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeTopicDraft(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTopicQuery() {
  return query;
}

export function getTopicError() {
  return error;
}

export function setTopicQuery(next: string) {
  query = next;
  error = null;
  emit();
}

export function setTopicError(next: string | null) {
  error = next;
  emit();
}
