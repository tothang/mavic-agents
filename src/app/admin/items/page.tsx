"use client";
import { useEffect, useMemo, useState } from "react";
import { apiEvaluate, apiIngest, apiListImages, apiClearEvaluations } from "@/services/api";
import ScoreBadge from "@/components/ScoreBadge";
import Badge from "@/components/Badge";
import type { Item } from "@/types";

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"time" | "score">("time");
  const [channel, setChannel] = useState<string>("");
  const [ingesting, setIngesting] = useState(false);

  async function load() {
    setLoading(true);
    const data = await apiListImages({ sortBy, channel: channel || undefined });
    setItems(data.items || data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [sortBy, channel]);

  async function refresh() {
    setLoading(true);
    try {
      await apiClearEvaluations();
    } catch {
      // ignore deletion errors, still reload
    }
    await load();
  }

  async function evaluate(id: string) {
    const prev = items.slice();
    setItems((s: Item[]) =>
      s.map((it: Item) =>
        it._id === id
          ? { ...it, latestEval: { ...(it.latestEval || {}), endScore: -1 } }
          : it
      )
    );
    try {
      const data = await apiEvaluate(id);
      setItems((s: Item[]) =>
        s.map((it: Item) =>
          it._id === id ? { ...it, latestEval: data.evaluation || data } : it
        )
      );
    } catch {
      setItems(prev);
      alert("Evaluation failed");
    }
  }

  async function ingest() {
    setIngesting(true);
    let ok = true;
    try {
      await apiIngest();
    } catch {
      ok = false;
    }
    setIngesting(false);
    if (ok) load();
    else alert("Ingestion failed");
  }

  const channels = useMemo(
    () => Array.from(new Set(items.map((i) => i.channel).filter(Boolean))),
    [items]
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Items</h1>
        <div className="flex items-center gap-2">
          <button
            className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-md px-3 py-2 disabled:opacity-50"
            disabled={ingesting}
            onClick={ingest}
          >
            {ingesting ? "Ingesting..." : "Ingest CSV"}
          </button>
          <button
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-md px-3 py-2 disabled:opacity-50"
            disabled={loading}
            onClick={refresh}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-slate-300 text-sm">Sort by</label>
          <select
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="time">Newest</option>
            <option value="score">Score</option>
          </select>
          <label className="text-slate-300 text-sm">Channel</label>
          <select
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">All</option>
            {channels.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item._id}
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500 transition"
          >
            <div>
              {item.mediaType === "image" ? (
                <img
                  src={`/api/media?path=${encodeURIComponent(item.imagePath)}`}
                  alt="preview"
                  className="w-full h-[220px] object-cover rounded-md border border-slate-700 mb-3"
                />
              ) : (
                <video
                  src={`/api/media?path=${encodeURIComponent(item.imagePath)}`}
                  controls
                  className="w-full h-[220px] object-cover rounded-md border border-slate-700 mb-3"
                />
              )}

              <div className="text-slate-400 text-sm mb-1">Prompt</div>
              <div
                className="text-slate-100 text-sm line-clamp-3 cursor-help"
                title={item.prompt}
              >
                {item.prompt}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge label={`Model: ${item.model}`} />
                <Badge label={`Channel: ${item.channel}`} />
                <Badge label={`User: ${item.userName || item.userId.slice(0, 8)}`} />
                <Badge label={`Brand: ${item.brandName || item.brandId.slice(0, 8)}`} />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <ScoreBadge label="Size" value={item.latestEval?.sizeCompliance} />
                <ScoreBadge label="Subject" value={item.latestEval?.subjectAdherence} />
                <ScoreBadge label="Creativity" value={item.latestEval?.creativity} />
                <ScoreBadge label="Mood" value={item.latestEval?.moodConsistency} />
                <ScoreBadge
                  label="Total"
                  value={item.latestEval?.endScore}
                  highlight
                />
              </div>

              <div className="flex justify-end mt-3">
                <button
                  className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-md px-3 py-2 text-sm"
                  onClick={() => evaluate(item._id)}
                >
                  Evaluate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}