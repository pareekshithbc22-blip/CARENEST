"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddMedicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderlyProfileId: string;
  onSuccess: () => void;
}

export function AddMedicationModal({
  open,
  onOpenChange,
  elderlyProfileId,
  onSuccess,
}: AddMedicationModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    brandName: "",
    genericName: "",
    form: "TABLET",
    strength: "",
    dosageInstructions: "",
    prescribingDoctor: "",
    prescribingClinic: "",
    rxNumber: "",
    purpose: "",
    frequency: "DAILY",
    time1: "08:00",
    time2: "",
    dosageQuantity: 1.0,
    initialStock: 30,
    unit: "tablets",
    refillThreshold: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const timesOfDay = [formData.time1];
    if (formData.time2) timesOfDay.push(formData.time2);

    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId,
          name: formData.name,
          brandName: formData.brandName || undefined,
          genericName: formData.genericName || undefined,
          form: formData.form,
          strength: formData.strength,
          dosageInstructions: formData.dosageInstructions,
          prescribingDoctor: formData.prescribingDoctor || undefined,
          prescribingClinic: formData.prescribingClinic || undefined,
          rxNumber: formData.rxNumber || undefined,
          purpose: formData.purpose || undefined,
          frequency: formData.frequency,
          timesOfDay,
          dosageQuantity: Number(formData.dosageQuantity),
          initialStock: Number(formData.initialStock),
          unit: formData.unit,
          refillThreshold: Number(formData.refillThreshold),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add medication");
      }

      onOpenChange(false);
      onSuccess();
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
          <DialogTitle>Add Prescribed Medication</DialogTitle>
          <DialogDescription>
            Register a medication schedule, dosage instructions, and supply inventory for your loved one.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="med-name">Medication Name *</Label>
              <Input
                id="med-name"
                required
                placeholder="e.g. Lisinopril"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="med-strength">Strength *</Label>
              <Input
                id="med-strength"
                required
                placeholder="e.g. 10 mg or 500 mg"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="med-form">Dosage Form</Label>
              <select
                id="med-form"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={formData.form}
                onChange={(e) => setFormData({ ...formData, form: e.target.value })}
              >
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="SYRUP">Liquid / Syrup</option>
                <option value="DROPS">Drops</option>
                <option value="INHALER">Inhaler</option>
                <option value="INJECTION">Injection</option>
                <option value="TOPICAL">Topical Cream</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="med-purpose">Indication / Purpose</Label>
              <Input
                id="med-purpose"
                placeholder="e.g. Blood pressure control"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="med-instructions">Prescribed Dosage Instructions *</Label>
            <Input
              id="med-instructions"
              required
              placeholder="e.g. Take 1 tablet every morning with breakfast"
              value={formData.dosageInstructions}
              onChange={(e) => setFormData({ ...formData, dosageInstructions: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="med-doctor">Prescribing Doctor</Label>
              <Input
                id="med-doctor"
                placeholder="Dr. Robert Chen"
                value={formData.prescribingDoctor}
                onChange={(e) => setFormData({ ...formData, prescribingDoctor: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="med-rx">Rx Number</Label>
              <Input
                id="med-rx"
                placeholder="RX-884210"
                value={formData.rxNumber}
                onChange={(e) => setFormData({ ...formData, rxNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Schedule Times */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-3">
            <div className="font-semibold text-xs text-slate-800 uppercase">
              Schedule & Stock Tracking
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="med-time1">Dose Time 1 *</Label>
                <Input
                  id="med-time1"
                  type="time"
                  required
                  value={formData.time1}
                  onChange={(e) => setFormData({ ...formData, time1: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-time2">Dose Time 2 (Optional)</Label>
                <Input
                  id="med-time2"
                  type="time"
                  value={formData.time2}
                  onChange={(e) => setFormData({ ...formData, time2: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="med-stock">Starting Stock</Label>
                <Input
                  id="med-stock"
                  type="number"
                  min="1"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-unit">Unit</Label>
                <Input
                  id="med-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-threshold">Refill Warning</Label>
                <Input
                  id="med-threshold"
                  type="number"
                  min="1"
                  value={formData.refillThreshold}
                  onChange={(e) => setFormData({ ...formData, refillThreshold: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold">
              {loading ? "Adding..." : "Save Medication"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
