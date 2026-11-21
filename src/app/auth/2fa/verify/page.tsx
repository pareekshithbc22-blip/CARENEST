"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  ArrowRight,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [callbackUrl, setCallbackUrl] = React.useState<string>("");
  const [useRecoveryCode, setUseRecoveryCode] = React.useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = React.useState("");

  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get("callbackUrl");
      if (cb) setCallbackUrl(cb);
    }
  }, []);

  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned && val !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let codeToSend = "";
    if (useRecoveryCode) {
      codeToSend = recoveryCodeInput.trim();
      if (!codeToSend) {
        setError("Please enter your emergency recovery code.");
        return;
      }
    } else {
      codeToSend = otp.join("");
      if (codeToSend.length !== 6) {
        setError("Please enter the complete 6-digit verification code from your authenticator application.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToSend,
          isRecoveryCode: useRecoveryCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Two-factor verification failed");
      }

      // Upgrade local session token
      await update({ twoFactorVerified: true });

      const role = session?.user?.role;
      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (role === "CARETAKER") {
        router.push("/dashboard/caretaker");
      } else if (role === "ADMIN") {
        router.push("/dashboard/admin/verifications");
      } else {
        router.push("/dashboard/family");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
          Two-Factor Authentication
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Confirm your identity to securely access your healthcare circle.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {!useRecoveryCode ? (
              <div className="space-y-3 text-center">
                <Label htmlFor="verify-0" className="text-xs font-bold text-slate-900">
                  Enter 6-Digit Authenticator App Code
                </Label>
                <p className="text-[11px] text-slate-500">
                  Open Google Authenticator or Microsoft Authenticator on your mobile device.
                </p>

                <div className="flex justify-center gap-2 pt-2">
                  {otp.map((digit, i) => (
                    <Input
                      key={i}
                      id={`verify-${i}`}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={i === 0}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="h-12 w-11 text-center font-mono text-xl font-black bg-slate-50 border-slate-300 focus:border-teal-700 focus:bg-white"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <Label htmlFor="recovery-code" className="text-xs font-bold text-slate-900">
                    Emergency Recovery Code
                  </Label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Enter one of the 8-to-10 character emergency recovery codes you saved during authenticator setup (e.g. A1B2-C3D4).
                </p>
                <Input
                  id="recovery-code"
                  type="text"
                  autoFocus
                  placeholder="e.g. A1B2-C3D4"
                  value={recoveryCodeInput}
                  onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                  className="h-11 font-mono text-center font-bold text-sm tracking-wider uppercase"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? "Verifying..." : "Confirm & Access Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Toggle between TOTP and Recovery Code */}
          <div className="border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setError(null);
              }}
              className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1.5"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              {useRecoveryCode
                ? "Back to 6-digit authenticator code"
                : "Lost your phone? Use an emergency recovery code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
