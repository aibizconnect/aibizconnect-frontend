import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { topic } = await req.json();

  const res = await fetch("http://localhost:4545/run-workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic })
  });

  const json = await res.json();
  return NextResponse.json(json);
}
