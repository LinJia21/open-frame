import { isLanguage, type Language } from "@/lib/i18n/languages";

export interface CreateAnalysisInput {
  query: string;
  language: Language;
}

export const TOPIC_MIN_LENGTH = 2;
export const TOPIC_MAX_LENGTH = 200;

export type TopicValidationCode =
  | "query_required"
  | "query_too_short"
  | "query_too_long"
  | "query_needs_letters"
  | "language_invalid";

export type TopicValidationResult =
  | { ok: true; value: CreateAnalysisInput }
  | { ok: false; code: TopicValidationCode };

/**
 * Rules for a topic:
 * - not empty after trimming
 * - at least 2 characters (short Chinese topics are allowed)
 * - at most 200 characters
 * - at least one letter, in any language
 */
export function validateTopicInput(
  query: unknown,
  language: unknown,
): TopicValidationResult {
  if (!isLanguage(language)) {
    return { ok: false, code: "language_invalid" };
  }

  if (typeof query !== "string") {
    return { ok: false, code: "query_required" };
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { ok: false, code: "query_required" };
  }
  if (trimmed.length < TOPIC_MIN_LENGTH) {
    return { ok: false, code: "query_too_short" };
  }
  if (trimmed.length > TOPIC_MAX_LENGTH) {
    return { ok: false, code: "query_too_long" };
  }
  if (!/\p{L}/u.test(trimmed)) {
    return { ok: false, code: "query_needs_letters" };
  }

  const value: CreateAnalysisInput = {
    query: trimmed,
    language: language as Language,
  };
  return { ok: true, value };
}
