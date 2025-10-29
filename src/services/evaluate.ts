import { getDb } from "@/lib/db";
import { evaluateEntry } from "@/lib/agents";
import { ObjectId } from "mongodb";

export async function evaluateImageById(imageId: string, rootDir = process.cwd()) {
  const db = await getDb();
  const objId = new ObjectId(imageId);
  const img = await db.collection("images").findOne({ _id: objId });
  if (!img) return { ok: false as const, error: "not_found" };

  const res = await evaluateEntry(rootDir, img.imagePath, img.mediaType as any, img.prompt, (img as any).brandName || "");
  const doc = { imageId: String(img._id), ...res, createdAt: new Date().toISOString() };
  await db.collection("evaluations").insertOne(doc);
  return { ok: true as const, evaluation: doc };
}
