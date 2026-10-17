import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DeepSeekConfigurationError,
  DeepSeekUpstreamError,
  generatePrResult
} from "@/lib/deepseek";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  source: z.string().trim().min(20).max(50000),
  context: z.string().trim().max(5000).optional().default(""),
  language: z.enum(["zh-CN", "en-US"]).default("zh-CN"),
  commitStyle: z.enum(["conventional", "plain"]).default("conventional"),
  outputMode: z.enum(["both", "commit", "pr"]).default("both"),
  includeRisks: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  const clientIp = clientAddress(request);
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return jsonError(
      400,
      firstIssue
        ? `${firstIssue.path.join(".") || "body"}: ${firstIssue.message}`
        : "Invalid request body."
    );
  }

  try {
    const result = await generatePrResult(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DeepSeekConfigurationError) {
      console.error("[api/generate] configuration:", error.message);
      return jsonError(500, error.message);
    }
    if (error instanceof DeepSeekUpstreamError) {
      console.error("[api/generate] upstream:", error.message);
      return jsonError(502, error.message);
    }
    console.error("[api/generate] unexpected:", error);
    return jsonError(500, "Unexpected server error.");
  }
}

function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "local";
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}