import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || "admin_eval_db");
  await db.collection("images").createIndex({ timeStamp: -1 });
  await db.collection("evaluations").createIndex({ imageId: 1, createdAt: -1 });
  await db.collection("users").createIndex({ userId: 1 }, { unique: true });
  await db.collection("brands").createIndex({ brandId: 1 }, { unique: true });
  return db;
}
