import { promises as fs } from "fs";
import path from "path";
import sizeOf from "image-size";
import { scoreWithLLM, scoreWithLLMVision } from "./llm";
import type { BrandInfo } from "@/types";

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(fallback); });
  });
}

async function scoreImageWithVision(
  absPath: string,
  task: string,
  criteria: string,
  input: Record<string, unknown> = {},
  options?: { retries?: number; timeoutMs?: number }
) {
  const dim = sizeOf(absPath);
  const buf = await fs.readFile(absPath);
  const mime = `image/${(dim as any).type || "jpeg"}`;
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  return scoreWithLLMVision(task, criteria, dataUrl, input, options);
}

export async function agentSizeCompliance(absPath: string, mediaType: "image"|"video"): Promise<number> {
  if (mediaType === "video") {
    try {
      const res = await scoreWithLLM(
        "size_compliance_video",
        "Given this is a video and the target render frame is 1024x1024, rate how well a typical video asset would fit or be adaptable (cropping/resizing feasibility to square). Return 0-100 only.",
        { mediaType: "video", targetWidth: 1024, targetHeight: 1024 },
        { timeoutMs: 900, retries: 0 }
      );
      return clamp(res.score);
    } catch {
      return 50;
    }
  }
  try {
    const dim = sizeOf(absPath);
    if (!dim.width || !dim.height) return 50;
    const targetW = 1024; const targetH = 1024;
    try {
      const res = await scoreWithLLM(
        "size_compliance",
        "Given actual image width/height and the target size 1024x1024, score how well the image dimensions comply with the target size (cropping/resizing feasibility, closeness). Return 0-100 only.",
        { width: dim.width, height: dim.height, targetWidth: targetW, targetHeight: targetH },
        { timeoutMs: 900, retries: 0 }
      );
      return clamp(res.score);
    } catch {
      const wScore = 100 - Math.min(100, Math.abs(dim.width - targetW) / targetW * 100);
      const hScore = 100 - Math.min(100, Math.abs(dim.height - targetH) / targetH * 100);
      return clamp((wScore + hScore) / 2);
    }
  } catch { return 50; }
}


export async function agentSubjectAdherence(prompt: string, brand: BrandInfo, absPath?: string, mediaType?: "image"|"video"): Promise<number> {
  try {
    if (mediaType === "image" && absPath) {
      try {
        const vis = await scoreImageWithVision(
          absPath,
          "subject_adherence_image",
          "Evaluate how well the image content adheres to the provided brand information and the intended subject described by the prompt. Consider brand name, description, vision, voice, colors, and style. Return 0-100 only.",
          { prompt, brand },
          { retries: 0 }
        );
        return clamp(vis.score);
      } catch {
        // fall through to text LLM below
      }
    }
    const res = await scoreWithLLM(
      "subject_adherence",
      "Rate how well the prompt adheres to the provided brand information and intended subject focus. Consider brand name, description, vision, voice, colors, and style if present. Strictly return 0-100.",
      { prompt, brand },
      { timeoutMs: 12000, retries: 0 }
    );
    return clamp(res.score);
  } catch {
    const words = prompt.toLowerCase().match(/[a-z]{4,}/g) || [];
    const unique = Array.from(new Set(words));
    const base = Math.min(8, unique.length);
    let score = base * 10;
    const name = (brand?.brandName || "").toLowerCase();
    const hits = unique.filter(w => name.includes(w)).length;
    score += hits * 5;
    return clamp(score);
  }
}

export async function agentCreativity(prompt: string, absPath?: string, mediaType?: "image"|"video"): Promise<number> {
  try {
    if (mediaType === "image" && absPath) {
      try {
        const vis = await scoreImageWithVision(
          absPath,
          "creativity_image",
          "Assess the creativity and originality of the visual content relative to the prompt. Consider novelty, composition, and evocative quality. Return 0-100 only.",
          { prompt },
          { retries: 0 }
        );
        return clamp(vis.score);
      } catch {}
    }
    const res = await scoreWithLLM(
      "creativity",
      "Assess the novelty, descriptiveness, and evocative quality of the prompt. Higher score for original, vivid language. 0-100 only.",
      { prompt },
      { timeoutMs: 1200, retries: 0 }
    );
    return clamp(res.score);
  } catch {
    const len = prompt.length;
    const commas = (prompt.match(/,/g) || []).length;
    const adj = (prompt.match(/\b(beautiful|dramatic|hyperrealistic|soft|detailed|colorful)\b/gi) || []).length;
    const score = clamp((Math.min(200, len) / 2) * 0.4 + commas * 10 + adj * 12);
    return score;
  }
}

export async function agentMoodConsistency(prompt: string, absPath?: string, mediaType?: "image"|"video"): Promise<number> {
  try {
    if (mediaType === "image" && absPath) {
      try {
        const vis = await scoreImageWithVision(
          absPath,
          "mood_consistency_image",
          "Evaluate whether the image conveys a clear, consistent mood or style aligned with the prompt. Return 0-100 only.",
          { prompt },
          { retries: 0 }
        );
        return clamp(vis.score);
      } catch {}
    }
    const res = await scoreWithLLM(
      "mood_consistency",
      "Evaluate whether the prompt conveys a clear, consistent mood or style throughout. Return 0-100 only.",
      { prompt },
      { timeoutMs: 1200, retries: 0 }
    );
    return clamp(res.score);
  } catch {
    const moodWords = ["happy","sad","dramatic","hopeful","serene","moody","vintage","futuristic"];
    const count = moodWords.filter(w => prompt.toLowerCase().includes(w)).length;
    return clamp(40 + count * 15);
  }
}

export async function aggregateScores(parts: {size: number; subject: number; creativity: number; mood: number;}): Promise<number> {
  return clamp(Math.round(parts.size * 0.25 + parts.subject * 0.35 + parts.creativity * 0.2 + parts.mood * 0.2));
}

export async function evaluateEntry(rootDir: string, relPath: string, mediaType: "image"|"video", prompt: string, brand: BrandInfo = {}) {
  const abs = path.join(rootDir, relPath);
  const [size, subject, creativity, mood] = await Promise.all([
    withTimeout(agentSizeCompliance(abs, mediaType), 2000, 50),
    withTimeout(agentSubjectAdherence(prompt, brand, abs, mediaType), 12000, 50),
    withTimeout(agentCreativity(prompt, abs, mediaType), 12000, 50),
    withTimeout(agentMoodConsistency(prompt, abs, mediaType), 12000, 50)
  ]);
  const endScore = await aggregateScores({ size, subject, creativity, mood });
  return { sizeCompliance: size, subjectAdherence: subject, creativity, moodConsistency: mood, endScore };
}
