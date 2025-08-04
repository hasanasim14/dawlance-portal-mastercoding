"use client";
import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnConfig, PermissionConfig, RowDataType } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { RFCTableHeaders } from "./DataTableHeaders";
import { ColumnFilter } from "./ColumnFilter";
import AnnualRFCModal from "./AnnualRFCModal";
import debounce from "lodash.debounce";

interface DataTableProps {
  permission: PermissionConfig | null;
  branchFilter: boolean;
  rowData: RowDataType[];
  originalRowData: RowDataType[];
  columns: readonly ColumnConfig[];
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
  onAutoSave?: (
    // eslint-disable-next-line
    changedData: Array<{ material: string; [key: string]: any }>
  ) => Promise<void>;
  onFetchData: (branch: string, month: string, year: string) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  isPosting?: boolean;
  filterableColumns?: string[];
  columnFilters?: Record<string, string[]>;
  onFilterChange?: (filters: Record<string, string[]>) => void;
  onApplyFilters?: () => void;
  editedValues?: Record<string, Record<string, string>>;
  onEditedValuesChange?: (
    editedValues: Record<string, Record<string, string>>
  ) => void;
  // eslint-disable-next-line
  summaryData: any[];
  option: string;
  warningMessage: string;
}

// material object interface
export interface SelectedMaterial {
  material_id: string | null;
  material_description: string | null;
}

