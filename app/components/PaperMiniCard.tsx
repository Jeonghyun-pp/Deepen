"use client";

import Link from "next/link";

interface Props {
  id: string;
  title: string;
  year: number;
  citations: number;
  fields: string[];
}

function formatCitations(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

export default function PaperMiniCard({ id, title, year, citations, fields }: Props) {
  return (
    <Link
      href={`/papers/${id}`}
      className="flex flex-col gap-2 min-w-[200px] max-w-[240px] p-4 rounded-xl border border-border bg-white hover:border-coral/40 hover:shadow-md transition-all shrink-0"
    >
      <h4 className="text-xs font-bold text-text-primary leading-snug line-clamp-2">
        {title}
      </h4>
      <div className="flex items-center gap-2 text-[10px] text-text-muted">
        <span>{year}</span>
        <span>·</span>
        <span>{formatCitations(citations)} citations</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {fields.slice(0, 2).map((field) => (
          <span
            key={field}
            className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-coral-light text-coral"
          >
            {field}
          </span>
        ))}
      </div>
    </Link>
  );
}
