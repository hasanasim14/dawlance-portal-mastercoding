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
  autoSaveCheck?: () => void;
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
  autoSaveCheck,
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

  // Get all RFC columns (excluding "Last RFC") - UPDATED to match table rendering logic
  const getRFCColumns = useCallback(() => {
    return columnsRef.current.filter((col) => {
      const key = col.key;
      // Use the same logic as table rendering for consistency
      const isRFC =
        key.includes("RFC") &&
        key.endsWith(" RFC") && // Only match columns ending with " RFC" (with space)
        !key.includes("Branch") &&
        !key.includes("Marketing") &&
        !key.includes("Last");
      return isRFC;
    });
  }, []);

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
  }, [editedValues, originalRowData, checkAllRFCValuesFilled]);

  // UPDATED: Prepare changed data for autosave - follows your specific requirements
  const prepareAutoSaveData = useCallback(() => {
    // eslint-disable-next-line
    const changedData: Array<{ material: string; [key: string]: any }> = [];
    const allRFCColumns = getRFCColumns();

    // For autosave, check all rows that have any RFC modifications
    originalRowDataRef.current.forEach((originalRow) => {
      const rowKey = getRowKey(originalRow);
      const rowEdits = editedValuesRef.current[rowKey] || {};

      const material = String(originalRow["Material"] || "");
      if (!material) return;

      if (option === "dawlance") {
        // For Dawlance: Check if rfc-0 (latest month) has value
        const rfc0Column = allRFCColumns[0]; // Latest month is first column
        const rfc0EditedValue = rowEdits[rfc0Column?.key];
        const rfc0OriginalValue = String(originalRow[rfc0Column?.key] || "");
        const rfc0FinalValue =
          rfc0EditedValue !== undefined ? rfc0EditedValue : rfc0OriginalValue;

        // If rfc-0 is empty, don't send anything for this row
        if (
          !rfc0FinalValue ||
          rfc0FinalValue === "" ||
          rfc0FinalValue === "0"
        ) {
          return;
        }

        // If rfc-0 has value, prepare the record
        // eslint-disable-next-line
        const record: { material: string; [key: string]: any } = { material };

        // Add all RFC values (rfc-0, rfc-1, rfc-2, rfc-3)
        allRFCColumns.forEach((rfcColumn, index) => {
          // const editedValue = rowEdits[rfcColumn.key];
          // const originalValue = String(originalRow[rfcColumn.key] || "");
          // const finalValue =
          //   editedValue !== undefined ? editedValue : originalValue;
          const editedValue = rowEdits[rfcColumn.key];
          const originalValue = originalRow[rfcColumn.key];
          const finalValueRaw =
            editedValue !== undefined ? editedValue : originalValue;
          const finalValue =
            finalValueRaw === "" || finalValueRaw == null
              ? 0
              : Number(finalValueRaw);

          // For rfc-0, use the actual value
          // For previous RFC values (rfc-1, rfc-2, rfc-3), if empty send as 0, otherwise send the value
          if (index === 0) {
            record[`rfc-${index}`] = Number(finalValue);
          } else {
            record[`rfc-${index}`] =
              // finalValue === "" ||
              finalValue === null || finalValue === undefined
                ? 0
                : Number(finalValue);
          }
        });

        changedData.push(record);
      } else {
        // For non-Dawlance: Single RFC field
        // Only send if there are actual edits and RFC has a non-empty value
        if (Object.keys(rowEdits).length === 0) return;

        let totalRfc = 0;
        let hasValidRfc = false;

        allRFCColumns.forEach((rfcColumn) => {
          const editedValue = rowEdits[rfcColumn.key];
          const originalValue = String(originalRow[rfcColumn.key] || "");
          const finalValue =
            editedValue !== undefined ? editedValue : originalValue;

          if (
            finalValue !== "" &&
            finalValue !== "0" &&
            finalValue !== null &&
            finalValue !== undefined
          ) {
            totalRfc += Number(finalValue);
            hasValidRfc = true;
          }
        });

        // Only add if there's a valid RFC value
        if (hasValidRfc && totalRfc > 0) {
          changedData.push({
            material,
            rfc: totalRfc,
          });
        }
      }
    });

    return changedData;
  }, [getRFCColumns, option]);

  // UPDATED: Prepare changed data for save - follows your specific requirements
  const prepareSaveData = useCallback(() => {
    // eslint-disable-next-line
    const changedData: Array<{ material: string; [key: string]: any }> = [];
    const allRFCColumns = getRFCColumns();

    // Only process rows that have been actually edited
    Object.entries(editedValuesRef.current).forEach(([rowKey, rowEdits]) => {
      // Find the original row data
      const originalRow = originalRowDataRef.current.find(
        (row) => getRowKey(row) === rowKey
      );
      if (!originalRow) return;

      const material = String(originalRow["Material"] || "");
      if (!material) return;

      // Check if this row has actual changes
      const hasChanges = Object.keys(rowEdits).some((key) => {
        const editedValue = rowEdits[key];
        const originalValue = String(originalRow[key] || "");
        return editedValue !== undefined && editedValue !== originalValue;
      });

      if (!hasChanges) return;

      if (option === "dawlance") {
        // For Dawlance: Check if rfc-0 (latest month) has value
        const rfc0Column = allRFCColumns[0]; // Latest month is first column
        const rfc0EditedValue = rowEdits[rfc0Column?.key];
        const rfc0OriginalValue = String(originalRow[rfc0Column?.key] || "");
        const rfc0FinalValue =
          rfc0EditedValue !== undefined ? rfc0EditedValue : rfc0OriginalValue;

        // If rfc-0 is empty, don't send anything for this row
        if (
          !rfc0FinalValue ||
          rfc0FinalValue === "" ||
          rfc0FinalValue === "0"
        ) {
          return;
        }

        // If rfc-0 has value, prepare the record
        // eslint-disable-next-line
        const record: { material: string; [key: string]: any } = { material };

        // Add all RFC values (rfc-0, rfc-1, rfc-2, rfc-3)
        allRFCColumns.forEach((rfcColumn, index) => {
          const editedValue = rowEdits[rfcColumn.key];
          const originalValue = String(originalRow[rfcColumn.key] || "");

          // For rfc-0, use the actual value
          // For previous RFC values (rfc-1, rfc-2, rfc-3), if empty send as 0, otherwise send the value
          const finalValueRaw =
            editedValue !== undefined
              ? editedValue
              : originalRow[rfcColumn.key];
          const finalValue =
            finalValueRaw === "" || finalValueRaw == null
              ? 0
              : Number(finalValueRaw);
          record[`rfc-${index}`] = finalValue;
        });

        changedData.push(record);
      } else {
        // For non-Dawlance: Single RFC field
        // Omit all columns whose RFC is empty string
        let totalRfc = 0;
        let hasValidRfc = false;

        allRFCColumns.forEach((rfcColumn) => {
          const editedValue = rowEdits[rfcColumn.key];
          const originalValue = String(originalRow[rfcColumn.key] || "");
          const finalValue =
            editedValue !== undefined ? editedValue : originalValue;

          if (
            finalValue !== "" &&
            finalValue !== "0" &&
            finalValue !== null &&
            finalValue !== undefined
          ) {
            totalRfc += Number(finalValue);
            hasValidRfc = true;
          }
        });

        // Only add if there's a valid RFC value (omit empty ones)
        if (hasValidRfc && totalRfc > 0) {
          changedData.push({
            material,
            rfc: totalRfc,
          });
        }
      }
    });

    return changedData;
  }, [getRFCColumns, option]);

  // Create debounced autosave function
  const debouncedAutoSave = useCallback(
    debounce(() => {
      const changedData = prepareAutoSaveData();
      if (changedData.length > 0 && onAutoSave) {
        onAutoSave(changedData);
      }
    }, 3000),
    [prepareAutoSaveData, onAutoSave]
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

  const handleAutoSaveSignal = () => {
    autoSaveCheck?.();
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <RFCTableHeaders
        option={option}
        permission={permission}
        branchFilter={branchFilter}
        onPost={onPost}
        onSave={(branch, month, year, _) => {
          // Use the updated save data preparation
          const saveData = prepareSaveData();
          return onSave(branch, month, year, saveData);
        }}
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
        onAutoSave={handleAutoSaveSignal}
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
                      // UPDATED: Use consistent RFC column detection logic
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
