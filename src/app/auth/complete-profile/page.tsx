"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  Upload,
  FileText,
  FileCheck,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CompleteProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <CompleteProfileContent />
    </React.Suspense>
  );
}

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus, update } = useSession();

  const queryRole = searchParams.get("role");
  const [role, setRole] = React.useState<"FAMILY" | "CARETAKER">(
    queryRole === "CARETAKER" ? "CARETAKER" : "FAMILY"
  );
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
  const [error, setError] = React.useState<string | null>(null);

  // Pre-fill user data once session loads
  React.useEffect(() => {
    if (session?.user) {
      if (session.user.name && !legalName) {
        setLegalName(session.user.name);
      }
      if (session.user.phoneNumber && !phoneNumber) {
        setPhoneNumber(session.user.phoneNumber);
      }
      // If user has already configured role & completed profile, redirect forward
      if (session.user.needsProfileCompletion === false) {
        if (!session.user.twoFactorEnabled) {
          router.push("/auth/2fa/setup");
        } else if (!session.user.twoFactorVerified) {
          router.push("/auth/2fa/verify");
        } else {
          router.push(session.user.role === "CARETAKER" ? "/dashboard/caretaker" : "/dashboard/family");
        }
      }
    }
  }, [session, router, legalName, phoneNumber]);

  // Phone validation helper
  const isPhoneValid = (phone: string) => /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim());

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (phoneNumber && !isPhoneValid(phoneNumber)) {
      setError("Please enter a valid phone number (minimum 7 digits, numbers, +, - only).");
      return;
    }

    if (role === "CARETAKER") {
      if (!legalName.trim() || legalName.trim().length < 2) {
        setError("Please enter your full legal name as it appears on your license.");
        return;
      }
      if (!qualification.trim() || qualification.trim().length < 2) {
        setError("Please enter your clinical qualification (e.g. B.Sc. Nursing, GNM, MBBS).");
        return;
      }
      if (!issuingAuthority.trim() || issuingAuthority.trim().length < 2) {
        setError("Please enter the issuing licensing council or health authority.");
        return;
      }
      if (!selectedFile) {
        setError("Please attach your professional certificate or license document (PDF, JPG, or PNG).");
        return;
      }
    }

    setLoading(true);

    try {
      let uploadedDocData = null;

      if (role === "CARETAKER" && selectedFile) {
        setLoadingStage("Encrypting & storing certificate in vault...");

        // Fetch short-lived upload token
        const tokenRes = await fetch("/api/auth/upload-token").catch(() => null);
        const tokenJson = tokenRes ? await tokenRes.json().catch(() => null) : null;

        const uploadForm = new FormData();
        uploadForm.append("file", selectedFile);
        if (tokenJson?.token) {
          uploadForm.append("uploadToken", tokenJson.token);
        }

        const uploadRes = await fetch("/api/caretakers/upload-document", {
          method: "POST",
          body: uploadForm,
          headers: tokenJson?.token ? { "x-upload-token": tokenJson.token } : {},
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadJson.error || "Failed to upload certificate document.");
        }

        uploadedDocData = {
          fullName: legalName.trim(),
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

      setLoadingStage("Saving account role details...");
      const saveRes = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          phoneNumber: phoneNumber.trim() || undefined,
          caretakerProfile: uploadedDocData || undefined,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to save profile role.");
      }

      // Update session JWT
      await update({
        role,
        needsProfileCompletion: false,
      });

      // Proceed immediately to compulsory 2FA setup inside the same website
      router.push("/auth/2fa/setup");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save profile configuration.");
      setLoading(false);
      setLoadingStage(null);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

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
          Select Your Account Role
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Welcome to CARENEST. Please select your account type to configure appropriate healthcare permissions.
        </p>
      </div>

      <div className={`mt-8 sm:mx-auto sm:w-full ${role === "CARETAKER" ? "sm:max-w-xl" : "sm:max-w-md"}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="role">Select Account Type *</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "FAMILY" | "CARETAKER")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
              >
                <option value="FAMILY">Family Guardian / Administrator</option>
                <option value="CARETAKER">Licensed Nurse / Caretaker (Professional Verification)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 234-5678"
                  className="pl-9 text-xs"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
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
                      Submitted for administrative compliance review before patient clinical data access is granted.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="legalName" className="text-xs">Full Legal Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="legalName"
                      required
                      placeholder="e.g. Marcus Vance, RN"
                      className="pl-9 text-xs"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
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
                    <Label htmlFor="regNumber" className="text-xs">Registration / License Number</Label>
                    <Input
                      id="regNumber"
                      placeholder="e.g. RN-894721-CA"
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
                <strong>Family Administrator:</strong> You can create and coordinate care circles, monitor adherence, and manage caretaker access for elderly family members.
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                loadingStage || "Saving profile..."
              ) : (
                <>
                  <span>Save Role & Proceed to 2FA Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
