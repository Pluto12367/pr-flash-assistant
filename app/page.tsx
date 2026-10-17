"use client";

import { useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  BookOpenText,
  Check,
  Clipboard,
  FileDiff,
  GitCommitHorizontal,
  GitPullRequest,
  ListChecks,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send
} from "lucide-react";
import type {
  CommitStyle,
  GenerateResult,
  OutputLanguage,
  OutputMode
} from "@/types";
import "./page.css";

const SAMPLE_DIFF = `diff --git a/app/api/generate/route.ts b/app/api/generate/route.ts
new file mode 100644
index 0000000..6df7d9a
--- /dev/null
+++ b/app/api/generate/route.ts
@@ -0,0 +1,40 @@
+import { z } from "zod";
+
+const schema = z.object({
+  source: z.string().min(20).max(50_000),
+  context: z.string().max(5_000).optional()
+});
+
+export async function POST(request: Request) {
+  const body = await request.json();
+  const parsed = schema.safeParse(body);
+  if (!parsed.success) {
+    return Response.json({ error: "Invalid request" }, { status: 400 });
+  }
+  return Response.json({ ok: true, length: parsed.data.source.length });
+}`;

export default function Home() {
  const [source, setSource] = useState(SAMPLE_DIFF);
  const [context, setContext] = useState("");
  const [language, setLanguage] = useState<OutputLanguage>("zh-CN");
  const [commitStyle, setCommitStyle] = useState<CommitStyle>("conventional");
  const [outputMode, setOutputMode] = useState<OutputMode>("both");
  const [includeRisks, setIncludeRisks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          context,
          language,
          commitStyle,
          outputMode,
          includeRisks
        })
      });
      const data = (await response.json()) as GenerateResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status}).`);
      }

      setResult(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Request failed unexpectedly."
      );
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setSource(SAMPLE_DIFF);
    setResult(null);
    setError(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <GitPullRequest size={19} strokeWidth={2.2} />
          </span>
          <span className="brand-name">PR Flash</span>
          <span className="brand-tag">DeepSeek flash</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="quiet-button" onClick={loadSample}>
            <RotateCcw size={16} />
            示例
          </button>
          <span className="chars">
            {source.length.toLocaleString()} / 50,000
          </span>
        </div>
      </header>

      <div className="workspace">
        <section className="panel input-panel" aria-label="Change input">
          <div className="panel-heading">
            <h1>
              <FileDiff size={18} />
              变更来源
            </h1>
          </div>

          <label className="field-label" htmlFor="source">
            Diff / 提交信息
          </label>
          <textarea
            id="source"
            className="mono-input source-input"
            value={source}
            maxLength={50000}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
          />

          <div className="option-row">
            <LabeledSelect
              label="输出语言"
              value={language}
              onChange={(value) => setLanguage(value as OutputLanguage)}
              options={[
                { value: "zh-CN", label: "中文" },
                { value: "en-US", label: "English" }
              ]}
            />
            <LabeledSelect
              label="提交格式"
              value={commitStyle}
              onChange={(value) => setCommitStyle(value as CommitStyle)}
              options={[
                { value: "conventional", label: "Conventional" },
                { value: "plain", label: "Plain" }
              ]}
            />
          </div>

          <div className="option-row option-row--mode">
            <span className="option-label">输出</span>
            <div className="segmented" role="group" aria-label="输出范围">
              <button
                type="button"
                className={outputMode === "both" ? "active" : ""}
                onClick={() => setOutputMode("both")}
              >
                完整
              </button>
              <button
                type="button"
                className={outputMode === "commit" ? "active" : ""}
                onClick={() => setOutputMode("commit")}
              >
                提交
              </button>
              <button
                type="button"
                className={outputMode === "pr" ? "active" : ""}
                onClick={() => setOutputMode("pr")}
              >
                PR
              </button>
            </div>
          </div>

          <label className="field-label" htmlFor="context">
            上下文
          </label>
          <textarea
            id="context"
            className="context-input"
            value={context}
            maxLength={5000}
            placeholder="验收标准、改动目标、关联 issue"
            onChange={(event) => setContext(event.target.value)}
          />

          <label className="check-row">
            <input
              type="checkbox"
              checked={includeRisks}
              onChange={(event) => setIncludeRisks(event.target.checked)}
            />
            <span>风险清单</span>
          </label>

          <button
            type="button"
            className="primary-button"
            onClick={generate}
            disabled={loading}
          >
            {loading ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
            生成
          </button>
        </section>

        <section className="panel output-panel" aria-label="Generated result">
          <div className="panel-heading">
            <h2>
              <BookOpenText size={18} />
              结果
            </h2>
            {result && !loading && (
              <span
                className={result.demo ? "demo-badge" : "ready-badge"}
              >
                {result.demo ? "DEMO" : "READY"}
              </span>
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <Loader2 className="spin" size={22} />
              <span>生成中</span>
            </div>
          )}

          {!loading && result && (
            <div className="result-list">
              <ResultItem
                id="title"
                label="PR 标题"
                icon={<GitPullRequest size={16} />}
                value={result.prTitle}
                variant="title"
                copiedKey={copiedKey}
                onCopy={copyWithFeedback}
              />
              <ResultItem
                id="commit"
                label="提交信息"
                icon={<GitCommitHorizontal size={16} />}
                value={result.commitMessage}
                variant="code"
                copiedKey={copiedKey}
                onCopy={copyWithFeedback}
              />
              <ResultItem
                id="body"
                label="PR 描述"
                icon={<MessageSquareText size={16} />}
                value={result.prBody}
                variant="markdown"
                copiedKey={copiedKey}
                onCopy={copyWithFeedback}
              />
              <ResultItem
                id="summary"
                label="摘要"
                icon={<ListChecks size={16} />}
                value={result.summary}
                variant="plain"
                copiedKey={copiedKey}
                onCopy={copyWithFeedback}
              />
              {result.risks.length > 0 && (
                <ResultItem
                  id="risks"
                  label="风险"
                  icon={<AlertTriangle size={16} />}
                  value={result.risks.join("\n")}
                  variant="risks"
                  copiedKey={copiedKey}
                  onCopy={copyWithFeedback}
                />
              )}
            </div>
          )}

          {!loading && !result && !error && (
            <div className="empty-state">
              <MessageSquareText size={22} />
              <span>等待输入</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );

  async function copyWithFeedback(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      setCopiedKey(null);
    }
  }
}

function LabeledSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultItem({
  id,
  label,
  icon,
  value,
  variant,
  copiedKey,
  onCopy
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  variant: "title" | "code" | "markdown" | "plain" | "risks";
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const isCopied = copiedKey === id;

  return (
    <div className="result-item">
      <div className="result-head">
        <span className="result-label">
          {icon}
          {label}
        </span>
        <button
          type="button"
          className="copy-button"
          onClick={() => onCopy(id, value)}
          aria-label={`复制${label}`}
        >
          {isCopied ? <Check size={15} /> : <Clipboard size={15} />}
          {isCopied ? "已复制" : "复制"}
        </button>
      </div>
      {variant === "markdown" ? (
        <div className="markdown-body">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noreferrer">
                  {children}
                </a>
              )
            }}
          >
            {value}
          </Markdown>
        </div>
      ) : variant === "risks" ? (
        <ul className="risk-list">
          {value.split("\n").map((risk, index) => (
            <li key={`${index}-${risk}`}>{risk}</li>
          ))}
        </ul>
      ) : variant === "code" ? (
        <pre className="code-output">{value}</pre>
      ) : variant === "title" ? (
        <div className="title-output">{value}</div>
      ) : (
        <p className="plain-output">{value}</p>
      )}
    </div>
  );
}