"use client";

import { useState, useCallback, useEffect } from "react";
import type { RowDataType, ColumnConfig, PermissionConfig } from "@/lib/types";
import { transformArrayFromApiFormat } from "@/lib/data-transformers";
import { RFCTable } from "@/components/rfc-table/DataTable";
import { toast } from "sonner";

export default function DawlanceRFC() {
  // Original data from API (unfiltered)
  const [originalRowData, setOriginalRowData] = useState<RowDataType[]>([]);
  const [warningMessage, setWarningMessage] = useState("");
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
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>("");
  const [permission, setPermission] = useState<PermissionConfig | null>(null);
  const [summaryData, setSummaryData] = useState([]);
  const [isAutoSaving, setIsAutoSaving] = useState(0);

  // which columns to have the filter on
  const filterableColumns = ["Product"];

  // refresh the page when auto-save
  useEffect(() => {
    if (currentBranch && currentMonth && currentYear) {
      fetchDawlanceRFCData(currentBranch, currentMonth, currentYear);
    }
  }, [isAutoSaving]);

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
      setSummaryData([]);

      try {
        const queryParams = new URLSearchParams({
          month,
          year,
        });

        const authToken = localStorage.getItem("token");

        // Fetch data api
        const fetchEndpoint = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/dawlance-rfc?${queryParams.toString()}`;

        // fetch Summary Data
        const fetchSummaryData = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/dawlance-rfc-product?${queryParams.toString()}`;

        queryParams.append("branch", "Dawlance");

        // get permission data
        const permissionEndpoint = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/rfc/lock?${queryParams.toString()}`;

        const [
          fetchEndpointResponse,
          fetchSummaryDataResponse,
          permissionEndpointResponse,
        ] = await Promise.all([
          fetch(fetchEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }),

          fetch(fetchSummaryData, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }),

          fetch(permissionEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }),
        ]);

        // for fetch data
        const data = await fetchEndpointResponse.json();
        const parsedData = typeof data === "string" ? JSON.parse(data) : data;
        setWarningMessage(data?.warning);

        const summaryData = await fetchSummaryDataResponse.json();
        setSummaryData(summaryData?.data);

        // setting permission data
        const permissionData = await permissionEndpointResponse.json();
        setPermission({
          post_allowed: permissionData?.data?.permission?.post_allowed,
          save_allowed: permissionData?.data?.permission?.save_allowed,
        });

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
          setSummaryData([]);
          setColumns([]);
        }
      } catch (error) {
        console.error("Error fetching branch rfc data", error);
        setOriginalRowData([]);
        setFilteredRowData([]);
        setSummaryData([]);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    },
    [applyFiltersToData, columnFilters, isAutoSaving]
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
      const authToken = localStorage.getItem("token");
      setPosting(true);

      try {
        const queryParams = new URLSearchParams({
          month,
          year,
        }).toString();

        const dawlanceRFCPost = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc?${queryParams}`;

        const dawlanceRFCSave = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-save?${queryParams}`;

        // Calling both APIs in parallel
        const [branchRfcResponse, secondApiResponse] = await Promise.all([
          fetch(dawlanceRFCPost, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(data),
          }),
          fetch(dawlanceRFCSave, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(data),
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
        toast.success("Values Posted Successfully");
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
        const queryParams = new URLSearchParams({
          month,
          year,
        }).toString();

        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-save?${queryParams}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

      try {
        const queryParams = new URLSearchParams({
          month: currentMonth,
          year: currentYear,
        }).toString();

        const authToken = localStorage.getItem("token");
        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-rfc-save?${queryParams}`;

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

        if (response.ok) {
          setIsAutoSaving((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Error auto-saving RFC data:", error);
      }
    },
    [currentBranch, currentMonth, currentYear]
  );

  const handleOnSaveTrigger = () => {
    setIsAutoSaving((prev) => prev + 1);
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 md:gap-6">
        <RFCTable
          permission={permission}
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
          filterableColumns={filterableColumns}
          columnFilters={columnFilters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          editedValues={editedValues}
          onEditedValuesChange={handleEditedValuesChange}
          summaryData={summaryData}
          option={"dawlance"}
          warningMessage={warningMessage}
          autoSaveCheck={handleOnSaveTrigger}
        />
      </div>
    </div>
  );
}
