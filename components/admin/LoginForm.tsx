"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid email or password");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label
          htmlFor="email"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full border border-white/15 bg-panel px-4 py-3.5 text-white outline-none transition-colors placeholder:text-muted/50 focus:border-volt"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt"
        >
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-white/15 bg-panel px-4 py-3.5 pr-12 text-white outline-none transition-colors placeholder:text-muted/50 focus:border-volt"
            placeholder="••••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted transition-colors hover:text-volt"
          >
            {showPassword ? (
              <EyeOff className="size-5" aria-hidden />
            ) : (
              <Eye className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="border border-volt/40 bg-volt/10 px-4 py-3 text-sm text-volt">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
