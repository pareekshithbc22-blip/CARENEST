"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, UserCheck, Users, HeartHandshake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoNavButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const firstFocusableRef = React.useRef<HTMLButtonElement>(null);
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
  const wasOpenRef = React.useRef(false);

  // Client-side mount flag to avoid hydration mismatch when portaling
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Lock page body scroll while open and restore on close
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus management: move focus into dialog on open, return to trigger button on close
  React.useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const timer = setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Handle Focus Trap & Escape key to close dialog
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // If NEXT_PUBLIC_DEMO_ENABLED is set to "false", hide completely
  if (process.env.NEXT_PUBLIC_DEMO_ENABLED === "false") {
    return null;
  }

  const handleSelectRole = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const dialogContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-dialog-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={dialogRef}
        style={{ maxHeight: "calc(100dvh - 2rem)", maxWidth: "28rem" }}
        className="w-full max-w-md flex flex-col rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 id="demo-dialog-title" className="font-bold text-sm text-slate-900 dark:text-white">
                Explore Demo Mode
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Test live dashboards with sample data
              </p>
            </div>
          </div>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto pr-0.5 space-y-2.5 overscroll-contain">
          {/* 1. Caretaker */}
          <button
            type="button"
            onClick={() => handleSelectRole("/demo/caretaker")}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700/60 transition-all text-left flex items-start gap-3 group focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-800 dark:group-hover:text-teal-300">
                1. Caretaker
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Vitals logging, medication assignment & shift task management
              </p>
            </div>
          </button>

          {/* 2. Family Administrator */}
          <button
            type="button"
            onClick={() => handleSelectRole("/demo/family")}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700/60 transition-all text-left flex items-start gap-3 group focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-800 dark:group-hover:text-teal-300">
                2. Family Administrator
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Care coordination, prescription provenance & daily dose log
              </p>
            </div>
          </button>

          {/* 3. Senior Patient */}
          <button
            type="button"
            onClick={() => handleSelectRole("/demo/senior")}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700/60 transition-all text-left flex items-start gap-3 group focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-800 dark:group-hover:text-teal-300">
                3. Senior Patient
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                High-contrast schedule, audio alarms & one-touch confirmation
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        ref={triggerButtonRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="border-teal-700/30 text-teal-800 hover:bg-teal-50 dark:border-teal-500/30 dark:text-teal-300 dark:hover:bg-teal-950/40 font-semibold flex items-center gap-1.5 shadow-2xs"
      >
        <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span>Demo mode</span>
      </Button>

      {mounted && isOpen && typeof document !== "undefined"
        ? createPortal(dialogContent, document.body)
        : null}
    </>
  );
}
