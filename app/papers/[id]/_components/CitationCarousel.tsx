"use client";

import PaperMiniCard from "@/app/components/PaperMiniCard";
import type { CitationPaper } from "@/lib/mock/analysis";

interface Props {
  title: string;
  papers: CitationPaper[];
}

export default function CitationCarousel({ title, papers }: Props) {
  if (papers.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-bold text-text-primary mb-3">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {papers.map((paper) => (
          <div key={paper.id} className="snap-start">
            <PaperMiniCard
              id={paper.id}
              title={paper.title}
              year={paper.year}
              citations={paper.citations}
              fields={paper.fields}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
