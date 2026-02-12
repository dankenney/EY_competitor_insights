"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid email or password. Only @ey.com emails are allowed.");
      } else if (result?.url) {
        router.push(result.url);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl">
      {/* EY Yellow accent bar */}
      <div className="mx-auto h-1 w-16 rounded-full bg-[#FFE600]" />

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#2E2E38]">
          CCaSS Intelligence Engine
        </h1>
        <p className="mt-2 text-sm text-[#747480]">
          Sign in with your EY credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#2E2E38]"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@ey.com"
              className="mt-1 block w-full rounded-md border border-[#C4C4CD] px-3 py-2 text-[#2E2E38] placeholder-[#747480] shadow-sm focus:border-[#FFE600] focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#2E2E38]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1 block w-full rounded-md border border-[#C4C4CD] px-3 py-2 text-[#2E2E38] placeholder-[#747480] shadow-sm focus:border-[#FFE600] focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md bg-[#2E2E38] px-4 py-2.5 text-sm font-semibold text-[#FFE600] shadow-sm transition-colors hover:bg-[#464646] focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-xs text-[#747480]">
        Access restricted to authorized EY personnel
      </p>
    </div>
  );
}
