import type { GenerateRequest, GenerateResult } from "@/types";
import { buildUserPrompt, systemPrompt } from "@/lib/prompt";
import { parseAssistantOutput } from "@/lib/parse";

const DEEPSEEK_BASE_URL = (
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
).replace(/\/+$/, "");
const DEFAULT_MODEL = "deepseek-flash";
const REQUEST_TIMEOUT_MS = 60_000;

export class DeepSeekConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekConfigurationError";
  }
}

export class DeepSeekUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekUpstreamError";
  }
}

export async function generatePrResult(
  request: GenerateRequest
): Promise<GenerateResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey && demoModeEnabled()) {
    return { ...makeDemoOutput(request), demo: true };
  }

  if (!apiKey) {
    throw new DeepSeekConfigurationError(
      "DEEPSEEK_API_KEY is not configured. Add it to the server environment and restart."
    );
  }

  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserPrompt(request) }
        ],
        temperature: 0.4,
        max_tokens: 1800,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new DeepSeekUpstreamError(
      error instanceof Error && error.name === "TimeoutError"
        ? "DeepSeek request timed out. Try a smaller diff or try again."
        : "Could not reach the DeepSeek API. Check network access and the server URL."
    );
  }

  if (!response.ok) {
    await response.text().catch(() => "");
    throw new DeepSeekUpstreamError(
      `DeepSeek API returned ${response.status}; check the model name and API key.`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new DeepSeekUpstreamError("DeepSeek returned an empty completion.");
  }

  const parsed = parseAssistantOutput(content);
  return { ...parsed, demo: false };
}

function demoModeEnabled(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function makeDemoOutput(request: GenerateRequest): Omit<GenerateResult, "demo"> {
  const isChinese = request.language === "zh-CN";
  const scope = request.commitStyle === "conventional" ? "feat(app): " : "";
  return {
    prTitle: isChinese ? "新增 PR 助手工作流" : "Add PR assistant workflow",
    commitMessage: `${scope}${isChinese ? "新增变更摘要工作流" : "add change summary workflow"}`,
    prBody: isChinese
      ? [
          "## 变更内容",
          "",
          "- 提供变更输入与可配置的输出偏好。",
          "- 将结果整理为提交信息、PR 标题和风险清单。",
          "",
          "## 原因",
          "",
          "- 减少手动整理变更说明的时间，并让审查者更快理解影响范围。",
          "",
          "## 验证计划",
          "",
          "- 使用当前变更运行生成，并逐项检查提交格式与风险清单。"
        ].join("\n")
      : [
          "## What changed",
          "",
          "- Added a change-input workflow with configurable output preferences.",
          "- Organized the result into a commit message, PR title, and risk list.",
          "",
          "## Why",
          "",
          "- Reduce time spent formatting change notes and help reviewers understand impact faster.",
          "",
          "## Test plan",
          "",
          "- Run generation against the current diff and verify the commit format and risk list."
        ].join("\n"),
    summary: isChinese
      ? "提供一个轻量的变更说明工作流，把 diff 整理成可直接使用的提交与 PR 内容。"
      : "Provides a lightweight change-note workflow that turns a diff into ready-to-use commit and PR content.",
    risks: [
      isChinese
        ? "当前为本地示例响应，设置 DEEPSEEK_API_KEY 后会调用真实模型。"
        : "This is a local sample response; set DEEPSEEK_API_KEY to call the real model."
    ]
  };
}