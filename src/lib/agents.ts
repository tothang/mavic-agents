import { promises as fs } from "fs";
import path from "path";
import sizeOf from "image-size";

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(fallback); });
  });
}

export async function agentSizeCompliance(absPath: string, mediaType: "image"|"video"): Promise<number> {
  if (mediaType !== "image") return 50;
  try {
    const dim = sizeOf(absPath);
    if (!dim.width || !dim.height) return 50;
    const targetW = 1024; const targetH = 1024;
    const wScore = 100 - Math.min(100, Math.abs(dim.width - targetW) / targetW * 100);
    const hScore = 100 - Math.min(100, Math.abs(dim.height - targetH) / targetH * 100);
    return clamp((wScore + hScore) / 2);
  } catch { return 50; }
}

export async function agentSubjectAdherence(prompt: string, brandName: string): Promise<number> {
  const words = prompt.toLowerCase().match(/[a-z]{4,}/g) || [];
  const unique = Array.from(new Set(words));
  const base = Math.min(8, unique.length);
  let score = base * 10;
  const name = (brandName || "").toLowerCase();
  const hits = unique.filter(w => name.includes(w)).length;
  score += hits * 5;
  return clamp(score);
}

export async function agentCreativity(prompt: string): Promise<number> {
  const len = prompt.length;
  const commas = (prompt.match(/,/g) || []).length;
  const adj = (prompt.match(/\b(beautiful|dramatic|hyperrealistic|soft|detailed|colorful)\b/gi) || []).length;
  const score = clamp((Math.min(200, len) / 2) * 0.4 + commas * 10 + adj * 12);
  return score;
}

export async function agentMoodConsistency(prompt: string): Promise<number> {
  const moodWords = ["happy","sad","dramatic","hopeful","serene","moody","vintage","futuristic"];
  const count = moodWords.filter(w => prompt.toLowerCase().includes(w)).length;
  return clamp(40 + count * 15);
}

export async function aggregateScores(parts: {size: number; subject: number; creativity: number; mood: number;}): Promise<number> {
  return clamp(Math.round(parts.size * 0.25 + parts.subject * 0.35 + parts.creativity * 0.2 + parts.mood * 0.2));
}

export async function evaluateEntry(rootDir: string, relPath: string, mediaType: "image"|"video", prompt: string, brandName = "") {
  const abs = path.join(rootDir, relPath);
  const [size, subject, creativity, mood] = await Promise.all([
    withTimeout(agentSizeCompliance(abs, mediaType), 2000, 50),
    withTimeout(agentSubjectAdherence(prompt, brandName), 1500, 50),
    withTimeout(agentCreativity(prompt), 800, 50),
    withTimeout(agentMoodConsistency(prompt), 800, 50)
  ]);
  const endScore = await aggregateScores({ size, subject, creativity, mood });
  return { sizeCompliance: size, subjectAdherence: subject, creativity, moodConsistency: mood, endScore };
}
