"use client";

import type React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
// import { debounce } from "lodash";
import debounce from "lodash.debounce";

import { PriceGroupDataProps } from "@/app/(navbar-app)/price-group/page";
import { PaginationData } from "@/lib/types";

interface PriceGroupDataTableProps {
  data: PriceGroupDataProps[];
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: string) => void;
  pageSize: number;
  currentPage: number;
  pagination: PaginationData;
  onUpdate: (updated: {
    priceGroup: string;
    field: "Min Price" | "Max Price";
    value: string;
  }) => void;
}

const PriceGroupDataTable = ({
  data,
  onPageChange,
  onPageSizeChange,
  pageSize,
  currentPage,
  pagination,
  onUpdate,
}: PriceGroupDataTableProps) => {
  const [editingValues, setEditingValues] = useState<{
    [key: string]: { min: string; max: string };
  }>({});

  const handleInputChange = (
    priceGroup: string,
    field: "Min Price" | "Max Price",
    value: string
  ) => {
    setEditingValues((prev) => ({
      ...prev,
      [priceGroup]: {
        ...prev[priceGroup],
        [field === "Min Price" ? "min" : "max"]: value,
      },
    }));
    debouncedSave(priceGroup, field, value);
  };

  const debouncedSave = debounce(
    (priceGroup: string, field: "Min Price" | "Max Price", value: string) => {
      onUpdate({ priceGroup, field, value });
    },
    500
  );

  return (
    <div className="rounded-lg border bg-card h-full w-full flex flex-col overflow-hidden">
      <div className="overflow-x-auto w-full">
        <div className="border rounded-lg overflow-hidden h-[calc(95vh-180px)]">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm relative table-auto">
              <thead className="sticky top-0 z-20 border-b bg-[#f9faf9]">
                <tr>
                  <th className="p-3 text-left font-medium sticky left-0 z-30 min-w-[1px]">
                    Price Group
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    Min Price
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    Max Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((record) => {
                    const group = record["Price Group"];
                    const min =
                      editingValues[group]?.min ?? record["Min Price"];
                    const max =
                      editingValues[group]?.max ?? record["Max Price"];

                    return (
                      <tr key={group} className="border-b hover:bg-muted/30">
                        <td className="p-3">{group}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Input
                            value={min}
                            onChange={(e) =>
                              handleInputChange(
                                group,
                                "Min Price",
                                e.target.value
                              )
                            }
                            className="w-32"
                          />
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Input
                            value={max}
                            onChange={(e) =>
                              handleInputChange(
                                group,
                                "Max Price",
                                e.target.value
                              )
                            }
                            className="w-32"
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
                      No RFC data found for this material.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Page Size Selector */}
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

        {/* Page Info */}
        <div className="text-sm text-muted-foreground text-center">
          Showing {(currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, pagination.total_records)} of{" "}
          {pagination.total_records} entries
        </div>

        {/* Pagination Controls */}
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

export default PriceGroupDataTable;
