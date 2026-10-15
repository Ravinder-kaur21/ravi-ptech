// shadcn/ui DataTable — wrapper around @tanstack/react-table v9.
//
// Usage in a client component:
//   import { useDataTable } from "@/components/ui/data-table"
//   import { createColumnHelper } from "@tanstack/react-table"
//
//   const columnHelper = createColumnHelper<YourRow>()
//   const columns = [
//     columnHelper.accessor("name", { header: "Name" }),
//   ]
//   const table = useDataTable({ columns, data })
//   // then: table.getCoreRowModel()... in JSX with <Table>, etc.

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type ColumnVisibilityState,
  type RowSelectionState,
  useTable,
  tableFeatures,
  createSortedRowModel,
} from "@tanstack/react-table"

export type { ColumnDef }

export interface DataTableOptions<TData extends Record<string, any>> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  enableSorting?: boolean
  enableHiding?: boolean
  enableFiltering?: boolean
}

/**
 * useDataTable — creates a TanStack Table v9 instance.
 * Call inside a React component (uses hooks for state).
 *
 * Returns a Table instance with sorting, column visibility, and row
 * selection enabled by default. Disable individually via opts.
 */
export function useDataTable<TData extends Record<string, any>>(
  opts: DataTableOptions<TData>,
): any {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const enableSorting = opts.enableSorting ?? true
  const enableHiding = opts.enableHiding ?? false

  const features = React.useMemo(
    () =>
      tableFeatures({
        columns: {
          sorting: enableSorting,
          visibility: enableHiding,
          selection: true,
        },
        rows: {
          sorting: enableSorting,
        },
        rowModels: {
          sorted: enableSorting ? createSortedRowModel() : undefined,
        },
      } as any),
    [enableSorting, enableHiding],
  )

  const table = useTable(
    {
      features,
      columns: opts.columns,
      data: opts.data,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
      },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
    } as any,
    (state: any) => ({
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      columnVisibility: state.columnVisibility,
      rowSelection: state.rowSelection,
    }),
  )

  return table
}
