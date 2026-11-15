"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Heart, Sparkles, KeyRound, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = React.useState("/dashboard/family");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get("callbackUrl");
      if (cb) setCallbackUrl(cb);
    }
  }, []);

  const [mode, setMode] = React.useState<"email" | "pin">("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email address or password.");
      setLoading(false);
    } else {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;

        if (callbackUrl && callbackUrl !== "/dashboard/family") {
          router.push(callbackUrl);
        } else if (role === "SENIOR") {
          router.push("/dashboard/senior");
        } else if (role === "CARETAKER") {
          router.push("/dashboard/caretaker");
        } else {
          router.push("/dashboard/family");
        }
      } catch {
        router.push(callbackUrl || "/dashboard/family");
      }
      router.refresh();
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      pin,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid Senior PIN. Please verify your 4-digit PIN.");
      setLoading(false);
    } else {
      router.push("/dashboard/senior");
      router.refresh();
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoRole: string) => {
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: demoEmail,
      password: "CareNest2026!",
      redirect: false,
    });

    if (!res?.error) {
      if (demoRole === "SENIOR") {
        router.push("/dashboard/senior");
      } else if (demoRole === "CARETAKER") {
        router.push("/dashboard/caretaker");
      } else {
        router.push("/dashboard/family");
      }
      router.refresh();
    } else {
      setError("Demo authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-2 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-700/20 group-hover:bg-teal-800 transition-colors">
            <Heart className="h-6 w-6 stroke-2" />
          </div>
          <span className="text-2xl font-black text-slate-900">
            CARE<span className="text-teal-700">NEST</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Sign In to Your Care Circle
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          One connected circle of care. Every dose. Every appointment.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Quick Demo Login Pill for Hackathon Evaluators */}
        <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>Instant Demo Logins</span>
          </div>
          <p className="text-[11px] text-amber-800 mb-3">
            Click any button below to instantly sign in with pre-seeded demo accounts:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("eleanor.vance@carenest.org", "SENIOR")}
              className="rounded-xl border border-teal-300 bg-white p-2 text-center hover:bg-teal-50 transition-colors"
            >
              <span className="block text-[11px] font-bold text-slate-900">Senior</span>
              <span className="text-[10px] text-teal-700 font-medium">Eleanor (PIN)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("sarah.vance@carenest.org", "FAMILY")}
              className="rounded-xl border border-slate-300 bg-white p-2 text-center hover:bg-slate-50 transition-colors"
            >
              <span className="block text-[11px] font-bold text-slate-900">Family</span>
              <span className="text-[10px] text-slate-600 font-medium">Sarah Vance</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("marcus.reed@carenest.org", "CARETAKER")}
              className="rounded-xl border border-sky-300 bg-white p-2 text-center hover:bg-sky-50 transition-colors"
            >
              <span className="block text-[11px] font-bold text-slate-900">Caretaker</span>
              <span className="text-[10px] text-sky-700 font-medium">Marcus, RN</span>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode("email"); setError(null); }}
              className={`flex-1 rounded-lg py-2 transition-all ${
                mode === "email" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setMode("pin"); setError(null); }}
              className={`flex-1 rounded-lg py-2 transition-all ${
                mode === "pin" ? "bg-teal-700 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Senior Quick PIN (1234)
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
              {error}
            </div>
          )}

          {mode === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="sarah.vance@carenest.org"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md"
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-teal-100 text-teal-800">
                  <KeyRound className="h-6 w-6 stroke-2" />
                </div>
                <h3 className="text-base font-black text-slate-900">Enter Your 4-Digit Senior PIN</h3>
                <p className="text-xs text-slate-500">
                  Simplified one-step access for seniors. Demo PIN: <strong className="text-teal-700">1234</strong>
                </p>
              </div>

              <div className="max-w-xs mx-auto">
                <Input
                  id="senior-pin"
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••"
                  autoFocus
                  className="h-14 text-center text-3xl font-mono tracking-widest"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-teal-700 hover:bg-teal-800 text-white font-bold text-base shadow-md"
              >
                {loading ? "Verifying PIN..." : "Enter Senior Mode"}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-teal-700 hover:underline">
              Create a Care Circle
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
