import { NextResponse } from "next/server";

export async function POST() {
  const res = await fetch("http://localhost:4545/security-check", {
    method: "POST"
  });

  const json = await res.json();
  return NextResponse.json(json);
}
