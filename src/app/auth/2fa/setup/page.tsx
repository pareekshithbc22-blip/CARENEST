"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  Download,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  const [secret, setSecret] = React.useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>("");
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [copiedCodes, setCopiedCodes] = React.useState(false);

  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Fetch 2FA Setup Bundle on mount
  React.useEffect(() => {
    async function loadSetup() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/auth/2fa/setup");
        if (res.status === 401) {
          router.push("/login?callbackUrl=/auth/2fa/setup");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to initialize 2FA setup");
        }

        setSecret(data.secret);
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setRecoveryCodes(data.recoveryCodes || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSetup();
  }, [router]);

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyCodes = () => {
    if (recoveryCodes.length === 0) return;
    const text = `CARENEST Emergency Recovery Codes:\n\n${recoveryCodes.join(
      "\n"
    )}\n\nKeep these codes in a secure location. Each code can be used once to access your account if you lose your authenticator device.`;
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (recoveryCodes.length === 0) return;
    const text = `CARENEST Emergency Recovery Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${
      session?.user?.email || "User"
    }\n\n${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nStore these codes safely.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carenest-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code displayed in your authenticator app.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm 2FA setup");
      }

      setSuccessNotice("Two-Factor Authentication activated successfully! Proceeding to your dashboard...");

      // Update local session so twoFactorVerified and twoFactorEnabled become true
      await update({
        twoFactorVerified: true,
        twoFactorEnabled: true,
        twoFactorPendingSetup: false,
      });

      // Route to appropriate dashboard
      setTimeout(() => {
        const role = session?.user?.role;
        if (role === "CARETAKER") {
          router.push("/dashboard/caretaker");
        } else {
          router.push("/dashboard/family");
        }
        router.refresh();
      }, 1200);
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
          Mandatory Two-Factor Authentication
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Set up an authenticator app (Google Authenticator, Microsoft Authenticator) to secure your care circle.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-semibold text-teal-800 flex items-start gap-2">
              <Check className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-teal-700 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-600">Generating secure cryptographic keys...</p>
            </div>
          ) : (
            <>
              {/* Step 1: Scan QR Code */}
              <div className="space-y-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Step 1: Scan QR Code
                </span>
                <p className="text-xs text-slate-600">
                  Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone and scan the QR code below:
                </p>

                {qrCodeDataUrl && (
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl inline-block shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt="CareNest TOTP QR Code"
                      className="h-48 w-48 mx-auto rounded-lg"
                    />
                  </div>
                )}

                {/* Manual Secret Key */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 block">Can&apos;t scan? Enter key manually:</span>
                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800">
                    <span>{secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="text-teal-700 hover:text-teal-900 transition-colors"
                      title="Copy Secret Key"
                    >
                      {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Emergency Recovery Codes */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                    Step 2: Save Emergency Recovery Codes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCodes}
                      className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      {copiedCodes ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCodes ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCodes}
                      className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-amber-200/80 rounded-md py-1 px-2 text-center font-mono text-[11px] font-bold text-slate-800 shadow-2xs"
                    >
                      {code}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Save these codes now. If you lose your phone, each code can be used once as an emergency login key.
                </p>
              </div>

              {/* Step 3: Verify Code */}
              <form onSubmit={handleVerifySetup} className="border-t border-slate-100 pt-5 space-y-4">
                <div className="space-y-2 text-center">
                  <Label htmlFor="otp-0" className="text-xs font-bold text-slate-900">
                    Step 3: Enter the 6-Digit Code from Your App *
                  </Label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, i) => (
                      <Input
                        key={i}
                        id={`otp-${i}`}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        className="h-12 w-11 text-center font-mono text-xl font-black bg-slate-50 border-slate-300 focus:border-teal-700 focus:bg-white"
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || otp.join("").length !== 6}
                  className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? "Verifying Token..." : "Verify & Enable 2FA"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
