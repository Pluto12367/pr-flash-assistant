import { z } from "zod";

const assistantOutputSchema = z.object({
  prTitle: z.string().min(1).max(200),
  prBody: z.string().min(1).max(12000),
  commitMessage: z.string().min(1).max(500),
  summary: z.string().min(1).max(800),
  risks: z.array(z.string().min(1).max(500)).max(8)
});

export type ParsedAssistantOutput = z.infer<typeof assistantOutputSchema>;

export function parseAssistantOutput(raw: string): ParsedAssistantOutput {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("The model returned an empty response.");
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : extractJsonObject(trimmed);

  let data: unknown;
  try {
    data = JSON.parse(candidate);
  } catch {
    throw new Error("The model response was not valid JSON.");
  }

  const result = assistantOutputSchema.safeParse(data);
  if (!result.success) {
    throw new Error("The model response did not match the expected structure.");
  }

  return result.data;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("The model response did not contain a JSON object.");
  }
  return text.slice(start, end + 1);
}