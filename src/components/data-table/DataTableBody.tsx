"use client";

import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnConfig, RowDataType } from "@/lib/types";

interface DataTableBodyProps {
  parent: string;
  selectionValue: keyof RowDataType;
  data: RowDataType[];
  columns: readonly ColumnConfig[];
  selectedRows: RowDataType[];
  selectedRowId: string | number | null;
  onRowSelect: (row: RowDataType, checked: boolean) => void;
  onRowClick: (row: RowDataType) => void;
  loading: boolean;
}

export function DataTableBody({
  parent,
  selectionValue,
  data,
  columns,
  selectedRows,
  selectedRowId,
  onRowSelect,
  onRowClick,
  loading,
}: DataTableBodyProps) {
  if (data.length === 0 && !loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={columns.length + 1} className="text-center py-8">
            <div className="text-muted-foreground">No data found</div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {data.map((row) => {
        const isSelected = selectedRows.some(
          (r) => r[selectionValue] === row[selectionValue]
        );
        const isRowSelected = selectedRowId === row[selectionValue];

        return (
          <TableRow
            key={row[selectionValue]}
            className={`cursor-pointer hover:bg-muted/50 ${
              isRowSelected ? "bg-muted" : ""
            }`}
            onClick={() => {
              if (parent === "User") return;
              onRowClick(row);
            }}
          >
            <TableCell
              onClick={(e) => e.stopPropagation()}
              className="sticky left-0 bg-background z-30 w-12"
            >
              <Checkbox
                disabled={parent === "User"}
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onRowSelect(row, checked as boolean)
                }
                aria-label={`Select row ${row[selectionValue]}`}
                className="mr-2"
              />
            </TableCell>
            {columns.map((column) => {
              const isBranchCell = parent === "User" && column.key === "branch";
              return (
                <TableCell
                  key={column.key}
                  className={`max-w-[400px] ${
                    isBranchCell
                      ? "h-auto whitespace-nowrap overflow-auto"
                      : "truncate"
                  }`}
                >
                  {row[column.key as keyof RowDataType]}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </TableBody>
  );
}
