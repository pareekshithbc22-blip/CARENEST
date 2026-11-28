"use client";

import * as React from "react";
import { Navbar } from "@/components/navbar";
import { DemoFamilyView } from "@/demo/components/demo-family-view";
import { getDemoFamilyProps, subscribeToDemoUpdates } from "@/demo/store";

export default function DemoFamilyPage() {
  const [props, setProps] = React.useState(() => getDemoFamilyProps());

  React.useEffect(() => {
    const unsubscribe = subscribeToDemoUpdates(() => {
      setProps(getDemoFamilyProps());
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar availableProfiles={props.availableProfiles} />
      <main className="flex-1">
        <DemoFamilyView />
      </main>
    </div>
  );
}
