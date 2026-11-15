"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy } from "lucide-react";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  careCircleId: string;
  onSuccess: () => void;
}

export function InviteMemberModal({
  open,
  onOpenChange,
  careCircleId,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("FAMILY_MEMBER");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedInviteUrl(null);

    try {
      const res = await fetch(`/api/care-circles/${careCircleId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to issue invitation");
      }

      setGeneratedInviteUrl(data.invitation.invitationUrl);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Care Circle</DialogTitle>
          <DialogDescription>
            Grant secure, role-based access to family members or professional caregivers. Single-use token expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {generatedInviteUrl ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-teal-900">
              <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                <Check className="h-4 w-4 text-teal-700" />
                <span>Invitation Created & Email Dispatched</span>
              </div>
              <p className="text-xs text-teal-800">
                An invitation email was generated. You can also copy and share this secure link directly:
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Input
                  readOnly
                  value={generatedInviteUrl}
                  className="text-xs font-mono bg-white"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="invite-email">Recipient Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="relative@example.com or nurse@clinic.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="invite-role">Care Circle Role *</Label>
              <select
                id="invite-role"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="FAMILY_MEMBER">Family Member (View records, confirm doses, receive escalations)</option>
                <option value="CARETAKER">Licensed Caretaker / Nurse (Check-ins, tasks, vitals, care notes)</option>
                <option value="ADMIN">Circle Admin (Full control, manage medications, invite/revoke)</option>
                <option value="SENIOR">Senior Individual (Simplified dose view)</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold">
                {loading ? "Generating..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
