"use client";

import * as React from "react";
import { Navbar } from "@/components/navbar";
import { DemoSeniorView } from "@/demo/components/demo-senior-view";
import { getDemoSeniorProps, getDemoState, subscribeToDemoUpdates } from "@/demo/store";

export default function DemoSeniorPage() {
  const [seniorProps, setSeniorProps] = React.useState(() => getDemoSeniorProps());

  React.useEffect(() => {
    const unsub = subscribeToDemoUpdates(() => {
      setSeniorProps(getDemoSeniorProps());
    });
    return unsub;
  }, []);

  const state = getDemoState();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        availableProfiles={state.patients.map((p) => ({
          id: p.id,
          name: p.name,
          preferredName: p.preferredName,
        }))}
      />
      <main className="flex-1">
        <DemoSeniorView />
      </main>
    </div>
  );
}
