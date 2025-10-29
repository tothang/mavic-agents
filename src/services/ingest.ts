import { getDb } from "@/lib/db";
import { mediaTypeFromPath } from "@/lib/utils";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

export async function ingestAll(root = process.cwd()) {
  const db = await getDb();
  const promptsCsv = path.join(root, "Test-repo-data-assignment - prompts.csv");
  if (!fs.existsSync(promptsCsv)) return { ok: false, error: "csv_not_found" } as const;

  // Build lookup maps from CSVs
  const usersCsv = path.join(root, "Test-repo-data-assignment - users.csv");
  const brandsCsv = path.join(root, "Test-repo-data-assignment - brands.csv");
  const userNameById = new Map<string, string>();
  const brandNameById = new Map<string, string>();

  if (fs.existsSync(usersCsv)) {
    const uContent = fs.readFileSync(usersCsv, "utf8");
    const uRows: any[] = parse(uContent, { columns: true, skip_empty_lines: true, relax_column_count: true });
    for (const ur of uRows) {
      const id = (ur.userId || "").trim();
      const name = (ur.userName || "").trim();
      if (!id) continue;
      if (name) userNameById.set(id, name);
      await db.collection("users").updateOne(
        { userId: id },
        { $set: { userId: id, userName: name || undefined, userRole: (ur.userRole || "").trim() || undefined } },
        { upsert: true }
      );
    }
  }

  if (fs.existsSync(brandsCsv)) {
    const bContent = fs.readFileSync(brandsCsv, "utf8");
    const bRows: any[] = parse(bContent, { columns: true, skip_empty_lines: true, relax_column_count: true });
    for (const br of bRows) {
      const id = (br.brandId || "").trim();
      const name = ((br["brandName "] ?? br.brandName ?? "") as string).trim();
      if (!id) continue;
      if (name) brandNameById.set(id, name);
      await db.collection("brands").updateOne(
        { brandId: id },
        { $set: {
            brandId: id,
            brandName: name || undefined,
            brandDescription: (br.brandDescription || "").toString(),
            style: (br.style || "").toString(),
            brandVision: (br.brandVision || "").toString(),
            brandVoice: (br.brandVoice || "").toString(),
            colors: (br.colors || "").toString()
          }
        },
        { upsert: true }
      );
    }
  }

  const content = fs.readFileSync(promptsCsv, "utf8");
  const rows: any[] = parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true });

  let inserted = 0;
  for (const r of rows) {
    const imagePath = r.imagePath?.replace(/^\"|\"$/g, "");
    if (!imagePath) continue;
    const exists = await db.collection("images").findOne({ imagePath });
    const mediaType = mediaTypeFromPath(imagePath);
    let width: number | undefined; let height: number | undefined;
    try {
      if (mediaType === "image") {
        const dim = sizeOf(path.join(root, imagePath));
        width = dim.width; height = dim.height;
      }
    } catch {}

    const userId = (r.userId || "").trim();
    const brandId = (r.brandId || "").trim();
    const userName = userId ? userNameById.get(userId) : undefined;
    const brandName = brandId ? brandNameById.get(brandId) : undefined;

    if (exists) {
      const update: any = { mediaType, width, height };
      if (userName) update.userName = userName;
      if (brandName) update.brandName = brandName;
      await db.collection("images").updateOne({ _id: exists._id }, { $set: update });
      continue;
    }

    await db.collection("images").insertOne({
      imagePath,
      prompt: r.prompt || "",
      model: (r["LLM_Model"] || r.LLM_Model || r.model || "").trim(),
      channel: r.channel || "",
      userId,
      userName,
      brandId,
      brandName,
      timeStamp: r.timeStamp || new Date().toISOString(),
      mediaType,
      width,
      height
    });
    inserted++;
  }
  return { ok: true as const, inserted };
}
