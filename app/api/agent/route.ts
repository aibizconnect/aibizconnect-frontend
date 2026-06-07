import { NextResponse } from "next/server";
import { runAgentCommand } from "@/ai-agent/agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.command) {
      return NextResponse.json({
        success: false,
        error: "Missing 'command' field."
      });
    }

    const id = body.id || `cmd_${Date.now()}`;

    const result = await runAgentCommand({
      id,
      command: body.command,
      cwd: body.cwd,
      meta: body.meta
    });

    return NextResponse.json({
      success: true,
      result
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    });
  }
}
