"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderlyProfileId: string;
  onSuccess: () => void;
}

export function AddAppointmentModal({
  open,
  onOpenChange,
  elderlyProfileId,
  onSuccess,
}: AddAppointmentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    title: "",
    doctorName: "",
    specialty: "",
    clinicName: "",
    locationAddress: "",
    appointmentDate: "",
    reminderMinutesBefore: 1440,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderlyProfileId,
          title: formData.title,
          doctorName: formData.doctorName,
          specialty: formData.specialty || undefined,
          clinicName: formData.clinicName,
          locationAddress: formData.locationAddress || undefined,
          appointmentDate: new Date(formData.appointmentDate).toISOString(),
          reminderMinutesBefore: Number(formData.reminderMinutesBefore),
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule appointment");
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Healthcare Visit</DialogTitle>
          <DialogDescription>
            Record clinical consultations, diagnostics, or follow-ups with proactive reminders.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="appt-title">Appointment Title *</Label>
            <Input
              id="appt-title"
              required
              placeholder="e.g. Cardiology Follow-Up & ECG Review"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="appt-doc">Physician Name *</Label>
              <Input
                id="appt-doc"
                required
                placeholder="Dr. Robert Chen"
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="appt-spec">Specialty</Label>
              <Input
                id="appt-spec"
                placeholder="Cardiology / Geriatrics"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="appt-clinic">Clinic / Facility Name *</Label>
            <Input
              id="appt-clinic"
              required
              placeholder="St. Jude Heart Institute"
              value={formData.clinicName}
              onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="appt-addr">Location / Address</Label>
            <Input
              id="appt-addr"
              placeholder="742 Evergreen Medical Parkway, Floor 4"
              value={formData.locationAddress}
              onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="appt-date">Date & Time *</Label>
              <Input
                id="appt-date"
                type="datetime-local"
                required
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="appt-reminder">Email Reminder</Label>
              <select
                id="appt-reminder"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={formData.reminderMinutesBefore}
                onChange={(e) => setFormData({ ...formData, reminderMinutesBefore: Number(e.target.value) })}
              >
                <option value={120}>2 hours before</option>
                <option value={1440}>24 hours before</option>
                <option value={2880}>48 hours before</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="appt-notes">Preparation Notes</Label>
            <Textarea
              id="appt-notes"
              placeholder="e.g. Fasting required 2 hours prior, bring current blood pressure log"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold">
              {loading ? "Scheduling..." : "Schedule Visit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
