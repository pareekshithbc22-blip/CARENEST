"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Heart,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <VerifyEmailContent />
    </React.Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = React.useState<"VERIFYING" | "SUCCESS" | "ERROR">(
    token ? "VERIFYING" : "ERROR"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    token ? null : "No verification token provided. Please check the link in your email."
  );
  const [resendEmail, setResendEmail] = React.useState("");
  const [resending, setResending] = React.useState(false);
  const [resendNotice, setResendNotice] = React.useState<string | null>(null);
  const [resendError, setResendError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  // Cooldown countdown
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Execute verification on mount
  React.useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function executeVerification() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setStatus("ERROR");
          setErrorMessage(data.error || "Failed to verify email address.");
          return;
        }

        setStatus("SUCCESS");

        // Automatically log the user in using the single-use exchange token
        if (data.verificationExchangeToken) {
          const signInRes = await signIn("credentials", {
            verificationExchangeToken: data.verificationExchangeToken,
            redirect: false,
          });

          if (!signInRes?.error && isMounted) {
            // Direct to compulsory 2FA setup screen inside the same site
            setTimeout(() => {
              if (data.user?.role === "CARETAKER" && data.user?.needsProfileCompletion) {
                router.push("/auth/complete-profile");
              } else {
                router.push("/auth/2fa/setup");
              }
              router.refresh();
            }, 1200);
            return;
          }
        }

        // Fallback redirect to login
        setTimeout(() => {
          if (isMounted) router.push("/login?verified=true");
        }, 2000);
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("ERROR");
        setErrorMessage(err.message || "An unexpected error occurred during verification.");
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || cooldown > 0 || resending) return;

    setResending(true);
    setResendNotice(null);
    setResendError(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error || "Failed to resend verification email.");
        if (data.cooldownSeconds) setCooldown(data.cooldownSeconds);
      } else {
        setResendNotice(data.message || "Verification email sent! Check your inbox.");
        setCooldown(60);
      }
    } catch (err: any) {
      setResendError(err.message || "Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-2 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-700/20 group-hover:bg-teal-800 transition-colors">
            <Heart className="h-6 w-6 stroke-2" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            CARE<span className="text-teal-700">NEST</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-center">
          {status === "VERIFYING" && (
            <div className="py-8 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Verifying your email address...
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Please wait while we confirm your security token and activate your care account.
              </p>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="py-8 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Email Verified Successfully!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your email address has been confirmed. Signing you in automatically and proceeding to Two-Factor Authentication setup...
              </p>
              <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-teal-700">
                <ShieldCheck className="h-4 w-4" />
                <span>Redirecting to 2FA Setup...</span>
              </div>
            </div>
          )}

          {status === "ERROR" && (
            <div className="py-4 space-y-5 text-left">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <span>{errorMessage || "Verification link is invalid or expired."}</span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  Resend Verification Email
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Enter your registered email address to receive a new 24-hour verification link.
                </p>

                {resendNotice && (
                  <div className="mb-3 p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>{resendNotice}</span>
                  </div>
                )}

                {resendError && (
                  <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {resendError}
                  </div>
                )}

                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="name@carenest.org"
                      className="pl-9 text-xs"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={resending || cooldown > 0 || !resendEmail}
                    className="w-full h-10 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : cooldown > 0 ? (
                      `Resend available in ${cooldown}s`
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <div className="border-t border-slate-100 pt-3 text-center">
                <Link
                  href="/login"
                  className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
