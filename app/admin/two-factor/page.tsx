import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { TwoFactorPanel } from "@/components/admin/TwoFactorPanel";
import { isTwoFactorRequired, pendingEnrollment } from "@/lib/auth/mfa";
import { getCurrentAdmin } from "@/lib/auth/server";
import { isTotpConfigured } from "@/lib/auth/totp";
import { db, withDbRetry } from "@/lib/db";

export const metadata: Metadata = {
  title: "Two-factor authentication · Admin",
  robots: { index: false, follow: false },
};

// Reads the session cookie — must render per-request.
export const instant = false;

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  // Outside the (protected) group so admins forced to enroll can reach it.
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");

  const { recovery } = await searchParams;
  const required = isTwoFactorRequired(admin);
  const configured = isTotpConfigured();
  const enabled = !!admin.totpEnabledAt;

  let setup: { secret: string; qr: string } | null = null;
  let recoveryRemaining = 0;
  if (configured && !enabled) {
    // A secret from a rotated TOTP_ENCRYPTION_KEY can't be decrypted —
    // treat it as "not started" so the admin can simply begin again.
    const pending = await withDbRetry(() => pendingEnrollment(db, admin)).catch(
      () => null
    );
    if (pending) {
      setup = {
        secret: pending.secret,
        qr: await QRCode.toDataURL(pending.uri, { margin: 1, width: 220 }),
      };
    }
  }
  if (enabled) {
    const row = await withDbRetry(() =>
      db.admin.findUnique({
        where: { id: admin.id },
        select: { recoveryCodeHashes: true },
      })
    );
    recoveryRemaining = row?.recoveryCodeHashes.length ?? 0;
  }

  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-5 py-16">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-lg border border-white/10 bg-ink p-8 sm:p-10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          {required && !enabled ? "Setup required" : "Security"}
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none">
          Two-factor <span className="text-volt">auth.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          {required && !enabled
            ? "Your account must use an authenticator app before you can access the admin area."
            : "Protect your account with a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy, …) on every sign-in."}
        </p>

        {!configured ? (
          <p role="alert" className="mt-8 border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            Two-factor auth isn&apos;t configured on this server (TOTP_ENCRYPTION_KEY is missing). Ask the site operator to set it.
          </p>
        ) : (
          <TwoFactorPanel
            enabled={enabled}
            required={required}
            setup={setup}
            recoveryRemaining={recoveryRemaining}
            usedRecoveryCode={recovery === "1"}
          />
        )}

        {(enabled || !required) && (
          <Link
            href="/admin"
            className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
          >
            ← Back to admin
          </Link>
        )}
      </div>
    </section>
  );
}
