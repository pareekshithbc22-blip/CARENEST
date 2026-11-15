"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Heart,
  User,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  ArrowLeft,
  Clock,
  RefreshCw,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("FAMILY");
  const [phoneNumber, setPhoneNumber] = React.useState("");

  // OTP Verification State
  const [step, setStep] = React.useState<"FORM" | "OTP">("FORM");
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [expirySeconds, setExpirySeconds] = React.useState(300); // 5 minutes
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);
  const [isResending, setIsResending] = React.useState(false);

  // Status & Feedback
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  // Phone validation helper
  const isPhoneValid = (phone: string) => /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim());

  // Countdown timer for OTP Expiration
  React.useEffect(() => {
    if (step !== "OTP" || expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, expirySeconds]);

  // Cooldown timer for Resend Code
  React.useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Step 1: Request OTP or Direct Register
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    // Client-side validations
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!phoneNumber.trim() || !isPhoneValid(phoneNumber)) {
      setError("Please enter a valid phone number (minimum 7 digits, numbers, +, - only).");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // If Family Administrator: Email OTP verification is mandatory
    if (role === "FAMILY") {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), name: name.trim(), role }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to dispatch verification code.");
        }

        setStep("OTP");
        setExpirySeconds(300);
        setCooldownSeconds(data.cooldownSeconds || 60);
        setSuccessNotice(data.message || `Verification code sent to ${email.trim()}`);
        setOtp(["", "", "", "", "", ""]);
        // Focus first OTP input after state update
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // If Caretaker: Direct registration
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      // Automatic sign in
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!signInRes?.error) {
        router.push("/dashboard/caretaker");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Step 2: Handle OTP Input Changes
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1); // Take single digit
    setOtp(newOtp);

    // Move to next input if digit entered
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const focusIdx = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification code.");
      }

      setExpirySeconds(300);
      setCooldownSeconds(data.cooldownSeconds || 60);
      setSuccessNotice("A new 6-digit verification code has been dispatched.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsResending(false);
    }
  };

  // Submit OTP Verification and complete Family Administrator registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (expirySeconds <= 0) {
      setError("Your verification code has expired. Please request a new code.");
      return;
    }

    setLoading(true);

    try {
      // Step A: Verify OTP with API
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: enteredOtp,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Verification failed.");
      }

      const { verificationToken } = verifyData;
      if (!verificationToken) {
        throw new Error("Missing verification credentials. Please try again.");
      }

      // Step B: Submit validated registration with verification token
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: "FAMILY",
          phoneNumber: phoneNumber.trim(),
          verificationToken,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || "Registration completion failed.");
      }

      // Step C: Automatic sign in
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!signInRes?.error) {
        router.push("/dashboard/family");
        router.refresh();
      } else {
        router.push("/login?verified=true");
      }
    } catch (err: any) {
      setError(err.message);
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
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            CARE<span className="text-teal-700">NEST</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          {step === "FORM" ? "Create Your Care Account" : "Verify Your Email Address"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {step === "FORM"
            ? "Connect your family, organize prescriptions, and support elderly independence."
            : `Enter the 6-digit security code sent to ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && step === "OTP" && (
            <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-semibold text-teal-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {step === "FORM" ? (
            /* STEP 1: Registration Form */
            <form onSubmit={handleInitialSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    required
                    placeholder="Sarah Vance"
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email Address *</Label>
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
                {role === "FAMILY" && (
                  <p className="text-[11px] text-teal-700 font-medium flex items-center gap-1 mt-1">
                    <ShieldCheck className="h-3 w-3" /> A 6-digit OTP code will be sent to verify this address.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    required
                    type="tel"
                    placeholder="+1 (555) 234-5678"
                    className="pl-9 text-xs"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Required for emergency escalation and care circle notifications.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password (minimum 8 characters) *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="role">Account Role *</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                >
                  <option value="FAMILY">Family Guardian / Administrator (Email Verified)</option>
                  <option value="CARETAKER">Licensed Nurse / Caretaker</option>
                </select>
              </div>

              <div className="rounded-xl bg-teal-50/70 border border-teal-200 p-3 text-[11px] text-teal-900 leading-relaxed">
                <strong>Notice for Senior Patients:</strong> Senior accounts are registered and configured directly by their authorized Family Guardian with an accessible 4-digit PIN for one-step login.
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  "Processing..."
                ) : role === "FAMILY" ? (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify Email & Register
                  </>
                ) : (
                  "Create Account & Start Circle"
                )}
              </Button>
            </form>
          ) : (
            /* STEP 2: Email OTP Verification Screen */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex flex-col items-center justify-center py-2">
                <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm mb-3">
                  <KeyRound className="h-7 w-7" />
                </div>
                <p className="text-center text-xs text-slate-600">
                  Please enter the 6-digit code sent to:
                  <br />
                  <strong className="text-slate-900 font-bold">{email}</strong>
                </p>
              </div>

              {/* 6 Digit Inputs */}
              <div className="flex justify-center gap-2 sm:gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 border-slate-300 text-center text-xl sm:text-2xl font-black text-slate-900 transition-all focus:border-teal-700 focus:bg-teal-50/30 focus:outline-none"
                  />
                ))}
              </div>

              {/* Expiration Timer & Resend Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs border-y border-slate-100 py-3">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {expirySeconds > 0 ? (
                    <span>
                      Code expires in{" "}
                      <strong className="text-slate-800 font-bold">{formatTimer(expirySeconds)}</strong>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold">Code expired</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldownSeconds > 0 || isResending}
                  className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                  {cooldownSeconds > 0
                    ? `Resend in ${cooldownSeconds}s`
                    : isResending
                    ? "Sending..."
                    : "Resend Code"}
                </button>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6 || expirySeconds <= 0}
                  className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md"
                >
                  {loading ? "Verifying & Creating Account..." : "Confirm Code & Complete Registration"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("FORM");
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Edit registration details / email
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-teal-700 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
