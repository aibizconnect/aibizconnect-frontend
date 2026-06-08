"use client";

import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { GlobalDialogs } from "@/lib/ui/dialogs";

export default function ThemeWrapper({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {children}
      <GlobalDialogs />
    </ThemeProvider>
  );
}
