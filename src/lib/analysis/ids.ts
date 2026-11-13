const BUNDLE_ID = /^bnd_[A-Za-z0-9_-]{1,64}$/;

export function isAnalysisId(value: string): boolean {
  return BUNDLE_ID.test(value);
}
