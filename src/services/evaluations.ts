import { getDb } from "@/lib/db";

export async function deleteAllEvaluations() {
  const db = await getDb();
  const result = await db.collection("evaluations").deleteMany({});
  return { deletedCount: result.deletedCount ?? 0 };
}
