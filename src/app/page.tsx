import Link from "next/link";
import {
  Heart,
  Shield,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowRight,
  Sparkles,
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
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center space-x-2 rounded-full bg-teal-100/80 px-4 py-1.5 text-xs font-bold text-teal-800 border border-teal-200">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Intelligent Healthcare Ecosystem</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950">
                One connected circle of care.{" "}
                <span className="text-teal-700">Every dose.</span>{" "}
                <span className="text-slate-700">Every appointment.</span>{" "}
                <span className="text-emerald-700">Everyone informed.</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed">
                CareNest bridges the critical gap between elderly loved ones, family members, and professional caretakers with accessible interfaces, database-backed missed-dose escalations, and proactive email notifications.
              </p>

              {/* Instant Evaluation Quick Switcher Box */}
              <div className="rounded-2xl border-2 border-teal-200 bg-white/95 p-6 shadow-xl backdrop-blur-md max-w-2xl mx-auto text-left">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Live Hackathon Demonstration Perspectives
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-700">Pre-seeded demo</span>
                </div>

                <p className="text-xs text-slate-500 my-3">
                  Experience CareNest from any user role. Select a perspective to test role-specific workflows immediately:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link href="/dashboard/senior" className="block">
                    <div className="rounded-xl border border-teal-300 bg-teal-50/50 p-3 hover:bg-teal-100/60 transition-all text-center group cursor-pointer h-full flex flex-col justify-between">
                      <div>
                        <Badge variant="outline" className="text-[10px] bg-white border-teal-300">
                          Senior Patient
                        </Badge>
                        <h4 className="font-extrabold text-sm text-slate-900 mt-1">Eleanor Vance</h4>
                        <p className="text-[11px] text-teal-800 font-medium">Senior Mode Dashboard</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 block font-mono">PIN: 1234</span>
                    </div>
                  </Link>

                  <Link href="/dashboard/family" className="block">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 hover:bg-slate-100 transition-all text-center group cursor-pointer h-full flex flex-col justify-between">
                      <div>
                        <Badge variant="secondary" className="text-[10px]">
                          Family Admin
                        </Badge>
                        <h4 className="font-extrabold text-sm text-slate-900 mt-1">Sarah Vance</h4>
                        <p className="text-[11px] text-slate-600 font-medium">Coordinator Portal</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 block">Daughter & Admin</span>
                    </div>
                  </Link>

                  <Link href="/dashboard/caretaker" className="block">
                    <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 hover:bg-sky-100/60 transition-all text-center group cursor-pointer h-full flex flex-col justify-between">
                      <div>
                        <Badge variant="info" className="text-[10px]">
                          Licensed RN
                        </Badge>
                        <h4 className="font-extrabold text-sm text-slate-900 mt-1">Marcus Reed, RN</h4>
                        <p className="text-[11px] text-sky-800 font-medium">Caretaker Workspace</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 block">Shift Care & Vitals</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Main Call To Action */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 bg-teal-700 hover:bg-teal-800 text-white font-bold text-base shadow-md">
                    Create Family Care Circle <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-12 px-6 font-bold text-base">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works: The Three Circles of Care */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Collaborative Architecture
              </span>
              <h2 className="text-3xl font-black text-slate-900">
                Connected Healthcare Across Three Essential Roles
              </h2>
              <p className="text-sm text-slate-500">
                Built specifically for real families dealing with chronic medication regimens, cognitive autonomy, and care handovers.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Circle 1: The Senior */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-8 space-y-4 hover:border-teal-400 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <Heart className="h-6 w-6 stroke-2" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">The Senior Experience</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A dedicated high-contrast <strong>Senior Mode</strong> with 60px+ touch targets, simple one-tap dose confirmations, clear time groupings, emergency contact buttons, and optional 4-digit PIN access.
                </p>
                <ul className="text-xs text-slate-500 space-y-2 pt-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Large readable typography & contrast</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Zero cognitive clutter or confusing menus</span>
                  </li>
                </ul>
              </div>

              {/* Circle 2: Family Coordinators */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-8 space-y-4 hover:border-teal-400 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <Users className="h-6 w-6 stroke-2" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Family & Loved Ones</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Complete peace of mind with real-time adherence oversight, multiple elderly profiles under one account, refill countdowns, upcoming doctor visits, and automated escalation if a dose is missed.
                </p>
                <ul className="text-xs text-slate-500 space-y-2 pt-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Multi-elderly profile support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Single-use expiring invite tokens</span>
                  </li>
                </ul>
              </div>

              {/* Circle 3: Professional Caretakers */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-8 space-y-4 hover:border-teal-400 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <Activity className="h-6 w-6 stroke-2" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Caregivers & Nurses</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Clinical shift workflows including daily care task checklists, assisted medication administration records, vital sign logging (BP, Blood Glucose, Heart Rate), and handover notes.
                </p>
                <ul className="text-xs text-slate-500 space-y-2 pt-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Vital signs tracker & handover notes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Task completion audit trail</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Intelligent Missed-Dose Escalation Engine Section */}
        <section className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Configurable Escalation Engine</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-slate-950">
                  Never miss a critical dose. Database-backed escalation.
                </h2>

                <p className="text-base text-slate-600 leading-relaxed">
                  Unlike basic reminder apps that rely on fragile browser timers or push notifications on an open laptop, CareNest features an autonomous, server-side escalation engine compatible with Google Cloud Scheduler:
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Configurable Grace Window</h4>
                      <p className="text-xs text-slate-500">
                        Senior receives gentle scheduled reminders with ample grace time (default 45 mins) to take their medicine.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs shrink-0">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Tier 1: Caretaker Direct Notification</h4>
                      <p className="text-xs text-slate-500">
                        If grace period elapses without confirmation, the assigned nurse or caregiver receives an instant in-app alert & proactive email.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white font-bold text-xs shrink-0">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Tier 2: Urgent Family Circle Escalation</h4>
                      <p className="text-xs text-slate-500">
                        If still unconfirmed after 30 minutes, urgent escalation emails and emergency alerts are dispatched to authorized family members.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Escalation Simulation Card */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Live Escalation Audit Log
                  </span>
                  <Badge variant="urgent">Idempotent Execution</Badge>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <span className="text-teal-700 font-bold">[08:00 AM]</span> Dose Scheduled: Lisinopril 10mg
                    <div className="text-[11px] text-slate-500 font-sans mt-0.5">Senior reminder dispatched via email and in-app banner</div>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-amber-950">
                    <span className="text-amber-700 font-bold">[08:45 AM]</span> Grace Period Elapsed (45 min)
                    <div className="text-[11px] text-amber-800 font-sans mt-0.5">Tier 1 Caretaker alert sent to Marcus Reed, RN</div>
                  </div>

                  <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-rose-950">
                    <span className="text-rose-700 font-bold">[09:15 AM]</span> Urgent Tier 2 Escalation Dispatched
                    <div className="text-[11px] text-rose-800 font-sans mt-0.5">Family Coordinator Sarah Vance alerted with 1-tap phone dial</div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 text-center font-sans">
                  Protected endpoint: <code className="bg-slate-100 px-1 py-0.5 rounded">POST /api/scheduler/process-escalations</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Safety & Compliance Mindset */}
        <section className="py-16 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-teal-900 text-white p-8 sm:p-12 shadow-xl">
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
                  <Shield className="h-4 w-4" />
                  <span>Clinical Safety & Ethics Commitment</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold">
                  Engineered with Clinical Restraint and Patient Dignity
                </h2>
                <p className="text-sm sm:text-base text-teal-100 leading-relaxed">
                  CareNest is strictly designed as a coordination and adherence system. CareNest <strong>never</strong> automatically recommends taking an additional dose, changing a prescription, or making autonomous medical diagnoses. Prescriptions are recorded strictly as instructed by licensed healthcare providers.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs text-teal-200">
                  <span>✓ Server-side IDOR authorization guards</span>
                  <span>✓ Complete relational audit trail</span>
                  <span>✓ WCAG 2.2 AA accessibility target</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Heart className="h-3.5 w-3.5 fill-white/20" />
            </div>
            <span className="font-bold text-slate-800">CareNest Platform</span>
            <span>• One connected circle of care.</span>
          </div>
          <p>
            Designed for the Solo Hackathon 2026. Built with Next.js 16, Prisma 7, and PostgreSQL.
          </p>
        </div>
      </footer>
    </div>
  );
}
