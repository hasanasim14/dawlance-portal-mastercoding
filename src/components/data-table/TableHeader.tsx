"use client";

import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnConfig } from "@/lib/types";

interface DataTableHeaderProps {
  parent: string;
  columns: readonly ColumnConfig[];
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onSelectAll: (checked: boolean) => void;
}

export function DataTableHeader({
  parent,
  columns,
  isAllSelected,
  isIndeterminate,
  onSelectAll,
}: DataTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow className="sticky top-0 bg-background z-10 border-b">
        <TableHead
          className="w-12 sticky left-0 bg-background z-20 before:absolute before:inset-0 before:bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
          style={{ position: "sticky", left: 0 }}
        >
          <Checkbox
            disabled={parent === "User"}
            checked={isAllSelected}
            onCheckedChange={onSelectAll}
            aria-label="Select all rows"
            className={
              isIndeterminate
                ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground opacity-50"
                : ""
            }
          />
        </TableHead>
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className="select-none min-w-[150px] bg-background"
          >
            <div className="flex items-center gap-2">{column.label}</div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
