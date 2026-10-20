"use client";

/**
 * DataTable — sortable, paginated table for large markdown tables (>5 rows).
 * Falls back to standard Markdown for small tables.
 */

import { useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  headers: string[];
  rows: string[][];
  className?: string;
}

const PAGE_SIZE = 20;

export function DataTable({ headers, rows, className }: DataTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const sorted =
    sortCol !== null
      ? [...rows].sort((a, b) => {
          const av = a[sortCol] ?? "";
          const bv = b[sortCol] ?? "";
          const an = parseFloat(av);
          const bn = parseFloat(bv);
          if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an;
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        })
      : rows;

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(col: number) {
    if (sortCol === col) {
      setSortAsc((v) => !v);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-brand-rule/60", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-brand-rule/50 bg-brand-cream-soft">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-brand-muted">
                  <button
                    type="button"
                    onClick={() => toggleSort(i)}
                    className="inline-flex items-center gap-1 hover:text-brand-ink"
                  >
                    {h}
                    <ArrowUpDown
                      className={cn(
                        "size-3",
                        sortCol === i ? "text-brand-ink" : "text-brand-muted-soft/60",
                      )}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-brand-rule/30 last:border-0 hover:bg-brand-cream-soft/60"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="whitespace-nowrap px-3 py-1.5 text-brand-ink/90"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-brand-rule/50 bg-brand-cream-soft/60 px-3 py-1.5 text-[11px] text-brand-muted">
          <span>{sorted.length} rows</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded p-0.5 hover:bg-brand-cream disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded p-0.5 hover:bg-brand-cream disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function parseMarkdownTable(
  text: string,
): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 3) return null;

  const parseLine = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

  const headers = parseLine(lines[0]);
  if (headers.length < 2) return null;

  const sep = parseLine(lines[1]);
  if (!sep.every((s) => /^[-:]+$/.test(s))) return null;

  const rows = lines.slice(2).map(parseLine);
  return { headers, rows };
}
