/**
 * Retired slot. ANALYSIS_PROVIDER=grok used to look for a direct model key and then throw.
 * It never called a model. The product path is the Cursor provider.
 */
export class RetiredGrokProviderError extends Error {
  readonly code = "retired_provider";
  readonly status = 501;

  constructor() {
    super("retired_provider");
    this.name = "RetiredGrokProviderError";
  }
}

export function rejectRetiredGrokProvider(): never {
  throw new RetiredGrokProviderError();
}