export const RFCTable: React.FC<DataTableProps> = ({
  permission,
  branchFilter,
  rowData,
  originalRowData,
  columns,
  onPost,
  onSave,
  onAutoSave,
  onFetchData,
  isLoading = false,
  isSaving = false,
  isPosting = false,
  filterableColumns = [],
  columnFilters = {},
  onFilterChange,
  onApplyFilters,
  editedValues = {},
  onEditedValuesChange,
  summaryData,
  option,
  warningMessage,
}) => {
  // State for tracking which rows have been modified
  const [modifiedRows, setModifiedRows] = useState<Set<string>>(new Set());
  // eslint-disable-next-line
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<SelectedMaterial>({
    material_id: null,
    material_description: null,
  });
  const [branch, setBranch] = useState("");
  const [dates, setDates] = useState({
    month: "",
    year: "",
  });

  const handleMaterialClick = (
    material: string,
    material_description: string
  ) => {
    setSelectedMaterial({
      material_id: material,
      material_description: material_description,
    });
    setModalOpen(true);
  };

  // Refs to track the latest values
  const editedValuesRef = useRef(editedValues);
  const originalRowDataRef = useRef(originalRowData);
  const columnsRef = useRef(columns);

  // Update refs when props change
  useEffect(() => {
    editedValuesRef.current = editedValues;
    originalRowDataRef.current = originalRowData;
    columnsRef.current = columns;
  }, [editedValues, originalRowData, columns]);

  // Helper function to create unique row key
  const getRowKey = (row: RowDataType): string => {
    return `${row["Material"] || ""}_${row["Branch"] || ""}`;
  };

  // Get all RFC columns (excluding "Last RFC")
  const getRFCColumns = useCallback(() => {
    return columnsRef.current.filter((col) => {
      const key = col.key;
      // Match if RFC appears at end OR has a trailing space after RFC
      const isRFC =
        key.includes("RFC") &&
        (key.trimEnd().endsWith("RFC") || key.endsWith("RFC ")) &&
        !key.includes("Branch") &&
        !key.includes("Marketing") &&
        !key.includes("Last");
      return isRFC;
    });
  }, []);

  // Helper function to safely convert value to number or preserve null/empty
  const convertToNumberOrNull = (value: string | null | undefined) => {
    if (value === null || value === undefined) {
      return "";
    }
    if (value === "") {
      return ""; // preserve empty string intentionally set by user
    }

    const numValue = Number(value);
    return isNaN(numValue) ? "" : numValue;
  };

  // Check if all RFC values are filled for all rows
  const checkAllRFCValuesFilled = useCallback(() => {
    const allRFCColumns = getRFCColumns();
    const modifiedRowsSet = new Set<string>();

    for (const row of originalRowDataRef.current) {
      const rowKey = getRowKey(row);
      let hasAllValues = true;
      let hasAnyValue = false;

      for (const rfcColumn of allRFCColumns) {
        const editedValue = editedValuesRef.current[rowKey]?.[rfcColumn.key];
        const originalValue = String(row[rfcColumn.key] || "");
        const finalValue =
          editedValue !== undefined ? editedValue : originalValue;

        // Check if value exists and is not empty
        const hasValue =
          finalValue !== "" &&
          finalValue !== "0" &&
          finalValue !== null &&
          finalValue !== undefined;

        if (hasValue) {
          hasAnyValue = true;
        } else {
          hasAllValues = false;
        }
      }

      // If row has any RFC values filled, consider it modified
      if (hasAnyValue) {
        modifiedRowsSet.add(rowKey);
      }

      // If any row doesn't have all values filled, return false
      if (!hasAllValues && hasAnyValue) {
        return false;
      }
    }

    // Update modified rows based on actual data state
    setModifiedRows(modifiedRowsSet);

    // Return true if all rows that have any values also have all values filled
    return modifiedRowsSet.size > 0;
  }, [getRFCColumns]);

  // Update modified rows whenever editedValues or originalRowData changes
  useEffect(() => {
    checkAllRFCValuesFilled();
  }, [editedValues, originalRowData]);

  // Prepare changed data for API call - collects all RFC values for modified rows
  const prepareChangedData = useCallback(() => {
    // eslint-disable-next-line
    const changedData: Array<{ material: string; [key: string]: any }> = [];

    // Get all RFC columns
    const allRFCColumns = getRFCColumns();

    Object.entries(editedValuesRef.current).forEach(([rowKey, rowEdits]) => {
      // Find the original row data
      const originalRow = originalRowDataRef.current.find(
        (row) => getRowKey(row) === rowKey
      );

      if (!originalRow) return;

      const material = String(originalRow["Material"] || "");
      if (!material) return;

      // Prepare row data with material
      // eslint-disable-next-line
      const rowData: { material: string; [key: string]: any } = { material };

      // Collect all RFC values for this row (both edited and original)
      allRFCColumns.forEach((rfcColumn, index) => {
        const editedValue = rowEdits[rfcColumn.key];
        const originalValue = String(originalRow[rfcColumn.key] || "");

        // Use edited value if available, otherwise use original value
        const finalValue =
          editedValue !== undefined ? editedValue : originalValue;

        if (option === "dawlance") {
          const reversedIndex = allRFCColumns.length - 1 - index;
          const fieldName = `rfc-${reversedIndex}`;
          // Use the helper function to properly handle null/empty values
          rowData[fieldName] = convertToNumberOrNull(finalValue);
        } else {
          if (rowData.rfc === undefined) {
            // Use the helper function to properly handle null/empty values
            rowData.rfc = convertToNumberOrNull(finalValue);
          }
        }
      });

      // Only add if there are actual changes in this row
      const hasChanges = Object.keys(rowEdits).length > 0;
      if (hasChanges) changedData.push(rowData);
    });

    return changedData;
  }, [getRFCColumns]);

  // Create debounced autosave function
  const debouncedAutoSave = useCallback(
    debounce(() => {
      const changedData = prepareChangedData();
      if (changedData.length > 0 && onAutoSave) {
        onAutoSave(changedData);
      }
    }, 3000),
    [prepareChangedData, onAutoSave]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [debouncedAutoSave]);

  // Handle cell value change for specific RFC column
  const handleCellChange = async (
    row: RowDataType,
    columnKey: string,
    value: string
  ) => {
    const rowKey = getRowKey(row);
    const currentRowEdits = editedValues[rowKey] || {};

    const newEditedValues = {
      ...editedValues,
      [rowKey]: {
        ...currentRowEdits,
        [columnKey]: value,
      },
    };

    if (onEditedValuesChange) {
      onEditedValuesChange(newEditedValues);
    }

    // Trigger debounced autosave
    debouncedAutoSave();
  };

  // Handle cell edit end
  const handleCellBlur = () => {
    // setEditingCell(null);
    setEditingCell("");
    // Flush the debounce to ensure the last change is saved immediately
    debouncedAutoSave.flush();
  };

  // Get cell value for specific column
  const getCellValue = (
    row: RowDataType,
    columnKey: string,
    // eslint-disable-next-line
    originalValue: any
  ) => {
    const rowKey = getRowKey(row);
    const rowEdits = editedValues[rowKey];
    const editedValue = rowEdits?.[columnKey];

    const finalValue =
      editedValue !== undefined ? editedValue : String(originalValue ?? "");

    return finalValue;
  };

  // Check if a row has been modified
  const isRowModified = (row: RowDataType): boolean => {
    const rowKey = getRowKey(row);
    return modifiedRows.has(rowKey);
  };

  // Handle filter change (this just updates local state)
  const handleFilterChange = (columnKey: string, selectedValues: string[]) => {
    if (onFilterChange) {
      const newFilters = {
        ...columnFilters,
        [columnKey]: selectedValues,
      };
      onFilterChange(newFilters);
    }
  };

  // Handle apply filter (this triggers frontend filtering)
  const handleApplyFilter = () => {
    if (onApplyFilters) {
      onApplyFilters();
    }
  };

  const rfcColumns = getRFCColumns();

  useEffect(() => {
    if (originalRowData.length > 0) {
      setBranch(originalRowData[0]["Branch"]);
    } else {
      setBranch("");
    }
  }, [originalRowData]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <RFCTableHeaders
        option={option}
        permission={permission}
        branchFilter={branchFilter}
        onPost={onPost}
        onSave={onSave}
        onFetchData={onFetchData}
        isSaving={isSaving}
        isPosting={isPosting}
        rowData={rowData}
        originalRowData={originalRowData}
        editedValues={editedValues}
        modifiedRows={modifiedRows}
        rfcColumns={rfcColumns}
        columnFilters={columnFilters}
        getRowKey={getRowKey}
        getCellValue={getCellValue}
        summaryData={summaryData}
        warningMessage={warningMessage}
        onDateChange={(month: string, year: string) =>
          setDates({ month, year })
        }
      />

      <div className="flex-1 overflow-hidden rounded-lg border bg-card shadow-sm m-2 p-2">
        <div className="h-full w-full overflow-auto">
          <Table className="relative w-full">
            <TableHeader className="sticky top-0 z-50 bg-muted">
              <TableRow className="hover:bg-transparent border-b shadow-sm">
                {columns.map((column) => {
                  const isFilterable = filterableColumns.includes(column.key);
                  const hasActiveFilter = columnFilters[column.key]?.length > 0;

                  return (
                    <TableHead
                      key={column.key}
                      className={`text-sm whitespace-nowrap bg-[#f5f5f4] ${
                        column.key === "Material" &&
                        "sticky left-0 z-30 w-[120px] min-w-[120px] max-w-[120px]"
                      } ${
                        column.key === "Material Description" &&
                        "sticky left-[120px] z-20 w-[240px] min-w-[240px] max-w-[240px]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-xs sm:text-sm">
                            {column.label}
                          </span>
                          {hasActiveFilter && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {isFilterable && (
                          <div className="flex-shrink-0">
                            <ColumnFilter
                              columnKey={column.key}
                              columnLabel={column.label}
                              data={rowData}
                              selectedFilters={columnFilters[column.key] || []}
                              onFilterChange={handleFilterChange}
                              onApplyFilter={handleApplyFilter}
                            />
                          </div>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : rowData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No data available. Please select branch, month, and year to
                    view RFC data.
                  </TableCell>
                </TableRow>
              ) : (
                rowData.map((row) => (
                  <TableRow
                    key={getRowKey(row)}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("input") ||
                        target.closest("button") ||
                        target.closest("textarea") ||
                        target.closest("select")
                      ) {
                        return;
                      }
                      handleMaterialClick(
                        String(row["Material"] ?? ""),
                        String(row["Material Description"] ?? "")
                      );
                    }}
                    className={`hover:bg-muted/50 cursor-pointer ${
                      isRowModified(row) ? "bg-blue-50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    {columns.map((column) => {
                      const isRFCColumn =
                        column.key.includes("RFC") &&
                        column.key.endsWith(" RFC") &&
                        !column.key.includes("Branch") &&
                        !column.key.includes("Marketing") &&
                        !column.key.includes("Last");

                      const isEditable = isRFCColumn;
                      const cellValue = getCellValue(
                        row,
                        column.key,
                        row[column.key]
                      );

                      return (
                        <TableCell
                          key={column.key}
                          className={`bg-background text-sm whitespace-nowrap ${
                            column.key === "Material" &&
                            "sticky left-0 z-30 bg-background w-[120px] min-w-[120px] max-w-[120px]"
                          } ${
                            column.key === "Material Description" &&
                            "sticky left-[120px] z-20 bg-background w-[240px] min-w-[240px] max-w-[240px]"
                          }`}
                          title={String(row[column.key] ?? "")}
                        >
                          {isEditable ? (
                            <div className="relative">
                              <Input
                                type="number"
                                value={cellValue === "" ? undefined : cellValue}
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  if (rawValue === "") {
                                    handleCellChange(row, column.key, "");
                                    return;
                                  }
                                  const newValue = Number(rawValue);
                                  handleCellChange(
                                    row,
                                    column.key,
                                    String(newValue < 0 ? 0 : newValue)
                                  );
                                }}
                                onBlur={handleCellBlur}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") {
                                    handleCellBlur();
                                  }
                                }}
                                className="w-full h-7 sm:h-8 text-xs sm:text-sm"
                              />
                            </div>
                          ) : (
                            <div className="truncate text-xs sm:text-sm w-full">
                              {String(row[column.key] ?? "")}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AnnualRFCModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          materialData={selectedMaterial}
          option={option}
          branch={branch}
          dates={dates}
        />
      </div>
    </div>
  );
};
