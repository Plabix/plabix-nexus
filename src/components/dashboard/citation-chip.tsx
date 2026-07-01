"use client";

import { FileText } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Citation } from "@/types/database";

export function CitationChip({ number, citation }: { number: number; citation?: Citation }) {
  if (!citation) {
    return (
      <sup className="ml-0.5 inline-flex size-4 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold text-muted-foreground">
        {number}
      </sup>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-0.5 inline-flex size-4 items-center justify-center rounded-sm bg-accent text-[10px] font-semibold text-accent-foreground transition-transform hover:scale-110"
          aria-label={`Source ${number}: ${citation.documentTitle}`}
        >
          {number}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{citation.documentTitle}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{citation.snippet}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
