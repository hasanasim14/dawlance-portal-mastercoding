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
import type { RowDataType, ColumnConfig, PermissionConfig } from "@/lib/types";
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
  permission: PermissionConfig | null;
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
  onAutoSave?: () => void;
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
  onAutoSave,
}) => {
  console.log("the modified ro", modifiedRows);
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

  // Check if any RFC field has been modified (for Save button)
  const hasAnyModifications = () => {
    if (originalRowData.length === 0 || rfcColumns.length === 0) return false;

    return originalRowData.some((row) => {
      const rowKey = getRowKey(row);
      const rowEdits = editedValues[rowKey];
      if (!rowEdits) return false;

      // Check if any RFC column has been modified
      return rfcColumns.some((rfcColumn) => {
        const editedValue = rowEdits[rfcColumn.key];
        const originalValue = String(row[rfcColumn.key] || "");
        // Consider it modified if the edited value is different from original
        return editedValue !== undefined && editedValue !== originalValue;
      });
    });
  };

  // Check if ALL RFC fields are filled with non-empty values (for Post button)
  // FIXED: Now uses the same RFC column detection logic as parent component
  const areAllRFCFieldsFilled = () => {
    if (originalRowData.length === 0 || rfcColumns.length === 0) return false;

    return originalRowData.every((row) => {
      const rowKey = getRowKey(row);
      const rowEdits = editedValues[rowKey];

      // Use the same RFC column detection logic as parent component
      return rfcColumns.every((rfcColumn) => {
        // First check if there's an edited value for this field
        const editedValue = rowEdits?.[rfcColumn.key];

        // Use edited value if it exists, otherwise use original value
        const currentValue =
          editedValue !== undefined
            ? editedValue
            : String(row[rfcColumn.key] || "");

        // Check if the current value is filled (non-empty and not zero)
        return (
          currentValue !== "" &&
          currentValue !== "0" &&
          currentValue !== null &&
          currentValue !== undefined &&
          String(currentValue).trim() !== ""
        );
      });
    });
  };

  // Get changed records for SAVE - include ALL RFC fields for modified rows
  const getChangedRecords = (rowKeyFilter?: string) => {
    if (!rfcColumns.length) return [];

    const changedRecords: Array<{ material: string; [key: string]: any }> = [];

    originalRowData.forEach((row) => {
      const rowKey = getRowKey(row);
      if (rowKeyFilter && rowKey !== rowKeyFilter) return;

      const edits = editedValues[rowKey];
      if (!edits) return; // skip unedited rows

      const material = String(row["Material"] || "");

      if (option === "dawlance") {
        // Check if any RFC field has been edited
        const hasAnyRfcEdited = rfcColumns.some((col) => col.key in edits);
        if (!hasAnyRfcEdited) return;

        const record: { material: string; [key: string]: any } = { material };

        rfcColumns.forEach((rfcColumn) => {
          const key = rfcColumn.key;
          const editedValue = key in edits ? edits[key] : undefined;
          const originalValue = row[key];
          const valueRaw =
            editedValue !== undefined ? editedValue : originalValue;

          const finalValue =
            valueRaw === "" || valueRaw === null || valueRaw === undefined
              ? 0
              : Number(valueRaw);

          record[key] = finalValue;
        });

        changedRecords.push(record);
      } else {
        // Non-dawlance case
        let totalRfc = 0;
        let hasValidRfc = false;

        rfcColumns.forEach((rfcColumn) => {
          const key = rfcColumn.key;
          const value = key in edits ? edits[key] : row[key];
          if (
            value !== "" &&
            value !== "0" &&
            value !== 0 &&
            value !== null &&
            value !== undefined
          ) {
            totalRfc += Number(value);
            hasValidRfc = true;
          }
        });

        if (hasValidRfc && totalRfc > 0) {
          changedRecords.push({
            material,
            rfc: totalRfc,
          });
        }
      }
    });

    return changedRecords;
  };

  // Check if save is allowed (has modifications)
  const canSave = () => {
    return hasAnyModifications();
  };

  // Check if post is allowed (all RFC fields are filled)
  const canPost = () => {
    return areAllRFCFieldsFilled();
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
      if (!areAllRFCFieldsFilled()) {
        alert(
          "All RFC fields must be filled before posting. Please ensure all RFC fields have values."
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
        alert("No changes to save. Please modify some RFC values first.");
        return;
      }

      const changedRecords = getChangedRecords();
      await onSave(selectedBranch, selectedMonth, selectedYear, changedRecords);
    }
  };

  const isFormValid = selectedBranch && selectedMonth && selectedYear;

  const handleAutoSaveSignal = () => {
    onAutoSave?.();
  };

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
                !isFormValid || !canSave() || isSaving || isPosting
                // ||permission?.save_allowed == 0
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
                permission?.post_allowed == 0
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
      <WarningContainer warningMessage={warningMessage} />
      <div className="border border-gray-200 rounded-xl p-2 m-2">
        <SummaryTable
          option={option}
          month={selectedMonth}
          year={selectedYear}
          summaryData={summaryData}
          autoSaveCheck={handleAutoSaveSignal}
        />
      </div>
    </div>
  );
};
