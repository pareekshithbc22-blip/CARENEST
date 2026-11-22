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
  AlertCircle,
  Upload,
  FileText,
  FileCheck,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();

  // Current registration step
  const [step, setStep] = React.useState<"form" | "otp">("form");

  // Account Form State
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("FAMILY");
  const [phoneNumber, setPhoneNumber] = React.useState("");

  // Caretaker Professional Credentials State
  const [legalName, setLegalName] = React.useState("");
  const [professionalCategory, setProfessionalCategory] = React.useState("Registered Nurse (RN)");
  const [qualification, setQualification] = React.useState("");
  const [registrationNumber, setRegistrationNumber] = React.useState("");
  const [issuingAuthority, setIssuingAuthority] = React.useState("");
  const [stateRegion, setStateRegion] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Status & Feedback
  const [loading, setLoading] = React.useState(false);
  const [loadingStage, setLoadingStage] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // OTP State
  const [registeredEmail, setRegisteredEmail] = React.useState("");
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [cooldown, setCooldown] = React.useState(0);
  const [resending, setResending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyingStage, setVerifyingStage] = React.useState<string | null>(null);
  const [otpSentNotice, setOtpSentNotice] = React.useState<string | null>(null);
  const [devNotice, setDevNotice] = React.useState<string | null>(null);

  // Phone validation helper
  const isPhoneValid = (phone: string) => /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim());

  // URL query check on mount (e.g. redirected from login to verify OTP)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("email");
      const urlStep = params.get("step");
      if (urlEmail) {
        setEmail(urlEmail);
        setRegisteredEmail(urlEmail);
      }
      if (urlStep === "otp" && urlEmail) {
        setStep("otp");
      }
    }
  }, []);

  // Cooldown countdown timer
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Document file size exceeds 10 MB limit. Please upload a smaller certificate.");
      return;
    }

    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Invalid file format. Please upload a PDF, JPG, or PNG document.");
      return;
    }

    setSelectedFile(file);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
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
        callbackUrl: `/auth/complete-profile?role=${encodeURIComponent(role)}`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google authentication.");
      setGoogleLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Common validations
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

    // Caretaker specific validations
    if (role === "CARETAKER") {
      if (!qualification.trim() || qualification.trim().length < 2) {
        setError("Please enter your clinical qualification (e.g. B.Sc. Nursing, GNM, MBBS).");
        return;
      }

      if (!issuingAuthority.trim() || issuingAuthority.trim().length < 2) {
        setError("Please enter the issuing council or professional licensing authority.");
        return;
      }

      if (!selectedFile) {
        setError("Please attach your professional certificate or license document (PDF, JPG, or PNG).");
        return;
      }
    }

    setLoading(true);

    try {
      // Step A: If Caretaker, upload certificate document to secure storage
      let uploadedDocData = null;
      if (role === "CARETAKER" && selectedFile) {
        setLoadingStage("Encrypting & storing certificate in vault...");
        const uploadForm = new FormData();
        uploadForm.append("file", selectedFile);

        const uploadRes = await fetch("/api/caretakers/upload-document", {
          method: "POST",
          body: uploadForm,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadJson.error || "Failed to upload certificate document.");
        }

        uploadedDocData = {
          fullName: legalName.trim() || name.trim(),
          professionalCategory,
          qualification: qualification.trim(),
          registrationNumber: registrationNumber.trim() || undefined,
          issuingAuthority: issuingAuthority.trim(),
          state: stateRegion.trim() || undefined,
          documentFileName: uploadJson.documentFileName,
          documentFilePath: uploadJson.documentFilePath,
          documentMimeType: uploadJson.documentMimeType,
          documentFileSize: uploadJson.documentFileSize,
        };
      }

      // Step B: Submit completed registration payload
      setLoadingStage("Creating account & sending verification code...");
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phoneNumber: phoneNumber.trim(),
          caretakerProfile: uploadedDocData || undefined,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || "Registration completion failed.");
      }

      // Step C: Switch to OTP step
      setRegisteredEmail(email.trim());
      setCooldown(regData.cooldownSeconds || 60);
      setDevNotice(regData.devNotice || null);
      setOtpSentNotice(`Verification code sent to ${email.trim()}.`);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned && val !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);
    setError(null);

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

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setOtpSentNotice(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We could not send the email. Please try again.");
        if (data.cooldownSeconds) setCooldown(data.cooldownSeconds);
      } else {
        setOtpSentNotice(`Verification code sent to ${registeredEmail}.`);
        if (data.devNotice) setDevNotice(data.devNotice);
        setCooldown(data.cooldownSeconds || 60);
      }
    } catch {
      setError("We could not send the email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredCode = otp.join("");
    if (enteredCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifying(true);
    setVerifyingStage("Verifying code...");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registeredEmail,
          otp: enteredCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Please check the code and try again.");
      }

      // Email verified! Sign in and forward to compulsory 2FA setup
      setVerifyingStage("Email verified! Signing you in...");
      const signInRes = await signIn("credentials", {
        email: registeredEmail,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push("/login?callbackUrl=/auth/2fa/setup");
      } else {
        router.push("/auth/2fa/setup");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to verify code.");
      setVerifying(false);
      setVerifyingStage(null);
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
          {step === "otp" ? "Verify Your Email Address" : "Create Your Care Account"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {step === "otp"
            ? "Enter the 6-digit verification code sent to your email to activate your account."
            : "Connect your family, organize prescriptions, and support elderly independence with enterprise-grade security."}
        </p>
      </div>

      <div
        className={`mt-8 sm:mx-auto sm:w-full ${
          role === "CARETAKER" && step === "form" ? "sm:max-w-xl" : "sm:max-w-md"
        }`}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
          {/* 3-Step Progress Indicator */}
          <div className="mb-6 flex items-center justify-between text-xs font-semibold">
            <div
              className={`flex items-center gap-1.5 ${
                step === "form" ? "text-teal-800" : "text-teal-700 font-bold"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  step === "form" ? "bg-teal-700 text-white" : "bg-teal-100 text-teal-800"
                }`}
              >
                {step !== "form" ? "✓" : "1"}
              </span>
              <span className={step === "form" ? "font-bold text-slate-900" : "text-teal-800"}>
                Create account
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200" />

            <div
              className={`flex items-center gap-1.5 ${
                step === "otp" ? "text-teal-800" : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  step === "otp" ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-400"
                }`}
              >
                2
              </span>
              <span className={step === "otp" ? "font-bold text-slate-900" : ""}>
                Verify email
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200" />

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-400">
                3
              </span>
              <span>Set up authenticator</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "otp" ? (
            /* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION STEP */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">Check Your Email</h3>
                <p className="text-xs text-slate-600">
                  We dispatched a 6-digit code to{" "}
                  <strong className="text-slate-900 font-semibold">{registeredEmail}</strong>.
                </p>
              </div>

              {otpSentNotice && (
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>{otpSentNotice}</span>
                </div>
              )}

              {devNotice && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <span>Developer Note:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">{devNotice}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="block text-center text-xs font-bold text-slate-700">
                    Enter 6-Digit Verification Code
                  </Label>
                  <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="h-12 w-11 sm:h-13 sm:w-12 text-center text-xl font-black rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs"
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={verifying || otp.join("").length !== 6}
                  className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{verifyingStage || "Verifying Code..."}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify & Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-center">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Didn&apos;t get the code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || resending}
                    className="font-bold text-teal-700 hover:underline disabled:text-slate-400 flex items-center gap-1.5"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span>Resend code in {cooldown}s</span>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>Resend code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setError(null);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-teal-700 inline-flex items-center gap-1 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Wrong email address? Go back</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 1: REGISTRATION FORM */
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
                  <span className="bg-white px-2 text-slate-400 font-semibold">
                    Or register with email
                  </span>
                </div>
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="role">Select Account Type *</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  >
                    <option value="FAMILY">Family Guardian / Administrator</option>
                    <option value="CARETAKER">
                      Licensed Nurse / Caretaker (Professional Verification)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        onChange={(e) => {
                          setName(e.target.value);
                          if (!legalName) setLegalName(e.target.value);
                        }}
                      />
                    </div>
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
                      placeholder="name@carenest.org"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
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

                {/* Authenticator 2FA Informational Box */}
                <div className="rounded-xl bg-teal-50/70 border border-teal-200 p-3 text-[11px] text-teal-900 flex items-start gap-2">
                  <KeyRound className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Compulsory Authenticator 2FA:</strong> For healthcare data protection,
                    you will configure a 6-digit Authenticator App code (Google Authenticator,
                    Microsoft Authenticator, or 1Password) after email verification.
                  </span>
                </div>

                {/* CARETAKER PROFESSIONAL QUALIFICATIONS SECTION */}
                {role === "CARETAKER" && (
                  <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-teal-200 pb-2">
                      <FileCheck className="h-5 w-5 text-teal-700" />
                      <div>
                        <h3 className="text-xs font-bold text-teal-950">
                          Professional Clinical Credentials
                        </h3>
                        <p className="text-[11px] text-teal-800">
                          Submitted for manual review by CARENEST platform administrators.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="category" className="text-xs">
                          Professional Category *
                        </Label>
                        <select
                          id="category"
                          value={professionalCategory}
                          onChange={(e) => setProfessionalCategory(e.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                        >
                          <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                          <option value="Doctor / Physician Assistant">
                            Doctor / Physician Assistant
                          </option>
                          <option value="Certified Nursing Assistant (CNA)">
                            Certified Nursing Assistant (CNA)
                          </option>
                          <option value="Geriatric Care Specialist">
                            Geriatric Care Specialist
                          </option>
                          <option value="Other Healthcare Professional">
                            Other Healthcare Professional
                          </option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="qualification" className="text-xs">
                          Highest Qualification *
                        </Label>
                        <Input
                          id="qualification"
                          required
                          placeholder="e.g. B.Sc. Nursing, GNM, MBBS"
                          className="text-xs"
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="regNumber" className="text-xs">
                          Registration / Certificate Number
                        </Label>
                        <Input
                          id="regNumber"
                          placeholder="e.g. RN-894721-CA (if applicable)"
                          className="text-xs"
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="authority" className="text-xs">
                          Issuing Authority *
                        </Label>
                        <Input
                          id="authority"
                          required
                          placeholder="e.g. State Nursing Council, Red Cross"
                          className="text-xs"
                          value={issuingAuthority}
                          onChange={(e) => setIssuingAuthority(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="stateRegion" className="text-xs">
                        State / Province
                      </Label>
                      <Input
                        id="stateRegion"
                        placeholder="e.g. California, Delhi, Maharashtra"
                        className="text-xs"
                        value={stateRegion}
                        onChange={(e) => setStateRegion(e.target.value)}
                      />
                    </div>

                    {/* Certificate Upload Field */}
                    <div className="space-y-1 pt-1">
                      <Label htmlFor="certUpload" className="text-xs font-bold text-slate-800">
                        Upload Certificate or License Document *
                      </Label>
                      <div className="mt-1 flex justify-center px-4 pt-3 pb-3 border-2 border-dashed border-teal-300 rounded-xl hover:bg-teal-50 transition-colors bg-white">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-7 w-7 text-teal-600" />
                          <div className="flex text-xs text-slate-600">
                            <label
                              htmlFor="certUpload"
                              className="relative cursor-pointer rounded-md font-bold text-teal-700 hover:text-teal-800 focus-within:outline-none"
                            >
                              <span>Choose Certificate File</span>
                              <input
                                id="certUpload"
                                name="certUpload"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="sr-only"
                                onChange={handleFileChange}
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            PDF, JPG, or PNG up to 10 MB. Stored securely in CARENEST vault.
                          </p>
                        </div>
                      </div>

                      {selectedFile && (
                        <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-teal-100/70 border border-teal-300 text-xs">
                          <div className="flex items-center gap-2 text-teal-900 font-semibold truncate">
                            <FileText className="h-4 w-4 text-teal-700 shrink-0" />
                            <span className="truncate">{selectedFile.name}</span>
                            <span className="text-[10px] text-slate-600">
                              ({Math.round(selectedFile.size / 1024)} KB)
                            </span>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {role === "FAMILY" && (
                  <div className="rounded-xl bg-teal-50/70 border border-teal-200 p-3 text-[11px] text-teal-900 leading-relaxed">
                    <strong>Notice for Senior Patients:</strong> Senior accounts are registered and
                    configured directly by their authorized Family Guardian with an accessible
                    4-digit PIN for one-step login.
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    loadingStage || "Processing..."
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </div>
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
