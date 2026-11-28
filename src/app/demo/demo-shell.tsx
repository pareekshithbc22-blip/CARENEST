"use client";

import * as React from "react";
import { DemoBanner } from "@/demo/demo-banner";
import { setupDemoFetchInterceptor } from "@/demo/fetch-interceptor";

export function DemoClientShell({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const teardown = setupDemoFetchInterceptor();
    return () => {
      teardown();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DemoBanner />
      <div className="flex-1">{children}</div>
    </div>
  );
}
