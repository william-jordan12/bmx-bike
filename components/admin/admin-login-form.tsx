"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Lock, ShieldAlert, UserRound } from "lucide-react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; configured?: boolean }) => {
        if (!active) return;
        setConfigured(data.configured ?? null);
        if (data.authenticated) router.replace("/admin");
      })
      .catch(() => {
        if (active) setConfigured(null);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Unable to sign in.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--ink)] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link href="/" className="font-display text-3xl">
          RIDE<span className="text-[var(--orange)]">{"//"}</span>BMX
        </Link>
        <p className="eyebrow mt-8 text-[#ff7950]">Staff area</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Sign in to manage the shop</h1>
        <p className="mt-3 text-sm leading-6 text-[#96918a]">
          Orders, categories, contact details and social links all live behind this door.
        </p>

        {configured === false ? (
          <div className="mt-7 flex gap-3 border border-[#4a3a2c] bg-[#241a14] p-4 text-sm leading-6 text-[#e8c9b8]">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--orange)]" />
            <span>
              Admin access needs a database. Add <code className="font-bold">DATABASE_URL</code> and{" "}
              <code className="font-bold">ADMIN_INITIAL_PASSWORD</code> to your environment, then redeploy.
            </span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="eyebrow text-[#8d887f]">Username</span>
            <span className="mt-2 flex items-center gap-3 border border-[#3c3934] bg-white/5 px-3 focus-within:border-[var(--orange)]">
              <UserRound className="h-4 w-4 shrink-0 text-[#77736c]" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#5f5b55]"
                placeholder="admin"
              />
            </span>
          </label>
          <label className="block">
            <span className="eyebrow text-[#8d887f]">Password</span>
            <span className="mt-2 flex items-center gap-3 border border-[#3c3934] bg-white/5 px-3 focus-within:border-[var(--orange)]">
              <Lock className="h-4 w-4 shrink-0 text-[#77736c]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#5f5b55]"
                placeholder="Your password"
              />
            </span>
          </label>

          {error ? (
            <p className="border border-[#5a2b1c] bg-[#2a1710] px-3 py-2 text-xs font-semibold text-[#ffb59a]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--orange)] text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#151515] disabled:opacity-60"
          >
            {pending ? "Checking…" : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <Link href="/" className="mt-8 text-xs font-bold uppercase tracking-[0.12em] text-[#77736c] hover:text-white">
          ← Back to the storefront
        </Link>
      </div>
    </main>
  );
}
