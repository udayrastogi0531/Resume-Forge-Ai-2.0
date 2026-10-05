"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token, user } = await api.login(email, password);
      setAuth(access_token, user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-semibold text-lg">
            ResumeForge <span className="text-emerald-400">AI</span>
          </span>
        </div>
        <form onSubmit={onSubmit} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
          <h1 className="text-[15px] font-medium">Log in</h1>
          {error && (
            <div className="text-[13px] text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[12px] text-neutral-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[12px] text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-medium text-[13px] rounded-md py-2 transition-colors"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
          <p className="text-[12px] text-neutral-500 text-center">
            No account?{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
