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
import WarningContainer from "../WarningContainer";

interface BranchOption {
  salesOffice: string;
  salesBranch: string;
}

interface HeadersProps {
  option: string;
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
  warningMessage: string;
  onDateChange?: (month: string, year: string) => void;
  editableColumns?: ColumnConfig[];
}

export const RFCTableHeaders: React.FC<HeadersProps> = ({
  option,
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
  warningMessage,
  onDateChange,
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
    onDateChange?.(selectedMonth, selectedYear);
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
        let branchList = data?.data || [];

        // Filter by Sales Office if not "All"
        if (localBranches && localBranches !== "All") {
          const storedSalesOffices = localBranches
            .split(",")
            .map((code) => code.trim());

          // eslint-disable-next-line
          branchList = branchList.filter((branch: any) =>
            storedSalesOffices.includes(branch["Sales Office"])
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

  // delete
  useEffect(() => {
    const is = validateAllRFCFieldsFilled();
    console.log("asdad", is);
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

  // validation for post button
  const validateAllRFCFieldsFilled = () => {
    if (rfcColumns.length === 0 || originalRowData.length === 0) return false;

    // Check if every row has all RFC fields filled
    return originalRowData.every((row) => {
      return rfcColumns.every((rfcColumn) => {
        const value = getCellValue(row, rfcColumn.key, row[rfcColumn.key]);
        return value !== "" && value !== null && !isNaN(Number(value));
      });
    });
  };

  // Get changed records for SAVE - include ALL RFC fields for modified rows
  const getChangedRecords = () => {
    if (rfcColumns.length === 0) return [];

    const changedRecords: Array<{ material: string; [key: string]: any }> = [];

    modifiedRows.forEach((rowKey) => {
      const rowEdits = editedValues[rowKey];
      const originalRow = originalRowData.find(
        (row) => getRowKey(row) === rowKey
      );

      if (originalRow && rowEdits) {
        const record: { material: string; [key: string]: any } = {
          material: String(originalRow["Material"] || ""),
        };

        // For both cases, process all RFC columns
        rfcColumns.forEach((rfcColumn, index) => {
          const currentValue = getCellValue(
            originalRow,
            rfcColumn.key,
            originalRow[rfcColumn.key]
          );

          if (option === "dawlance") {
            const reversedIndex = rfcColumns.length - 1 - index;
            record[`rfc-${reversedIndex}`] =
              currentValue !== "" && !isNaN(Number(currentValue))
                ? Number(currentValue)
                : 0;
          } else {
            // For non-dawlance, use simple 'rfc' field
            const numericValue = Number(currentValue);
            record.rfc =
              currentValue !== "" && !isNaN(numericValue) ? numericValue : null;
          }
        });

        changedRecords.push(record);
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
      // Create updated data with edited values
      const updatedData = originalRowData.map((row) => {
        const rowKey = getRowKey(row);
        const rowEdits = editedValues[rowKey];
        const updatedRow = { ...row };

        rfcColumns.forEach((rfcColumn) => {
          // Get the final value (edited if exists, otherwise original)
          const finalValue =
            rowEdits?.[rfcColumn.key] !== undefined
              ? rowEdits[rfcColumn.key]
              : row[rfcColumn.key];

          // For non-Dawlance, only update if value is valid number
          if (option !== "dawlance") {
            const numValue = Number(finalValue);
            if (!isNaN(numValue) && finalValue !== "") {
              updatedRow[rfcColumn.key] = finalValue;
            } else {
              // Explicitly set to null for empty/invalid values
              updatedRow[rfcColumn.key] = null;
            }
          } else {
            // For Dawlance, convert empty to 0
            updatedRow[rfcColumn.key] = finalValue === "" ? "0" : finalValue;
          }
        });

        return updatedRow;
      });

      // Filter out rows with no valid RFC values for non-Dawlance
      const filteredData =
        option !== "dawlance"
          ? updatedData.filter((row) =>
              rfcColumns.some(
                (col) => row[col.key] !== null && row[col.key] !== ""
              )
            )
          : updatedData;

      await onPost(selectedBranch, selectedMonth, selectedYear, filteredData);
    }
  };

  const handleSave = async () => {
    if (selectedBranch && selectedMonth && selectedYear) {
      // if (!canSave()) {
      //   alert("No valid changes to save. Please edit some RFC values first.");
      //   return;
      // }
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
              // disabled={
              //   !isFormValid ||
              //   !canPost() ||
              //   isSaving ||
              //   isPosting ||
              //   permission?.post_allowed == 0
              // }
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
      <WarningContainer warningMessage={warningMessage} />
      <div className="border border-gray-200 rounded-xl p-2 m-2">
        <SummaryTable
          option={option}
          month={selectedMonth}
          year={selectedYear}
          summaryData={summaryData}
        />
      </div>
    </div>
  );
};
