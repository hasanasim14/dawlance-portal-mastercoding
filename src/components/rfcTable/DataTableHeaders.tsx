"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Send, Loader2, FilterX } from "lucide-react";
import type { RowDataType, ColumnConfig } from "@/lib/types";
import { getNextMonthAndYear } from "@/lib/utils";
import DateFilter from "../DateFilter";
import SummaryTable from "./SummaryTable";

interface BranchOption {
  salesOffice: string;
  salesBranch: string;
}

interface HeadersProps {
  permission: number;
  branchFilter: boolean;
  onPost: (
    branch: string,
    month: string,
    year: string,
    data: RowDataType[]
  ) => Promise<void>;
  onSave: (
    branch: string,
    month: string,
    year: string,
    // eslint-disable-next-line
    changedData: Array<{ material: string; [key: string]: any }>
  ) => Promise<void>;
  onFetchData: (branch: string, month: string, year: string) => Promise<void>;
  isSaving?: boolean;
  isPosting?: boolean;
  rowData: RowDataType[];
  originalRowData: RowDataType[];
  editedValues: Record<string, Record<string, string>>;
  modifiedRows: Set<string>;
  rfcColumns: readonly ColumnConfig[];
  columnFilters?: Record<string, string[]>;
  getRowKey: (row: RowDataType) => string;
  getCellValue: (
    row: RowDataType,
    columnKey: string,
    // eslint-disable-next-line
    originalValue: any
  ) => string;
  // eslint-disable-next-line
  summaryData: any[];
}

