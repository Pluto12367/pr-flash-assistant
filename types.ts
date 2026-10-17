export type OutputLanguage = "zh-CN" | "en-US";
export type CommitStyle = "conventional" | "plain";
export type OutputMode = "both" | "commit" | "pr";

export interface GenerateRequest {
  source: string;
  context?: string;
  language: OutputLanguage;
  commitStyle: CommitStyle;
  outputMode: OutputMode;
  includeRisks: boolean;
}

export interface GenerateResult {
  prTitle: string;
  prBody: string;
  commitMessage: string;
  summary: string;
  risks: string[];
  demo: boolean;
}