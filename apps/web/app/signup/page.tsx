"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!email.includes("@")) return "Enter a valid email address.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { access_token, user } = await api.signup(email, password, fullName || undefined);
      setAuth(access_token, user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed.");
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
          <h1 className="text-[15px] font-medium">Create your account</h1>
          {error && (
            <div className="text-[13px] text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[12px] text-neutral-400 mb-1">Full name (optional)</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 pr-9 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1">At least 8 characters.</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-medium text-[13px] rounded-md py-2 transition-colors"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
          <p className="text-[12px] text-neutral-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
