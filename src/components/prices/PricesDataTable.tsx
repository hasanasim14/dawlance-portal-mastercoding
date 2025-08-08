"use client";
import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { PaginationData } from "@/lib/types";
import {
  FilterableColumn,
  PricesDataProps,
} from "@/app/(navbar-app)/prices/page";
import { cn } from "@/lib/utils";
import debounce from "lodash.debounce";

interface PricesDataTableProps {
  data: PricesDataProps[];
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: string) => void;
  pageSize: number;
  currentPage: number;
  pagination: PaginationData;
  onUpdate: (updated: { material: string; value: number }) => void;
  onFilterApply: (column: FilterableColumn, values: string[]) => void;
  activeFilters: Partial<Record<FilterableColumn, string[]>>;
}

const filterableColumns: (keyof PricesDataProps)[] = [
  "Material",
  "Material Description",
  "Product",
];

const PricesDataTable = ({
  data,
  onPageChange,
  onPageSizeChange,
  pageSize,
  currentPage,
  pagination,
  onUpdate,
  onFilterApply,
  activeFilters,
}: PricesDataTableProps) => {
  const [editingValues, setEditingValues] = useState<Record<string, number>>(
    {}
  );
  // eslint-disable-next-line
  const [savingStatus, setSavingStatus] = useState<
    Record<string, "saving" | "saved" | null>
  >({});
  const [filterOpenState, setFilterOpenState] = useState<
    Partial<Record<keyof PricesDataProps, boolean>>
  >({});
  const [tempSelectedFilters, setTempSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [filterSearchTerms, setFilterSearchTerms] = useState<
    Record<string, string>
  >({});

  const handleInputChange = (material: string, value: string) => {
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      setEditingValues((prev) => ({ ...prev, [material]: numericValue }));
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

  const getUniqueColumnValues = (column: keyof PricesDataProps) => {
    const values = new Set<string>();
    data.forEach((row) => {
      const value = row[column];
      if (typeof value === "string") {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };

  const handleFilterDropdownOpen = (column: FilterableColumn) => {
    setTempSelectedFilters((prev) => ({
      ...prev,
      [column]: activeFilters[column] || [],
    }));
    setFilterSearchTerms((prev) => ({
      ...prev,
      [column]: "",
    }));
  };

  const handleFilterSearchChange = (
    column: FilterableColumn,
    value: string
  ) => {
    setFilterSearchTerms((prev) => ({ ...prev, [column]: value }));
  };

  const handleFilterCheckboxChange = (
    column: FilterableColumn,
    value: string,
    checked: boolean
  ) => {
    setTempSelectedFilters((prev) => {
      const current = prev[column] || [];
      return {
        ...prev,
        [column]: checked
          ? [...current, value]
          : current.filter((item) => item !== value),
      };
    });
  };

  const handleSelectAllFilters = (
    column: FilterableColumn,
    checked: boolean
  ) => {
    const allValues = getUniqueColumnValues(column);
    setTempSelectedFilters((prev) => ({
      ...prev,
      [column]: checked ? allValues : [],
    }));
  };

  const handleApplyFilters = (column: FilterableColumn) => {
    onFilterApply(column, tempSelectedFilters[column] || []);
    setFilterOpenState((prev) => ({ ...prev, [column]: false }));
  };

  const handleCancelFilters = (column: FilterableColumn) => {
    setTempSelectedFilters((prev) => ({
      ...prev,
      [column]: activeFilters[column] || [],
    }));
    setFilterSearchTerms((prev) => ({ ...prev, [column]: "" }));
  };

  const renderFilterDropdown = (column: FilterableColumn) => {
    const uniqueValues = getUniqueColumnValues(column);
    const searchTerm = filterSearchTerms[column] || "";
    const filteredValues = uniqueValues.filter((val) =>
      val.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const selectedCount = (tempSelectedFilters[column] || []).length;
    const totalCount = uniqueValues.length;

    return (
      <Popover
        open={filterOpenState[column] ?? false}
        onOpenChange={(isOpen) => {
          setFilterOpenState((prev) => ({ ...prev, [column]: isOpen }));

          if (isOpen) {
            handleFilterDropdownOpen(column);
          } else {
            handleCancelFilters(column);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
            <Filter
              className={cn(
                "h-4 w-4",
                activeFilters[column]?.length
                  ? "text-blue-600"
                  : "text-muted-foreground"
              )}
            />
            <span className="sr-only">Filter {column}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-4">
          <div className="text-lg font-semibold mb-2">Filter {column}</div>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search values..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => handleFilterSearchChange(column, e.target.value)}
            />
          </div>
          <Separator className="my-2" />
          <div className="max-h-60 overflow-y-auto pr-2">
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id={`select-all-${column}`}
                checked={selectedCount === totalCount && totalCount > 0}
                onCheckedChange={(checked) =>
                  handleSelectAllFilters(column, checked as boolean)
                }
              />
              <label
                htmlFor={`select-all-${column}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All ({totalCount})
              </label>
            </div>
            {filteredValues.map((value) => (
              <div key={value} className="flex items-center space-x-2 py-2">
                <Checkbox
                  id={`${column}-${value}`}
                  checked={(tempSelectedFilters[column] || []).includes(value)}
                  onCheckedChange={(checked) =>
                    handleFilterCheckboxChange(
                      column,
                      value,
                      checked as boolean
                    )
                  }
                />
                <label
                  htmlFor={`${column}-${value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {value}
                </label>
              </div>
            ))}
            {filteredValues.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matching values
              </p>
            )}
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} of {totalCount} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear filter and close
                  setTempSelectedFilters((prev) => ({ ...prev, [column]: [] }));
                  onFilterApply(column, []);
                  setFilterOpenState((prev) => ({ ...prev, [column]: false }));
                }}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelFilters(column)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleApplyFilters(column)}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="rounded-lg border bg-card h-full w-full flex flex-col overflow-hidden">
      <div className="overflow-x-auto w-full">
        {Object.keys(activeFilters).some(
          (key) => activeFilters[key as keyof typeof activeFilters]?.length
        ) && (
          <div className="p-4 flex justify-end">
            <Button
              variant="destructive"
              onClick={() => {
                (filterableColumns as FilterableColumn[]).forEach((col) =>
                  onFilterApply(col, [])
                );
              }}
            >
              <Trash2 />
              Clear All Filters
            </Button>
          </div>
        )}
        <div className="border rounded-lg overflow-hidden h-[calc(95vh-180px)]">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm relative table-auto">
              <thead className="sticky top-0 z-20 border-b bg-[#f9faf9]">
                <tr>
                  <th className="p-3 text-left font-medium sticky left-0 z-30 min-w-[1px]">
                    <div className="flex items-center">
                      Material
                      {renderFilterDropdown("Material" as FilterableColumn)}
                    </div>
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    <div className="flex items-center">
                      Material Description
                      {renderFilterDropdown(
                        "Material Description" as FilterableColumn
                      )}
                    </div>
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    <div className="flex items-center">
                      Product
                      {renderFilterDropdown("Product" as FilterableColumn)}
                    </div>
                  </th>
                  <th className="p-3 text-left font-medium whitespace-nowrap">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((record) => {
                    // Access properties directly without destructuring
                    const value =
                      editingValues[record.Material] ?? record.Price;
                    return (
                      <tr
                        key={record.Material}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="p-1">{record.Material}</td>
                        <td className="p-1 whitespace-nowrap">
                          {record["Material Description"]}
                        </td>
                        <td className="p-1 whitespace-nowrap">
                          {record.Product}
                        </td>
                        <td className="p-1 whitespace-nowrap">
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) =>
                              handleInputChange(record.Material, e.target.value)
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
