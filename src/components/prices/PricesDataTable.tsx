"use client";

import type React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import debounce from "lodash.debounce";
import { PaginationData } from "@/lib/types";
import { PricesDataProps } from "@/app/(navbar-app)/prices/page";

interface PricesDataTableProps {
  data: PricesDataProps[];
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: string) => void;
  pageSize: number;
  currentPage: number;
  pagination: PaginationData;
  onUpdate: (updated: { material: string; value: number }) => void;
}

const PricesDataTable = ({
  data,
  onPageChange,
  onPageSizeChange,
  pageSize,
  currentPage,
  pagination,
  onUpdate,
}: PricesDataTableProps) => {
  const [editingValues, setEditingValues] = useState<{
    [material: string]: number;
  }>({});
  // eslint-disable-next-line
  const [savingStatus, setSavingStatus] = useState<{
    [material: string]: "saving" | "saved" | null;
  }>({});

  const handleInputChange = (material: string, value: string) => {
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      setEditingValues((prev) => ({
        ...prev,
        [material]: numericValue,
      }));
      debouncedSave(material, numericValue);
    }
  };

  const debouncedSave = debounce(async (material: string, value: number) => {
    try {
      setSavingStatus((prev) => ({ ...prev, [material]: "saving" }));
      await onUpdate({ material, value });
      setSavingStatus((prev) => ({ ...prev, [material]: "saved" }));
      setTimeout(() => {
        setSavingStatus((prev) => ({ ...prev, [material]: null }));
      }, 1000);
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }, 500);

  return (
    <div className="rounded-lg border bg-card h-full w-full flex flex-col overflow-hidden">
      <div className="overflow-x-auto w-full">
        <div className="border rounded-lg overflow-hidden h-[calc(95vh-180px)]">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm relative table-auto">
              <thead className="sticky top-0 z-20 border-b bg-[#f9faf9]">
                <tr>
                  <th className="p-3 text-left font-medium sticky left-0 z-30 min-w-[1px]">
                    Material
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    Material Description
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    Product
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((record) => {
                    const { Material, Product, Price } = record;
                    const description = record["Material Description"];
                    const value = editingValues[Material] ?? Price;

                    return (
                      <tr key={Material} className="border-b hover:bg-muted/30">
                        <td className="p-1">{Material}</td>
                        <td className="p-1 whitespace-nowrap">{description}</td>
                        <td className="p-1 whitespace-nowrap">{Product}</td>
                        <td className="p-1 whitespace-nowrap">
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) =>
                              handleInputChange(Material, e.target.value)
                            }
                            className="w-32"
                            min={0}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No Prices Data Available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={pageSize.toString()} onValueChange={onPageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="150">150</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Showing {(currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, pagination.total_records)} of{" "}
          {pagination.total_records} entries
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {Array.from(
            { length: Math.min(5, pagination.total_pages) },
            (_, i) => {
              let pageNum = i + 1;
              if (pagination.total_pages > 5) {
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= pagination.total_pages - 2)
                  pageNum = pagination.total_pages - 4 + i;
                else pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            }
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pagination.total_pages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PricesDataTable;
