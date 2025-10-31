import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

type ScoreResult = { score: number; rationale?: string };

const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const DEFAULT_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";

export async function scoreWithLLM(name: string, criteria: string, input: Record<string, unknown>, options?: { timeoutMs?: number; retries?: number; }): Promise<ScoreResult> {
  const timeoutMs = options?.timeoutMs ?? 1200;
  const retries = options?.retries ?? 1;
  if (!API_KEY) throw new Error("Missing LLM_API_KEY/OPENAI_API_KEY");

  const model = new ChatOpenAI({
    apiKey: API_KEY,
    model: DEFAULT_MODEL,
    temperature: 0,
    maxRetries: retries,
    configuration: { baseURL: DEFAULT_BASE_URL }
  } as any);

  const system = new SystemMessage("You are a strict scorer. Return only a compact JSON with numeric 'score' 0-100 and short 'rationale'.");
  const user = new HumanMessage(JSON.stringify({ task: name, criteria, input }));

  try {
    const invokePromise = model.invoke([system, user], { response_format: { type: "json_object" } } as any);
    const resp = await Promise.race([
      invokePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("llm_timeout")), timeoutMs))
    ] as const) as any;
    const content: any = (resp as any)?.content;
    const text = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("\n").trim()
        : "";
    const parsed = JSON.parse(text || "{}");
    const score = clamp(Number(parsed?.score ?? NaN));
    if (!Number.isFinite(score)) throw new Error("invalid score");
    const rationale = typeof parsed?.rationale === "string" ? parsed.rationale : undefined;
    return { score, rationale };
  } catch (e) {
    throw e instanceof Error ? e : new Error("LLM scoring failed");
  }
}

export async function scoreWithLLMVision(
  name: string,
  criteria: string,
  imageDataUrl: string,
  input: Record<string, unknown> = {},
  options?: { retries?: number; timeoutMs?: number }
): Promise<ScoreResult> {
  const retries = options?.retries ?? 0;
  const timeoutMs = options?.timeoutMs ?? 1000;
  if (!API_KEY) throw new Error("Missing LLM_API_KEY/OPENAI_API_KEY");

  const model = new ChatOpenAI({
    apiKey: API_KEY,
    model: DEFAULT_MODEL,
    temperature: 0,
    maxRetries: retries,
    configuration: { baseURL: DEFAULT_BASE_URL }
  } as any);

  const system = new SystemMessage("You are a strict vision scorer. Return only a compact JSON with numeric 'score' 0-100 and short 'rationale'.");
  const user = new HumanMessage([
    { type: "text", text: JSON.stringify({ task: name, criteria, input }) },
    { type: "image_url", image_url: { url: imageDataUrl } as any }
  ] as any);

  const invokePromise = model.invoke([system, user], { response_format: { type: "json_object" } } as any);
  const resp = await Promise.race([
    invokePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("llm_timeout")), timeoutMs))
  ] as const) as any;
  const content: any = (resp as any)?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("\n").trim()
      : "";
  const parsed = JSON.parse(text || "{}");
  const score = clamp(Number(parsed?.score ?? NaN));
  if (!Number.isFinite(score)) throw new Error("invalid score");
  const rationale = typeof parsed?.rationale === "string" ? parsed.rationale : undefined;
  return { score, rationale };
}
