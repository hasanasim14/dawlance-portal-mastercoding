"use client";

import { useState, useCallback, useEffect } from "react";
import type { RowDataType, ColumnConfig } from "@/lib/types";
import { transformArrayFromApiFormat } from "@/lib/data-transformers";
import { RFCTable } from "@/components/rfcTable/DataTable";

export default function DawlanceRFC() {
  // Original data from API (unfiltered)
  const [originalRowData, setOriginalRowData] = useState<RowDataType[]>([]);
  // Store the filtered data
  const [filteredRowData, setFilteredRowData] = useState<RowDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [columns, setColumns] = useState<readonly ColumnConfig[]>([]);
  // State for column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(
    {}
  );
  // Store which rows are edited - now supports multiple RFC columns per row
  const [editedValues, setEditedValues] = useState<
    Record<string, Record<string, string>>
  >({});
  // Autosave state
  // eslint-disable-next-line
  const [autoSaving, setAutoSaving] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>("");
  const [summaryData, setSummaryData] = useState([]);

  // which columns to have the filter on
  const filterableColumns = ["Product"];

  // Generate columns from API response data
  const generateColumnsFromData = (
    data: RowDataType[]
  ): readonly ColumnConfig[] => {
    if (!data || data.length === 0) {
      return [];
    }

    // Get all unique keys from the first row
    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Define the preferred order of columns
    const columnOrder = [
      "Material",
      "Material Description",
      "Product",
      "Last RFC",
    ];

    // Separate known columns from dynamic ones
    const knownColumns: string[] = [];
    const dynamicColumns: string[] = [];

    keys.forEach((key) => {
      if (columnOrder.includes(key)) {
        knownColumns.push(key);
      } else {
        dynamicColumns.push(key);
      }
    });

    // Sort known columns only
    knownColumns.sort(
      (a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b)
    );

    const orderedKeys = [...knownColumns, ...dynamicColumns];

    // Convert to ColumnConfig format
    return orderedKeys.map((key) => ({
      key,
      label: key,
    }));
  };

  // Filtering function
  const applyFiltersToData = useCallback(
    (data: RowDataType[], filters: Record<string, string[]>) => {
      if (!data || data.length === 0) return data;

      // If no filters are applied, return all data
      const hasActiveFilters = Object.values(filters).some(
        (filterValues) => filterValues.length > 0
      );

      if (!hasActiveFilters) return data;

      return data.filter((row) => {
        for (const [columnKey, selectedValues] of Object.entries(filters)) {
          if (selectedValues.length === 0) continue;

          const cellValue = String(row[columnKey] || "").trim();

          // If the cell value is not in the selected values, exclude this row
          if (!selectedValues.includes(cellValue)) {
            return false;
          }
        }
        return true;
      });
    },
    []
  );

  // Apply filters whenever filters change
  const applyCurrentFilters = useCallback(() => {
    const filtered = applyFiltersToData(originalRowData, columnFilters);
    setFilteredRowData(filtered);
  }, [originalRowData, columnFilters, applyFiltersToData]);

  // Get the branch-rfc data
  const fetchDawlanceRFCData = useCallback(
    async (branch: string, month: string, year: string) => {
      setLoading(true);
      setCurrentBranch(branch);
      setCurrentMonth(month);
      setCurrentYear(year);

      try {
        const queryParams = new URLSearchParams({
          branch,
          month,
          year,
        });

        // Fetch data api
        const fetchEndpoint = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/dawlance-rfc?${queryParams.toString()}`;

        // fetch summary table data
        const RFCProductEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-product?${queryParams}`;

        const [fetchEndpointResponse, rfcProductResponse] = await Promise.all([
          fetch(fetchEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }),

          fetch(RFCProductEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }),
        ]);

        // for summary data
        const productData = await rfcProductResponse.json();
        setSummaryData(productData?.data);

        // for fetch data
        const data = await fetchEndpointResponse.json();
        const parsedData = typeof data === "string" ? JSON.parse(data) : data;

        if (parsedData && parsedData.data && Array.isArray(parsedData.data)) {
          const transformedData = transformArrayFromApiFormat(
            parsedData.data
          ) as RowDataType[];

          setOriginalRowData(transformedData);
          const filtered = applyFiltersToData(transformedData, columnFilters);
          setFilteredRowData(filtered);

          // Generate columns based on actual response data
          const generatedColumns = generateColumnsFromData(transformedData);
          setColumns(generatedColumns);
          setEditedValues({});
        } else {
          console.error("Invalid data structure received:", parsedData);
          setOriginalRowData([]);
          setFilteredRowData([]);
          setColumns([]);
        }
      } catch (error) {
        console.error("Error fetching branch rfc data", error);
        setOriginalRowData([]);
        setFilteredRowData([]);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    },
    [applyFiltersToData, columnFilters]
  );

  // Apply filters when columnFilters change
  useEffect(() => {
    applyCurrentFilters();
  }, [applyCurrentFilters]);

  // Handle filter changes - update the local state
  const handleFilterChange = useCallback(
    (filters: Record<string, string[]>) => {
      setColumnFilters(filters);
    },
    []
  );

  const handleApplyFilters = useCallback(() => {
    applyCurrentFilters();
  }, [applyCurrentFilters]);

  // Handle edited values change
  const handleEditedValuesChange = useCallback(
    (newEditedValues: Record<string, Record<string, string>>) => {
      setEditedValues(newEditedValues);
    },
    []
  );

  const handlePost = useCallback(
    async (
      branch: string,
      month: string,
      year: string,
      data: RowDataType[]
    ) => {
      setPosting(true);
      try {
        // Find all RFC columns that are month-year RFC format
        const rfcColumns = columns.filter((col) => {
          const key = col.key;
          return (
            key.includes("RFC") &&
            key.endsWith(" RFC") &&
            !key.includes("Branch") &&
            !key.includes("Marketing") &&
            !key.includes("Last")
          );
        });

        if (rfcColumns.length === 0) {
          throw new Error("RFC columns not found");
        }

        // Helper function to get row key (same as in DataTable)
        const getRowKey = (row: RowDataType): string => {
          return `${row["Material"] || ""}_${row["Branch"] || ""}`;
        };

        // Only include rows that have been modified and have valid RFC changes
        // eslint-disable-next-line
        const postData: Array<{ material: string; [key: string]: any }> = [];

        data.forEach((row) => {
          const rowKey = getRowKey(row);
          const rowEdits = editedValues[rowKey];

          // Only process rows that have been edited
          if (rowEdits) {
            // eslint-disable-next-line
            const record: { material: string; [key: string]: any } = {
              material: String(row["Material"] || ""),
            };

            let hasValidChanges = false;

            // Handle single RFC vs multiple RFCs - only include changed values
            if (rfcColumns.length === 1) {
              const rfcValue = rowEdits[rfcColumns[0].key];
              if (
                rfcValue !== undefined &&
                rfcValue !== "" &&
                rfcValue !== null
              ) {
                record.rfc = Number(rfcValue) || 0;
                hasValidChanges = true;
              }
            } else {
              // Multiple RFCs - only include the ones that were actually changed
              rfcColumns.forEach((rfcColumn, index) => {
                const rfcValue = rowEdits[rfcColumn.key];
                if (
                  rfcValue !== undefined &&
                  rfcValue !== "" &&
                  rfcValue !== null
                ) {
                  record[`rfc${index}`] = Number(rfcValue) || 0;
                  hasValidChanges = true;
                }
              });
            }

            // Only add the record if it has valid changes
            if (hasValidChanges) {
              postData.push(record);
            }
          }
        });

        // If no changes to post, show message
        if (postData.length === 0) {
          alert("No changes to post. Please edit some RFC values first.");
          return;
        }

        const dawlanceRFCPost = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc`;
        const dawlanceRFCSave = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-save`;

        // Calling both APIs in parallel
        const [branchRfcResponse, secondApiResponse] = await Promise.all([
          fetch(dawlanceRFCPost, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(postData),
          }),
          fetch(dawlanceRFCSave, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(postData),
          }),
        ]);

        if (!branchRfcResponse.ok) {
          throw new Error(
            `Branch RFC API error! status: ${branchRfcResponse.status}`
          );
        }

        if (!secondApiResponse.ok) {
          throw new Error(
            `Second API error! status: ${secondApiResponse.status}`
          );
        }

        await fetchDawlanceRFCData(branch, month, year);
      } catch (error) {
        console.error("Error posting RFC data:", error);
      } finally {
        setPosting(false);
      }
    },
    [fetchDawlanceRFCData, columns, editedValues]
  );

  const handleSave = useCallback(
    async (
      branch: string,
      month: string,
      year: string,
      // eslint-disable-next-line
      changedData: Array<{ material: string; [key: string]: any }>
    ) => {
      setSaving(true);
      try {
        const authToken = localStorage.getItem("token");

        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-save`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(changedData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Refresh data after saving
        await fetchDawlanceRFCData(branch, month, year);
      } catch (error) {
        console.error("Error saving RFC data:", error);
      } finally {
        setSaving(false);
      }
    },
    [fetchDawlanceRFCData]
  );

  // Autosave function
  const handleAutoSave = useCallback(
    // eslint-disable-next-line
    async (changedData: Array<{ material: string; [key: string]: any }>) => {
      if (
        !currentBranch ||
        !currentMonth ||
        !currentYear ||
        changedData.length === 0
      ) {
        return;
      }

      setAutoSaving(true);
      try {
        // eslint-disable-next-line
        const query = new URLSearchParams({
          branch: currentBranch,
          month: currentMonth,
          year: currentYear,
        }).toString();

        const authToken = localStorage.getItem("token");
        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-save`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(changedData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Don't refresh data on autosave to avoid disrupting user input
        // await fetchDawlanceRFCData(currentBranch, currentMonth, currentYear);
      } catch (error) {
        console.error("Error auto-saving RFC data:", error);
        // toast.error("Auto-save failed");
      } finally {
        setAutoSaving(false);
      }
    },
    [currentBranch, currentMonth, currentYear]
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 md:gap-6">
        <RFCTable
          permission={1}
          branchFilter={false}
          rowData={filteredRowData}
          originalRowData={originalRowData}
          columns={columns}
          onPost={handlePost}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          onFetchData={fetchDawlanceRFCData}
          isLoading={loading}
          isSaving={saving}
          isPosting={posting}
          // isAutoSaving={autoSaving}
          filterableColumns={filterableColumns}
          columnFilters={columnFilters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          editedValues={editedValues}
          onEditedValuesChange={handleEditedValuesChange}
          summaryData={summaryData}
          option={"dawlance"}
        />
      </div>
    </div>
  );
}
