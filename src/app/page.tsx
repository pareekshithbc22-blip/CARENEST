import Link from "next/link";
import {
  Heart,
  Shield,
  Users,
  CheckCircle2,
  Activity,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Pill,
  Clock,
  TrendingUp,
  FileText,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";

export const metadata = {
  title: "CareNest - Intelligent Elderly Care & Family Coordination Platform",
  description:
    "One connected circle of care. Every dose. Every appointment. Everyone informed.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section id="about" className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center space-x-2 rounded-full bg-teal-100/80 px-4 py-1.5 text-xs font-bold text-teal-800 border border-teal-200">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Connected Healthcare Ecosystem</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950">
                One connected circle of care.{" "}
                <span className="text-teal-700">Every dose.</span>{" "}
                <span className="text-slate-700">Every appointment.</span>{" "}
                <span className="text-emerald-700">Everyone informed.</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed">
                CareNest unites elderly loved ones, family coordinators, and professional caretakers in a unified healthcare platform. Experience accessible medication schedules, live physiological telemetry, and real-time coordination without communication gaps.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="h-13 px-8 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-base shadow-lg shadow-teal-700/20 active:scale-95 transition-all">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-13 px-8 border-slate-300 font-bold text-base hover:bg-slate-100 active:scale-95 transition-all">
                    Sign In
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  <span>Role-Based Access Control</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  <span>Real-Time Health Telemetry</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  <span>Senior Mode Accessibility</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Connected-Care Ecosystem Visual Flow */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Unified Ecosystem Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                How CareNest Connects the Circle of Care
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                A shared, synchronized healthcare record engineered with strict server-side authorization so every member receives the tools and data tailored to their care responsibility.
              </p>
            </div>

            {/* 3-Pillar Ecosystem Grid */}
            <div className="grid gap-8 lg:grid-cols-3 relative">
              {/* Pillar 1: Senior Patient */}
              <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/40 p-8 space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-700/20">
                      <Heart className="h-6 w-6 stroke-2" />
                    </div>
                    <Badge variant="outline" className="bg-white border-teal-300 text-teal-800 font-bold">
                      Senior Patient
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Senior Experience</h3>
                    <p className="text-xs font-bold text-teal-800 mt-0.5">Empowering Independence</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Designed specifically for elderly individuals with an uncluttered interface, large high-contrast buttons, and simplified 4-digit PIN access.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-2">
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>One-tap medication confirmation with audible cues</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Self-reported vitals (Heart rate, Glucose, BP, SpO2)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>1-click Phone and WhatsApp direct dialing to caretakers</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-teal-200/60">
                  <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">
                    Key Benefit
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Dignified independence without cognitive overload
                  </span>
                </div>
              </div>

              {/* Pillar 2: Family Coordinator */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/20">
                      <Users className="h-6 w-6 stroke-2" />
                    </div>
                    <Badge variant="secondary" className="font-bold">
                      Family Admin
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Family Coordinator</h3>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">Oversight & Peace of Mind</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The central administrator managing multiple elderly loved ones, prescriptions, doctor visits, and caretaker circle access.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-2">
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Multi-profile support with loved-one profile switcher</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Live medication adherence rates and missed-dose alerts</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Expiring invitation tokens for family & professional nurses</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                    Key Benefit
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Total visibility into loved ones&apos; care routines from anywhere
                  </span>
                </div>
              </div>

              {/* Pillar 3: Licensed Caretaker */}
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/40 p-8 space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-700 text-white shadow-md shadow-sky-700/20">
                      <Activity className="h-6 w-6 stroke-2" />
                    </div>
                    <Badge variant="info" className="font-bold">
                      Licensed Caretaker
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Caretaker & Nurse</h3>
                    <p className="text-xs font-bold text-sky-800 mt-0.5">Clinical Telemetry & Tasks</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Professional shift workstation providing multi-patient selection, isolated physiological trend graphs, care tasks, and handover logs.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-2">
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Multi-patient selector with strict data separation</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Real-time physiological graphs (Heart Rate, Glucose, BP)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Daily clinical care task checklists & shift handover logs</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-sky-200/60">
                  <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider block">
                    Key Benefit
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Real-time patient telemetry and seamless shift continuity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Platform Features Presentation */}
        <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Core Capabilities
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Comprehensive Healthcare Management
              </h2>
              <p className="text-sm text-slate-600">
                CareNest replaces fragmented text messages, sticky notes, and isolated apps with one secure platform.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-teal-400 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <Pill className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Medication Scheduling & Adherence</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Track complex prescriptions with dosage forms, strength, frequencies, and stock countdowns to prevent missed doses and accidental double dosing.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-teal-400 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Live Health Measurement Telemetry</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Record and monitor vital signs: Heart Rate (BPM), Blood Glucose (mg/dL), Blood Pressure (mmHg), Body Temp (°C), SpO2, and Weight with historical trend graphs.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-teal-400 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Automated Missed-Dose Escalation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Configurable grace windows alert attending caretakers first. If a dose remains unconfirmed, urgent notifications escalate to family members automatically.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-teal-400 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Doctor Appointments & Logistics</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Manage specialist visits, clinic locations, and reminders so family members and caretakers are aligned on upcoming consultations and checkups.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-teal-400 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Shift Handovers & Clinical Notes</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Attending nurses record shift logs, observations, and vital summaries, ensuring smooth handovers and continuous care documentation.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-teal-400 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Multi-Profile Family Care Circles</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Support multiple elderly relatives under one family account with independent health records, separate care circles, and strict server-side permissions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (3 Steps) */}
        <section id="help" className="py-20 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Simple Onboarding
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                How CareNest Coordinates Daily Care
              </h2>
              <p className="text-sm text-slate-600">
                Getting started takes minutes, creating an immediate safety net for your loved one.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 text-center">
              <div className="space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-teal-100 text-teal-800 text-xl font-black">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900">Create the Elderly Profile</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The family coordinator registers, enters the patient&apos;s details, medications, and emergency contacts, establishing the secure Care Circle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-teal-100 text-teal-800 text-xl font-black">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900">Invite Circle Members</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Invite siblings, relatives, and professional caretakers using single-use, role-governed invitation links with verified permissions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-teal-100 text-teal-800 text-xl font-black">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900">Stay Informed & Coordinated</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seniors confirm doses easily in Senior Mode. Caretakers log vitals and tasks. Families enjoy real-time peace of mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Clinical Safety & Ethical Standards */}
        <section className="py-16 bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-teal-900 text-white p-8 sm:p-12 shadow-xl">
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
                  <Shield className="h-4 w-4" />
                  <span>Clinical Safety & Ethics Commitment</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Engineered with Clinical Restraint and Patient Dignity
                </h2>
                <p className="text-sm sm:text-base text-teal-100 leading-relaxed">
                  CareNest is strictly a coordination and adherence support platform. CareNest <strong>never</strong> automatically prescribes medications, alters dosage regimens, or makes autonomous clinical diagnoses. All schedules and health logs reflect inputs from patients, family coordinators, and licensed medical practitioners.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-teal-200">
                  <span>✓ Server-side IDOR authorization guards</span>
                  <span>✓ Complete relational audit trail</span>
                  <span>✓ Strict patient health record isolation</span>
                  <span>✓ WCAG 2.2 AA accessibility target</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Official Contact Section */}
        <section id="contact" className="py-20 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Get in Touch
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Contact CareNest Healthcare Team
              </h2>
              <p className="text-sm text-slate-600">
                Have inquiries about deployment, care coordination, or pilot partnerships? Reach our team directly:
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
              {/* Contact 1: Ravi P Nawale */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-6 space-y-4 hover:border-teal-400 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-800 font-black text-lg">
                    RN
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Ravi P Nawale</h3>
                    <p className="text-xs font-bold text-teal-800">CareNest Engineering & Healthcare Operations</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Phone className="h-4 w-4 text-teal-700 shrink-0" />
                    <span>Phone:</span>
                    <a
                      href="tel:6361963006"
                      className="font-bold text-teal-800 hover:underline"
                    >
                      6361963006
                    </a>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-700">
                    <Mail className="h-4 w-4 text-teal-700 shrink-0" />
                    <span>Email:</span>
                    <a
                      href="mailto:ravi.p.nawale.carenest@gmail.com"
                      className="font-bold text-teal-800 hover:underline break-all"
                    >
                      ravi.p.nawale.carenest@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact 2: Deepak */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-6 space-y-4 hover:border-teal-400 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-800 font-black text-lg">
                    D
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Deepak</h3>
                    <p className="text-xs font-bold text-teal-800">CareNest Coordination & Platform Support</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Phone className="h-4 w-4 text-teal-700 shrink-0" />
                    <span>Phone:</span>
                    <a
                      href="tel:8618914843"
                      className="font-bold text-teal-800 hover:underline"
                    >
                      8618914843
                    </a>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-700">
                    <Mail className="h-4 w-4 text-teal-700 shrink-0" />
                    <span>Email:</span>
                    <a
                      href="mailto:deepak.carenest.contact@gmail.com"
                      className="font-bold text-teal-800 hover:underline break-all"
                    >
                      deepak.carenest.contact@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Professional Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Heart className="h-4 w-4 fill-white/20" />
            </div>
            <span className="font-extrabold text-slate-900">CareNest Healthcare Platform</span>
            <span>• One connected circle of care.</span>
          </div>
          <p>© 2026 CareNest Healthcare Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