export const RFCTableHeaders: React.FC<HeadersProps> = ({
  permission,
  branchFilter,
  onPost,
  onSave,
  onFetchData,
  isSaving = false,
  isPosting = false,
  originalRowData,
  editedValues,
  modifiedRows,
  rfcColumns,
  columnFilters = {},
  getRowKey,
  getCellValue,
  summaryData,
}) => {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    branchFilter ? "" : "DEFAULT_BRANCH"
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Set default values on component mount
  useEffect(() => {
    const { month, year } = getNextMonthAndYear("RFC");
    setSelectedMonth(month);
    setSelectedYear(year);
    if (!branchFilter && branches.length > 0) {
      setSelectedBranch(branches[0].salesOffice);
    }
  }, [branchFilter, branches]);

  // fetch branches
  useEffect(() => {
    const localBranches = localStorage.getItem("branches");
    const fetchBranches = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/branches`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        let branchList = data.data;
        if (localBranches?.length) {
          const storedBranchCodes = localBranches
            .split(",")
            .map((code) => code.trim());
          // eslint-disable-next-line
          branchList = branchList.filter((branch: any) =>
            storedBranchCodes.includes(branch["Branch Code"])
          );
        }
        // eslint-disable-next-line
        const branchOptions: BranchOption[] = branchList.map((branch: any) => ({
          salesOffice: branch["Sales Office"],
          salesBranch: branch["Sales Branch"] || branch["Sales Office"],
        }));
        setBranches(branchOptions);
        if (!branchFilter && branchOptions.length > 0) {
          setSelectedBranch(branchOptions[0].salesOffice);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    fetchBranches();
  }, []);

  // Fetch data when selections change (with debouncing)
  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    const shouldFetch = branchFilter
      ? selectedBranch && selectedMonth && selectedYear
      : selectedMonth && selectedYear;
    if (shouldFetch) {
      const timeout = setTimeout(() => {
        onFetchData(selectedBranch, selectedMonth, selectedYear);
      }, 500);
      setDebounceTimeout(timeout);
    }
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [selectedBranch, selectedMonth, selectedYear, onFetchData, branchFilter]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, []);

  // Validate if ALL rows have been edited (at least one RFC field per row)
  const validateAllRowsEdited = () => {
    if (rfcColumns.length === 0 || originalRowData.length === 0) return false;

    // Check if every row has been edited (at least one RFC field modified)
    return originalRowData.every((row) => {
      const rowKey = getRowKey(row);
      const rowEdits = editedValues[rowKey];

      // If this row hasn't been edited at all, return false
      if (!rowEdits) return false;

      // Check if at least one RFC column has been edited for this row
      return rfcColumns.some((rfcColumn) => {
        const editedValue = rowEdits[rfcColumn.key];
        // Must be explicitly edited (exists in editedValues) and not empty
        return (
          editedValue !== undefined &&
          editedValue !== "" &&
          editedValue !== null
        );
      });
    });
  };

  // Get changed records for SAVE - include ALL RFC fields for modified rows
  const getChangedRecords = () => {
    if (rfcColumns.length === 0) return [];
    // eslint-disable-next-line
    const changedRecords: Array<{ material: string; [key: string]: any }> = [];

    modifiedRows.forEach((rowKey) => {
      const rowEdits = editedValues[rowKey];
      const originalRow = originalRowData.find(
        (row) => getRowKey(row) === rowKey
      );

      if (originalRow && rowEdits) {
        // eslint-disable-next-line
        const record: { material: string; [key: string]: any } = {
          material: String(originalRow["Material"] || ""),
        };

        // Handle single RFC vs multiple RFCs
        if (rfcColumns.length === 1) {
          // For single RFC, get the current value (edited or original)
          const currentValue = getCellValue(
            originalRow,
            rfcColumns[0].key,
            originalRow[rfcColumns[0].key]
          );
          record.rfc = Number(currentValue) || 0;
          changedRecords.push(record);
        } else {
          // Multiple RFCs - include ALL RFC fields for this row
          rfcColumns.forEach((rfcColumn, index) => {
            // Get current value (edited value if exists, otherwise original value)
            const currentValue = getCellValue(
              originalRow,
              rfcColumn.key,
              originalRow[rfcColumn.key]
            );
            record[`rfc${index}`] = Number(currentValue) || 0;
          });
          changedRecords.push(record);
        }
      }
    });

    return changedRecords;
  };

  // Check if save is allowed (has valid changes but not all rows edited)
  const canSave = () => {
    const changedRecords = getChangedRecords();
    return changedRecords.length > 0 && !validateAllRowsEdited();
  };

  // Check if post is allowed (all rows have been edited)
  const canPost = () => {
    return validateAllRowsEdited();
  };

  // Check if there are active filters
  const hasActiveFilters = () => {
    return Object.values(columnFilters).some((filters) => filters.length > 0);
  };

  // Get total number of active filters
  const getActiveFilterCount = () => {
    return Object.values(columnFilters).reduce(
      (total, filters) => total + filters.length,
      0
    );
  };

  const handlePost = async () => {
    if (selectedBranch && selectedMonth && selectedYear) {
      if (!validateAllRowsEdited()) {
        alert(
          "All rows must have at least one RFC field edited before posting. Please ensure you have modified at least one RFC field in every row."
        );
        return;
      }

      // Create updated data with edited values using ORIGINAL data
      const updatedData = originalRowData.map((row) => {
        const rowKey = getRowKey(row);
        const rowEdits = editedValues[rowKey];
        if (rowEdits) {
          const updatedRow = { ...row };
          rfcColumns.forEach((rfcColumn) => {
            if (rowEdits[rfcColumn.key] !== undefined) {
              updatedRow[rfcColumn.key] = rowEdits[rfcColumn.key];
            }
          });
          return updatedRow;
        }
        return row;
      });

      await onPost(selectedBranch, selectedMonth, selectedYear, updatedData);
    }
  };

  const handleSave = async () => {
    if (selectedBranch && selectedMonth && selectedYear) {
      if (!canSave()) {
        alert("No valid changes to save. Please edit some RFC values first.");
        return;
      }
      const changedRecords = getChangedRecords();
      await onSave(selectedBranch, selectedMonth, selectedYear, changedRecords);
    }
  };

  const isFormValid = selectedBranch && selectedMonth && selectedYear;

  return (
    <div>
      <div className="flex items-center gap-4 p-2 justify-between bg-background/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          {branchFilter && <h3 className="font-semibold">{selectedBranch}</h3>}
          {hasActiveFilters() && (
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-md text-sm">
              <FilterX className="w-3 h-3 text-blue-600" />
              <span className="text-blue-600 font-medium">
                {getActiveFilterCount()} filter
                {getActiveFilterCount() !== 1 ? "s" : ""} active
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Branch Select */}
          {branchFilter && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[280px] min-w-[200px]">
                <SelectValue placeholder="Select a Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {branches?.map((branch) => (
                    <SelectItem
                      key={branch.salesOffice}
                      value={branch.salesOffice}
                    >
                      {branch.salesBranch}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

          <DateFilter
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            <Button
              onClick={handleSave}
              disabled={
                !isFormValid ||
                !canSave() ||
                isSaving ||
                isPosting ||
                permission == 0
              }
              variant="outline"
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button
              onClick={handlePost}
              disabled={
                !isFormValid ||
                !canPost() ||
                isSaving ||
                isPosting ||
                permission == 0
              }
              size="sm"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      {/* Summary Table */}
      <div className="border border-gray-200 rounded-xl p-2 m-2">
        <SummaryTable summaryData={summaryData} />
      </div>
    </div>
  );
};
