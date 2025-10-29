export default function ScoreBadge({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
}) {
  const display = value === undefined ? "-" : value === -1 ? "..." : value;
  const base =
    "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium";
  return (
    <span
      className={
        highlight
          ? `${base} border-indigo-500 bg-indigo-600/20 text-indigo-200`
          : `${base} border-slate-700 bg-slate-800 text-slate-200`
      }
    >
      {label}: {display}
    </span>
  );
}
