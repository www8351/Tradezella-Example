"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import type { Tables } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatSignedCurrency,
  formatDate,
  formatNumber,
  formatR,
  pnlColor,
} from "@/lib/format";

type Trade = Tables<"trades">;

export function TradeTable({
  trades,
  currency,
}: {
  trades: Trade[];
  currency: string;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "opened_at", desc: true },
  ]);

  const columns: ColumnDef<Trade>[] = [
    {
      accessorKey: "symbol",
      header: "Symbol",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.symbol}</span>
      ),
    },
    {
      accessorKey: "direction",
      header: "Side",
      cell: ({ row }) => (
        <Badge variant={row.original.direction === "long" ? "success" : "danger"}>
          {row.original.direction}
        </Badge>
      ),
    },
    {
      accessorKey: "opened_at",
      header: "Opened",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.opened_at)}
        </span>
      ),
    },
    {
      accessorKey: "qty_opened",
      header: "Qty",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatNumber(row.original.qty_opened, 2)}
        </span>
      ),
    },
    {
      id: "net_pnl",
      accessorFn: (r) => r.net_pnl ?? undefined,
      sortUndefined: "last",
      header: "Net P&L",
      cell: ({ row }) =>
        row.original.status === "open" ? (
          <Badge variant="outline">Open</Badge>
        ) : (
          <span className={cn("font-medium tabular-nums", pnlColor(row.original.net_pnl))}>
            {row.original.net_pnl !== null
              ? formatSignedCurrency(row.original.net_pnl, currency)
              : "—"}
          </span>
        ),
    },
    {
      id: "r_multiple",
      accessorFn: (r) => r.r_multiple ?? undefined,
      sortUndefined: "last",
      header: "R",
      cell: ({ row }) => (
        <span className={cn("tabular-nums", pnlColor(row.original.r_multiple))}>
          {formatR(row.original.r_multiple)}
        </span>
      ),
    },
  ];

  // TanStack Table owns its state internally; React Compiler can't memoize it,
  // which is expected and safe here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: trades,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No trades match these filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-muted-foreground"
                  >
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sorted === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : sorted === "desc" ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => router.push(`/trades/${row.original.id}`)}
              className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
