import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoClientShell } from "./demo-shell";

export const metadata: Metadata = {
  title: "CareNest Demo Mode",
  description: "Explore CareNest caretaker, family, and senior dashboards in an isolated demo sandbox.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_DEMO_ENABLED === "false") {
    notFound();
  }

  return <DemoClientShell>{children}</DemoClientShell>;
}
