import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("http://localhost:4545/tasks");
  const json = await res.json();
  return NextResponse.json(json);
}
