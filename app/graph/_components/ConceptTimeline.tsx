"use client";

interface TimelineEntry {
  paperId: string;
  paperLabel: string;
  year: number;
  description: string;
}

interface Props {
  entries: TimelineEntry[];
  onPaperClick: (paperId: string) => void;
}

export default function ConceptTimeline({ entries, onPaperClick }: Props) {
  const sorted = [...entries].sort((a, b) => a.year - b.year);

  return (
    <div className="flex flex-col gap-0">
      {sorted.map((entry, i) => (
        <div key={entry.paperId} className="flex gap-3">
          {/* Timeline */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-[color:var(--v2-green-soft)] shrink-0 mt-1.5" />
            {i < sorted.length - 1 && <div className="w-px flex-1 bg-white/10" />}
          </div>

          {/* Content */}
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-white">{entry.year}</span>
              <span className="text-[10px] text-white/50">—</span>
              <button
                onClick={() => onPaperClick(entry.paperId)}
                className="text-xs font-semibold text-[color:var(--v2-green-soft)] hover:underline truncate"
              >
                {entry.paperLabel}
              </button>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
              &ldquo;{entry.description}&rdquo;
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
