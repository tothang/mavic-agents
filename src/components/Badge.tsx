export default function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 px-2 py-1 text-xs">
      {label}
    </span>
  );
}
