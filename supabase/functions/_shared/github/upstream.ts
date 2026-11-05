// supabase/functions/_shared/github/upstream.ts
// Error hulu terstruktur untuk handler Edge Function yang dapat diuji.
// Dipakai publish-project/handler.ts dan list-my-repos/handler.ts.

export type UpstreamFailureKind = "rate_limited" | "not_found" | "other";

export class UpstreamFailure extends Error {
  readonly kind: UpstreamFailureKind;
  readonly retryAfter: number | undefined;

  constructor(kind: UpstreamFailureKind, message: string, retryAfter?: number) {
    super(message);
    this.name = "UpstreamFailure";
    this.kind = kind;
    this.retryAfter = retryAfter;
  }
}
