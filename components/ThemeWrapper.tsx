"use client";

import { ThemeProvider } from "@/app/providers/ThemeProvider";

export default function ThemeWrapper({
  children
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
