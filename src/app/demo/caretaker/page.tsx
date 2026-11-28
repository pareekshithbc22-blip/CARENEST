"use client";

import * as React from "react";
import { Navbar } from "@/components/navbar";
import { DemoCaretakerView } from "@/demo/components/demo-caretaker-view";
import { getDemoCaretakerProps, subscribeToDemoUpdates } from "@/demo/store";

export default function DemoCaretakerPage() {
  const [props, setProps] = React.useState(() => getDemoCaretakerProps());

  React.useEffect(() => {
    const unsubscribe = subscribeToDemoUpdates(() => {
      setProps(getDemoCaretakerProps());
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        availableProfiles={props.profiles.map((p) => ({
          id: p.id,
          name: p.name,
          preferredName: p.preferredName,
        }))}
      />
      <main className="flex-1">
        <DemoCaretakerView />
      </main>
    </div>
  );
}
