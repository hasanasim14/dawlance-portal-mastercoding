"use client";

import { useState, useCallback, useEffect } from "react";
import type { RowDataType, ColumnConfig } from "@/lib/types";
import { transformArrayFromApiFormat } from "@/lib/data-transformers";
import { RFCTable } from "@/components/rfcTable/DataTable";

export default function BranchRFC() {
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
  // Store which rows are edited
  const [editedValues, setEditedValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [permission, setPermission] = useState(0);
  const [summaryData, setSummaryData] = useState([]);

  //autosave state
  // eslint-disable-next-line
  const [autoSaving, setAutoSaving] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>("");

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
      // "Branch",
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

    // Sort known columns by preferred order
    knownColumns.sort(
      (a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b)
    );

    // Sort dynamic columns (sales columns first, then RFC columns)
    dynamicColumns.sort((a, b) => {
      const aIsSales = a.includes("Sales");
      const bIsSales = b.includes("Sales");
      const aIsRFC = a.includes("RFC");
      const bIsRFC = b.includes("RFC");

      // Sales columns come first
      if (aIsSales && !bIsSales) return -1;
      if (!aIsSales && bIsSales) return 1;

      // Then RFC columns
      if (aIsRFC && !bIsRFC) return 1;
      if (!aIsRFC && bIsRFC) return -1;

      // Alphabetical for same type
      return a.localeCompare(b);
    });

    // Combine all columns in order
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
  }, [originalRowData, columnFilters, applyFiltersToData, editedValues]);

  // Get the branch-rfc data
  const fetchBranchRFCData = useCallback(
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

        // get all data
        const fetchEndpoint = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/branch-rfc?${queryParams.toString()}`;

        // get post/save permission
        const permissionEndpoint = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/rfc/lock?${queryParams.toString()}`;

        // for summary data
        const RFCProductEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/branch-rfc-product?${queryParams}`;

        const [
          fetchEndpointResponse,
          permissionEndpointResponse,
          rfcProductResponse,
        ] = await Promise.all([
          fetch(fetchEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${authToken}`,
            },
          }),

          fetch(permissionEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${authToken}`,
            },
          }),
          // ]);

          fetch(RFCProductEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${authToken}`,
            },
          }),
        ]);

        //saving the RFC Summary data table
        const productData = await rfcProductResponse.json();
        setSummaryData(productData?.data);

        const permissionData = await permissionEndpointResponse.json();
        setPermission(permissionData?.data?.permission);

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
    [editedValues]
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
        const query = new URLSearchParams({
          branch,
          month,
          year,
        }).toString();

        // const authToken = localStorage.getItem("token");

        // Find the RFC column (same logic as in RFCTable component)
        const rfcColumn = columns.find(
          (col) => col.key.includes("RFC") && !col.key.includes("Last")
        );

        if (!rfcColumn) {
          throw new Error("RFC column not found");
        }

        // Transform data to only include material and rfc, same format as save API
        const postData = data.map((row) => ({
          material: String(row["Material"] || ""),
          rfc: String(row[rfcColumn.key] || ""),
        }));

        const branchRFCPostEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/branch-rfc?${query}`;
        const branchRFCSaveEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/branch-rfc-save?${query}`;

        // Calling both APIs in parallel
        const [branchRfcResponse, secondApiResponse] = await Promise.all([
          fetch(branchRFCPostEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(postData),
          }),
          fetch(branchRFCSaveEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${authToken}`,
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

        // const branchRfcResult = await branchRfcResponse.json();
        // const secondApiResult = await secondApiResponse.json();

        await fetchBranchRFCData(branch, month, year);
      } catch (error) {
        console.error("Error posting RFC data:", error);
      } finally {
        setPosting(false);
      }
    },
    [fetchBranchRFCData, columns]
  );

  const handleSave = useCallback(
    async (
      branch: string,
      month: string,
      year: string,
      // eslint-disable-next-line
      changedData: Array<{ material: string; [key: string]: any }>
      // changedData: Array<{ material: string; rfc: string }>
    ) => {
      setSaving(true);
      try {
        const query = new URLSearchParams({ branch, month, year }).toString();
        const authToken = localStorage.getItem("token");
        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/branch-rfc-save?${query}`;

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
        await fetchBranchRFCData(branch, month, year);
      } catch (error) {
        console.error("Error saving RFC data:", error);
      } finally {
        setSaving(false);
      }
    },
    [fetchBranchRFCData]
  );

  // Autosave function
  const handleAutoSave = useCallback(
    // eslint-disable-next-line
    async (changedData: Array<{ material: string; [key: string]: any }>) => {
      setAutoSaving(true);
      try {
        const query = new URLSearchParams({
          branch: currentBranch,
          month: currentMonth,
          year: currentYear,
        }).toString();

        // const authToken = localStorage.getItem("token");
        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/branch-rfc-save?${query}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(changedData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error("Error auto-saving RFC data:", error);
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
          permission={permission}
          branchFilter={true}
          rowData={filteredRowData}
          originalRowData={originalRowData}
          columns={columns}
          onPost={handlePost}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          onFetchData={fetchBranchRFCData}
          isLoading={loading}
          isSaving={saving}
          isPosting={posting}
          filterableColumns={filterableColumns}
          columnFilters={columnFilters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          editedValues={editedValues}
          onEditedValuesChange={handleEditedValuesChange}
          summaryData={summaryData}
          option={"branch"}
        />
      </div>
    </div>
  );
}
