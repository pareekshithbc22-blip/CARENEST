"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, UserPlus } from "lucide-react";

interface AddElderlyProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newProfileId?: string) => void;
}

export function AddElderlyProfileModal({
  open,
  onOpenChange,
  onSuccess,
}: AddElderlyProfileModalProps) {
  const [name, setName] = React.useState("");
  const [preferredName, setPreferredName] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("1948-06-15");
  const [gender, setGender] = React.useState("Female");
  const [bloodGroup, setBloodGroup] = React.useState("A+");
  const [medicalConditions, setMedicalConditions] = React.useState("");
  const [allergies, setAllergies] = React.useState("");
  const [emergencyContactName, setEmergencyContactName] = React.useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = React.useState("Daughter");
  const [notes, setNotes] = React.useState("");
  const [isSeniorModeActive, setIsSeniorModeActive] = React.useState(true);
  const [seniorPin, setSeniorPin] = React.useState("1234");
  const [confirmPin, setConfirmPin] = React.useState("1234");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate 4-digit PIN
    if (seniorPin) {
      if (!/^\d{4}$/.test(seniorPin)) {
        setError("Senior PIN must be exactly 4 numeric digits (e.g. 1234).");
        setLoading(false);
        return;
      }
      if (seniorPin !== confirmPin) {
        setError("Senior PIN and Confirm PIN do not match. Please verify.");
        setLoading(false);
        return;
      }
    }

    const conditionsArray = medicalConditions
      ? medicalConditions.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const allergiesArray = allergies
      ? allergies.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          preferredName: preferredName || undefined,
          dateOfBirth,
          gender: gender || undefined,
          bloodGroup: bloodGroup || undefined,
          medicalConditions: conditionsArray,
          allergies: allergiesArray,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelation: emergencyContactRelation || undefined,
          notes: notes || undefined,
          isSeniorModeActive,
          seniorPin: seniorPin || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create profile");
      }

      onSuccess(data.profile?.id);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-teal-700">
            <Heart className="h-5 w-5 fill-teal-100" />
            <DialogTitle>Add Senior Patient Profile</DialogTitle>
          </div>
          <DialogDescription>
            Register a senior patient to establish a Care Circle, assign licensed caretakers, and coordinate family care.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prof-name">Full Name *</Label>
              <Input
                id="prof-name"
                required
                placeholder="Eleanor Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="prof-pref">Preferred Name / Title</Label>
              <Input
                id="prof-pref"
                placeholder="Grandma Eleanor"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prof-dob">Date of Birth *</Label>
              <Input
                id="prof-dob"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="prof-gender">Gender</Label>
              <select
                id="prof-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-teal-600"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prof-blood">Blood Group</Label>
              <select
                id="prof-blood"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-teal-600"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prof-cond">Medical Diagnoses / Chronic Conditions</Label>
            <Input
              id="prof-cond"
              placeholder="Hypertension, Type 2 Diabetes, Mild Cognitive Impairment (comma separated)"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prof-allergies">Known Drug & Environmental Allergies</Label>
            <Input
              id="prof-allergies"
              placeholder="Penicillin, Sulfa drugs, Latex (comma separated)"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Primary Emergency Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ec-name">Contact Name *</Label>
                <Input
                  id="ec-name"
                  required
                  placeholder="Sarah Vance"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ec-phone">Phone Number *</Label>
                <Input
                  id="ec-phone"
                  required
                  placeholder="+1 (555) 234-5678"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ec-rel">Relationship</Label>
                <Input
                  id="ec-rel"
                  placeholder="Daughter"
                  value={emergencyContactRelation}
                  onChange={(e) => setEmergencyContactRelation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Senior Mode Accessibility
            </h4>
            <div className="flex items-center space-x-2">
              <input
                id="prof-senior-mode"
                type="checkbox"
                checked={isSeniorModeActive}
                onChange={(e) => setIsSeniorModeActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <Label htmlFor="prof-senior-mode" className="text-xs font-medium cursor-pointer">
                Enable Senior Mode (Large 60px buttons, high contrast, simplified 1-tap confirmation)
              </Label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prof-pin">Senior 4-Digit PIN *</Label>
                <Input
                  id="prof-pin"
                  placeholder="1234"
                  maxLength={4}
                  required
                  value={seniorPin}
                  onChange={(e) => setSeniorPin(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center tracking-widest font-bold"
                />
                <p className="text-[10px] text-slate-400">4-digit PIN for simplified senior login</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prof-cpin">Confirm 4-Digit PIN *</Label>
                <Input
                  id="prof-cpin"
                  placeholder="1234"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center tracking-widest font-bold"
                />
                <p className="text-[10px] text-slate-400">Must match the 4-digit PIN above</p>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-teal-800 bg-teal-50/70 border border-teal-200 rounded-lg p-2 flex items-center space-x-1.5">
              <span>Automatic Caretaker Assignment: An active licensed caretaker will be allocated to this circle upon creation.</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prof-notes">Care & Mobility Notes</Label>
            <Textarea
              id="prof-notes"
              rows={2}
              placeholder="Requires reading glasses for medication. Prefers morning dose before breakfast."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? "Adding Patient..." : "Add Senior Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
