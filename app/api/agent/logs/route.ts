import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") || "commands";

  const res = await fetch(`http://localhost:4545/logs?file=${file}`);
  const text = await res.text();
  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain" }
  });
}
