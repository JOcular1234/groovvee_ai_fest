import Link from "next/link";
import type { ReactNode } from "react";

// Required consent checkbox shared by the public forms. The checkbox itself is
// only the notice — each server action independently refuses submissions that
// arrive without the "consent" field.
export function ConsentField({
  errors,
  extra,
}: {
  errors?: string[];
  extra?: ReactNode;
}) {
  return (
    <div className="mt-6">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-4 shrink-0 accent-volt"
        />
        <span>
          {extra}
          I agree to my details being stored and used to handle this
          submission, as described in the{" "}
          <Link
            href="/privacy"
            onClick={(e) => e.stopPropagation()}
            className="text-volt hover:underline"
          >
            privacy policy
          </Link>
          .
        </span>
      </label>
      {errors?.length ? (
        <p role="alert" className="mt-1.5 text-xs text-red-400">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
