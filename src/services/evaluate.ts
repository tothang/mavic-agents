import { getDb } from "@/lib/db";
import { evaluateEntry } from "@/lib/agents";
import { ObjectId } from "mongodb";

export async function evaluateImageById(imageId: string, rootDir = process.cwd()) {
  const db = await getDb();
  const objId = new ObjectId(imageId);
  const img = await db.collection("images").findOne({ _id: objId });
  if (!img) return { ok: false as const, error: "not_found" };

  const brandDoc = await db.collection("brands").findOne({ brandId: (img as any).brandId });
  const brand = brandDoc ? {
    brandName: (brandDoc as any).brandName || undefined,
    brandDescription: (brandDoc as any).brandDescription || undefined,
    brandVision: (brandDoc as any).brandVision || undefined,
    brandVoice: (brandDoc as any).brandVoice || undefined,
    colors: (brandDoc as any).colors || undefined,
    style: (brandDoc as any).style || undefined,
  } : {};

  const res = await evaluateEntry(rootDir, (img as any).imagePath, (img as any).mediaType as any, (img as any).prompt, brand as any);
  const doc = { imageId: String(img._id), ...res, createdAt: new Date().toISOString() };
  await db.collection("evaluations").insertOne(doc);
  return { ok: true as const, evaluation: doc };
}
