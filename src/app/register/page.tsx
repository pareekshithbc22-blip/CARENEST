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
  Upload,
  FileText,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();

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

  // OTP Verification State
  const [step, setStep] = React.useState<"FORM" | "OTP">("FORM");
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [expirySeconds, setExpirySeconds] = React.useState(300); // 5 minutes
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);
  const [isResending, setIsResending] = React.useState(false);

  // Status & Feedback
  const [loading, setLoading] = React.useState(false);
  const [loadingStage, setLoadingStage] = React.useState<string | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file size check: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError("Document file size exceeds 10 MB limit. Please upload a smaller certificate.");
      return;
    }

    // Client-side extension check
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Invalid file format. Please upload a PDF, JPG, or PNG document.");
      return;
    }

    setSelectedFile(file);
  };

  // Step 1: Validate Details and Dispatch OTP
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

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

    // Both Family Admin and Caretakers undergo email OTP verification
    setLoading(true);
    setLoadingStage("Dispatching verification code...");
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
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  // Step 2: Handle OTP Input Changes
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);

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

  // Submit OTP Verification and complete registration
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
      setLoadingStage("Verifying security code...");
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

      // Step B: If Caretaker, upload certificate document to secure storage
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

      // Step C: Submit completed registration payload
      setLoadingStage("Creating verified care account...");
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phoneNumber: phoneNumber.trim(),
          verificationToken,
          caretakerProfile: uploadedDocData || undefined,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || "Registration completion failed.");
      }

      // Step D: Automatic sign in
      setLoadingStage("Signing in...");
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!signInRes?.error) {
        if (role === "CARETAKER") {
          router.push("/dashboard/caretaker");
        } else {
          router.push("/dashboard/family");
        }
        router.refresh();
      } else {
        router.push("/login?verified=true");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setLoadingStage(null);
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

      <div className={`mt-8 sm:mx-auto sm:w-full ${role === "CARETAKER" && step === "FORM" ? "sm:max-w-xl" : "sm:max-w-md"}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
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
                <Label htmlFor="role">Select Account Type *</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                >
                  <option value="FAMILY">Family Guardian / Administrator</option>
                  <option value="CARETAKER">Licensed Nurse / Caretaker (Professional Verification)</option>
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
                <p className="text-[11px] text-teal-700 font-medium flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3" /> A 6-digit verification code will be sent to confirm this address.
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

              {/* CARETAKER PROFESSIONAL QUALIFICATIONS SECTION */}
              {role === "CARETAKER" && (
                <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-teal-200 pb-2">
                    <FileCheck className="h-5 w-5 text-teal-700" />
                    <div>
                      <h3 className="text-xs font-bold text-teal-950">Professional Clinical Credentials</h3>
                      <p className="text-[11px] text-teal-800">
                        Submitted for manual review by CARENEST platform administrators.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="category" className="text-xs">Professional Category *</Label>
                      <select
                        id="category"
                        value={professionalCategory}
                        onChange={(e) => setProfessionalCategory(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                      >
                        <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                        <option value="Doctor / Physician Assistant">Doctor / Physician Assistant</option>
                        <option value="Certified Nursing Assistant (CNA)">Certified Nursing Assistant (CNA)</option>
                        <option value="Geriatric Care Specialist">Geriatric Care Specialist</option>
                        <option value="Other Healthcare Professional">Other Healthcare Professional</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="qualification" className="text-xs">Highest Qualification *</Label>
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
                      <Label htmlFor="regNumber" className="text-xs">Registration / Certificate Number</Label>
                      <Input
                        id="regNumber"
                        placeholder="e.g. RN-894721-CA (if applicable)"
                        className="text-xs"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="authority" className="text-xs">Issuing Authority *</Label>
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
                    <Label htmlFor="stateRegion" className="text-xs">State / Province</Label>
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
                  <strong>Notice for Senior Patients:</strong> Senior accounts are registered and configured directly by their authorized Family Guardian with an accessible 4-digit PIN for one-step login.
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
                    Verify Email & Continue
                  </>
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
                  {loading ? loadingStage || "Completing registration..." : "Confirm Code & Complete Registration"}
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
