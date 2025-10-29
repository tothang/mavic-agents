import { getDb } from "@/lib/db";

export async function listImages(params: { sortBy?: "time"|"score"; channel?: string | undefined; }) {
  const db = await getDb();
  const { sortBy = "time", channel } = params;
  const pipeline: any[] = [];
  if (channel) pipeline.push({ $match: { channel } });
  pipeline.push(
    { $sort: { timeStamp: -1 } },
    { $lookup: { from: "users", localField: "userId", foreignField: "userId", as: "userDoc" } },
    { $addFields: { userName: { $getField: { field: "userName", input: { $first: "$userDoc" } } } } },
    { $lookup: { from: "brands", localField: "brandId", foreignField: "brandId", as: "brandDoc" } },
    { $addFields: { brandName: { $getField: { field: "brandName", input: { $first: "$brandDoc" } } } } },
    { $lookup: {
        from: "evaluations",
        let: { imgId: { $toString: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$imageId", "$$imgId"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 }
        ],
        as: "latestEval"
      }
    },
    { $addFields: { latestEval: { $arrayElemAt: ["$latestEval", 0] } } }
  );
  const docs = await db.collection("images").aggregate(pipeline).toArray();
  if (sortBy === "score") {
    docs.sort((a: any, b: any) => (b.latestEval?.endScore || -1) - (a.latestEval?.endScore || -1));
  }
  return docs;
}
