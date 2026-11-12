// Provider-agnostic discovery contracts. The database, admin review
// workflow and duplicate detection depend only on these types — swap
// providers by implementing this interface and injecting it.

import type { DiscoveryRunInput } from "@/lib/validation/discovery";

export type DiscoveryResult = {
  // Raw, unvalidated candidate objects — the service validates each one
  // against discoveredCandidateSchema before storage.
  candidates: unknown[];
};

export interface EventDiscoveryProvider {
  // Recorded on the run + candidates for troubleshooting/auditing.
  readonly name: string; // e.g. "gemini"
  readonly model: string; // e.g. "gemini-2.5-flash"
  readonly connector: string; // e.g. "gemini-search"
  // One bounded web-discovery call. Implementations must bound result count
  // and apply their own timeout/retry policy — no unbounded work.
  discover(params: DiscoveryRunInput): Promise<DiscoveryResult>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderRequestError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = "ProviderRequestError";
    this.retryable = retryable;
  }
}
