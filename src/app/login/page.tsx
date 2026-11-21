"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Heart, KeyRound, Mail, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = React.useState("/dashboard/family");
  const [verifiedNotice, setVerifiedNotice] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get("callbackUrl");
      if (cb) setCallbackUrl(cb);
      if (params.get("verified") === "true") setVerifiedNotice(true);
    }
  }, []);

  const [mode, setMode] = React.useState<"email" | "pin">("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [patientIdentifier, setPatientIdentifier] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showResend, setShowResend] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendNotice, setResendNotice] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendVerification = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    setResendNotice(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend verification email.");
      } else {
        setResendNotice(data.message || "A new verification link has been sent to your email.");
        setCooldown(60);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResend(false);
    setResendNotice(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      if (res.error === "EMAIL_NOT_VERIFIED" || res.error.includes("EMAIL_NOT_VERIFIED")) {
        setError(
          "Please verify your email address before signing in. Check your inbox for the verification link."
        );
        setShowResend(true);
      } else {
        setError("Invalid email address or password.");
      }
      setLoading(false);
    } else {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const user = sessionData?.user;
        const role = user?.role;

        // If profile completion is pending (e.g. Caretaker credentials)
        if (user?.needsProfileCompletion) {
          router.push("/auth/complete-profile");
          router.refresh();
          return;
        }

        // Route through mandatory 2FA check for Family and Caretaker
        if (role === "FAMILY" || role === "CARETAKER") {
          if (!user?.twoFactorEnabled) {
            router.push("/auth/2fa/setup");
            router.refresh();
            return;
          }
          if (!user?.twoFactorVerified) {
            router.push(`/auth/2fa/verify${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
            router.refresh();
            return;
          }
        }

        if (callbackUrl && callbackUrl !== "/dashboard/family") {
          router.push(callbackUrl);
        } else if (role === "SENIOR") {
          router.push("/dashboard/senior");
        } else if (role === "CARETAKER") {
          router.push("/dashboard/caretaker");
        } else if (role === "ADMIN") {
          router.push("/dashboard/admin/verifications");
        } else {
          router.push("/dashboard/family");
        }
      } catch {
        router.push(callbackUrl || "/dashboard/family");
      }
      router.refresh();
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Check if Google OAuth credentials are configured
      const statusRes = await fetch("/api/auth/google/status");
      const statusJson = await statusRes.json().catch(() => ({ configured: false }));

      if (!statusJson.configured) {
        setError(
          "Google Sign-In is temporarily unavailable. Please sign in with email and password, or contact support."
        );
        setGoogleLoading(false);
        return;
      }

      await signIn("google", {
        callbackUrl: "/auth/complete-profile",
      });
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google authentication.");
      setGoogleLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      pin,
      patientIdentifier: patientIdentifier.trim() || undefined,
      redirect: false,
    });

    if (res?.error) {
      setError(
        "Invalid Senior PIN or patient identifier. Please verify your 4-digit PIN with your family guardian."
      );
      setLoading(false);
    } else {
      router.push("/dashboard/senior");
      router.refresh();
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
        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode("email");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 transition-all ${
                mode === "email"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Email & Google
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("pin");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 transition-all ${
                mode === "pin"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Senior Patient PIN Login
            </button>
          </div>

          {verifiedNotice && (
            <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-semibold text-teal-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
              <span>Authentication verified successfully. Please sign in to access your dashboard.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 space-y-2">
              <div>{error}</div>
              {showResend && (
                <div className="pt-1 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending || cooldown > 0}
                    className="text-xs font-bold text-teal-800 underline hover:text-teal-950 disabled:text-slate-400"
                  >
                    {resending ? "Sending verification email..." : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email now"}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendNotice && (
            <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-semibold text-teal-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
              <span>{resendNotice}</span>
            </div>
          )}

          {mode === "email" ? (
            <div className="space-y-4">
              {/* Google Sign In Option */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full h-11 border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-3 shadow-xs"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {googleLoading ? "Connecting to Google..." : "Continue with Google"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold">Or sign in with email</span>
                </div>
              </div>

              {/* Email + Password Form */}
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
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div className="text-center space-y-2">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-teal-100 text-teal-800">
                  <KeyRound className="h-6 w-6 stroke-2" />
                </div>
                <h3 className="text-base font-black text-slate-900">Senior Patient PIN Login</h3>
                <p className="text-xs text-slate-500">
                  Enter the 4-digit PIN registered by your family guardian.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="patient-id" className="text-xs font-semibold text-slate-700">
                  Patient Phone or Name (Optional if PIN is unique)
                </Label>
                <Input
                  id="patient-id"
                  placeholder="e.g. Eleanor or registered phone"
                  className="h-10 text-xs"
                  value={patientIdentifier}
                  onChange={(e) => setPatientIdentifier(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="senior-pin" className="text-xs font-bold text-slate-900 text-center block">
                  4-Digit Numeric PIN *
                </Label>
                <div className="max-w-[200px] mx-auto">
                  <Input
                    id="senior-pin"
                    type="password"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    placeholder="••••"
                    autoFocus
                    className="h-14 text-center text-3xl font-mono tracking-widest font-black"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
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
