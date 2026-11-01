import { describe, it, expect } from "vitest";
import { parseAssistantOutput } from "../lib/parse";

const validPayload = {
  prTitle: "feat(app): add PR assistant workflow",
  prBody: "## What changed\n\n- Added a change-input workflow.",
  commitMessage: "feat(app): add change summary workflow",
  summary: "Turns a diff into ready-to-use commit and PR content.",
  risks: ["No tests added yet."]
};

describe("parseAssistantOutput", () => {
  it("parses a fenced JSON code block", () => {
    const raw = "```json\n" + JSON.stringify(validPayload) + "\n```";
    const result = parseAssistantOutput(raw);
    expect(result.prTitle).toBe(validPayload.prTitle);
    expect(result.risks).toEqual(validPayload.risks);
  });

  it("parses a bare JSON object with surrounding prose", () => {
    const raw = "Here is your result:\n" + JSON.stringify(validPayload);
    const result = parseAssistantOutput(raw);
    expect(result.commitMessage).toBe(validPayload.commitMessage);
  });

  it("rejects an empty response", () => {
    expect(() => parseAssistantOutput("   ")).toThrow(/empty response/);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseAssistantOutput("{ not json")).toThrow(/not valid JSON/);
  });

  it("rejects a response missing required fields", () => {
    expect(() =>
      parseAssistantOutput(JSON.stringify({ prTitle: "only a title" }))
    ).toThrow(/expected structure/);
  });

  it("rejects an over-long prTitle", () => {
    const bad = { ...validPayload, prTitle: "x".repeat(201) };
    expect(() => parseAssistantOutput(JSON.stringify(bad))).toThrow(
      /expected structure/
    );
  });

  it("rejects more than 8 risks", () => {
    const bad = { ...validPayload, risks: Array(9).fill("risk") };
    expect(() => parseAssistantOutput(JSON.stringify(bad))).toThrow(
      /expected structure/
    );
  });
});
