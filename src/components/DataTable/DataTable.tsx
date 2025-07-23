"use client";

import type { RowDataType, PaginationData, ColumnConfig } from "@/lib/types";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TableActions } from "./TableActions";
import { DataTableHeader } from "./TableHeader";
import { DataTableBody } from "./DataTableBody";
import { Pagination } from "./Pagination";

interface DataTableProps {
  selectionValue: keyof RowDataType;
  loading: boolean;
  deleting: boolean;
  data: RowDataType[];
  selectedRows: RowDataType[];
  selectedRowId: string | number | null;
  pagination: PaginationData;
  currentPage: number;
  pageSize: number;
  columns: readonly ColumnConfig[];
  onRowSelect: (row: RowDataType, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (row: RowDataType) => void;
  onPageSizeChange: (newPageSize: string) => void;
  onPageChange: (newPage: number) => void;
  onDeleteClick: () => void;
  onAddClick: () => void;
}

export function DataTable({
  selectionValue,
  loading,
  deleting,
  data,
  selectedRows,
  selectedRowId,
  pagination,
  currentPage,
  pageSize,
  columns,
  onRowSelect,
  onSelectAll,
  onRowClick,
  onPageSizeChange,
  onPageChange,
  onDeleteClick,
  onAddClick,
}: DataTableProps) {
  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate =
    selectedRows.length > 0 && selectedRows.length < data.length;

  return (
    <div className="rounded-lg border bg-card shadow-sm h-full w-full flex flex-col overflow-hidden">
      {/* Fixed header section */}
      <TableActions
        btnName={selectionValue as string}
        selectedRowsCount={selectedRows.length}
        deleting={deleting}
        onDeleteClick={onDeleteClick}
        onAddClick={onAddClick}
      />

      {loading ? (
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-hidden relative">
            <div
              className="absolute inset-0 overflow-auto pb-2"
              style={{
                scrollbarWidth: "thin",
                scrollbarGutter: "stable",
                scrollbarColor: "rgb(203 213 225) transparent",
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  height: 8px;
                  width: 8px;
                }
                div::-webkit-scrollbar-track {
                  background: rgb(248 250 252);
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb {
                  background: rgb(203 213 225);
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: rgb(148 163 184);
                }
              `}</style>
              <div className="min-w-[500px]">
                <Table>
                  <DataTableHeader
                    parent={selectionValue as string}
                    columns={columns}
                    isAllSelected={isAllSelected}
                    isIndeterminate={isIndeterminate}
                    onSelectAll={onSelectAll}
                  />
                  <DataTableBody
                    parent={selectionValue as string}
                    selectionValue={selectionValue}
                    data={data}
                    columns={columns}
                    selectedRows={selectedRows}
                    selectedRowId={selectedRowId}
                    onRowSelect={onRowSelect}
                    onRowClick={onRowClick}
                    loading={loading}
                  />
                </Table>
              </div>
            </div>
          </div>

          {/* Fixed footer section */}
          <Pagination
            pagination={pagination}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
