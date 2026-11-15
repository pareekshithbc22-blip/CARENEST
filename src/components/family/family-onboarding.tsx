"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Users, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddElderlyProfileModal } from "@/components/family/add-elderly-profile-modal";

export function FamilyOnboarding({ userName }: { userName: string }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = React.useState(false);

  return (

    <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 text-center space-y-6">
      <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-teal-100 text-teal-800 shadow-md">
        <Heart className="h-8 w-8 stroke-2 fill-teal-50" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200">
          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
          <span>Family Administrator Workspace</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome to CareNest, {userName}
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          To begin coordinating care, add your first elderly loved one. You will be able to set up their medication schedule, configure missed-dose escalation rules, track appointments, and invite family members and professional caretakers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
          <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs">
            <Users className="h-4 w-4" />
            <span>Care Circle</span>
          </div>
          <p className="text-[11px] text-slate-500">
            One central circle connecting family and nurses.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
          <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs">
            <ShieldCheck className="h-4 w-4" />
            <span>Escalation</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Database-backed alerts when doses are unconfirmed.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
          <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs">
            <Heart className="h-4 w-4" />
            <span>Senior Mode</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Large high-contrast 60px buttons for elderly loved ones.
          </p>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-center">
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto h-12 px-8 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" /> Create First Elderly Profile
        </Button>
      </div>

      <AddElderlyProfileModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={(id) => {
          if (id) {
            router.push(`/dashboard/family?profileId=${id}`);
          } else {
            router.refresh();
          }
        }}
      />
    </div>
  );
}
