"use client";

import { useState, useCallback, useEffect } from "react";
import type { RowDataType, ColumnConfig, PermissionConfig } from "@/lib/types";
import { transformArrayFromApiFormat } from "@/lib/data-transformers";
import { RFCTable } from "@/components/rfc-table/DataTable";
import { toast } from "sonner";

export default function MarketingRFC() {
  const [originalRowData, setOriginalRowData] = useState<RowDataType[]>([]);
  const [warningMessage, setWarningMessage] = useState("");
  const [filteredRowData, setFilteredRowData] = useState<RowDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [columns, setColumns] = useState<readonly ColumnConfig[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(
    {}
  );
  const [editedValues, setEditedValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [permission, setPermission] = useState<PermissionConfig | null>(null);
  const [summaryData, setSummaryData] = useState([]);
  // const [autoSaving, setAutoSaving] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>("");

  const filterableColumns = ["Product"];

  const generateColumnsFromData = (
    data: RowDataType[]
  ): readonly ColumnConfig[] => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    const columnOrder = [
      "Branch",
      "Material",
      "Material Description",
      "Product",
      "Last RFC",
    ];

    const knownColumns: string[] = [];
    const dynamicColumns: string[] = [];

    keys.forEach((key) => {
      if (columnOrder.includes(key)) {
        knownColumns.push(key);
      } else {
        dynamicColumns.push(key);
      }
    });

    knownColumns.sort(
      (a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b)
    );

    dynamicColumns.sort((a, b) => {
      const aIsSales = a.includes("Sales");
      const bIsSales = b.includes("Sales");
      const aIsRFC = a.includes("RFC");
      const bIsRFC = b.includes("RFC");

      if (aIsSales && !bIsSales) return -1;
      if (!aIsSales && bIsSales) return 1;
      if (aIsRFC && !bIsRFC) return 1;
      if (!aIsRFC && bIsRFC) return -1;

      if (aIsRFC && bIsRFC) {
        const parseDate = (label: string) => {
          const [monthStr, yearStr] = label.trim().split(" ")[0].split("-");
          const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          return new Date(Number(yearStr), months.indexOf(monthStr));
        };
        // return parseDate(a) - parseDate(b);
        return parseDate(a).getTime() - parseDate(b).getTime();
      }

      return a.localeCompare(b);
    });

    const orderedKeys = [...knownColumns, ...dynamicColumns];

    return orderedKeys.map((key) => ({
      key,
      label: key,
    }));
  };

  const applyFiltersToData = useCallback(
    (data: RowDataType[], filters: Record<string, string[]>) => {
      if (!data || data.length === 0) return data;
      const hasActiveFilters = Object.values(filters).some(
        (filterValues) => filterValues.length > 0
      );
      if (!hasActiveFilters) return data;

      return data.filter((row) => {
        for (const [columnKey, selectedValues] of Object.entries(filters)) {
          if (selectedValues.length === 0) continue;
          const cellValue = String(row[columnKey] || "").trim();
          if (!selectedValues.includes(cellValue)) return false;
        }
        return true;
      });
    },
    []
  );

  const applyCurrentFilters = useCallback(() => {
    const filtered = applyFiltersToData(originalRowData, columnFilters);
    setFilteredRowData(filtered);
  }, [originalRowData, columnFilters, applyFiltersToData]);

  const fetchBranchRFCData = useCallback(
    async (branch: string, month: string, year: string) => {
      setLoading(true);
      setCurrentBranch(branch);
      setCurrentMonth(month);
      setCurrentYear(year);

      try {
        const queryParams = new URLSearchParams({ month, year });
        const fetchEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/marketing-rfc?${queryParams}`;
        const permissionParams = new URLSearchParams(queryParams);
        permissionParams.append("branch", "Marketing");
        const permissionEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/rfc/lock?${permissionParams}`;
        const RFCProductEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/marketing-rfc-product?${queryParams}`;

        const authToken = localStorage.getItem("token");

        const [fetchRes, permissionRes, productRes] = await Promise.all([
          fetch(fetchEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }),

          fetch(
            permissionEndpoint,

            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
            }
          ),

          fetch(RFCProductEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }),
        ]);

        const productData = await productRes.json();
        setSummaryData(productData?.data);

        const permissionData = await permissionRes.json();
        setPermission({
          post_allowed: permissionData?.data?.permission?.post_allowed,
          save_allowed: permissionData?.data?.permission?.save_allowed,
        });

        const data = await fetchRes.json();
        const parsedData = typeof data === "string" ? JSON.parse(data) : data;
        setWarningMessage(data?.warning);

        if (parsedData?.data && Array.isArray(parsedData.data)) {
          const transformedData = transformArrayFromApiFormat(
            parsedData.data
          ) as RowDataType[];
          setOriginalRowData(transformedData);
          const filtered = applyFiltersToData(transformedData, columnFilters);
          setFilteredRowData(filtered);
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

  useEffect(() => {
    applyCurrentFilters();
  }, [applyCurrentFilters]);

  const handleFilterChange = useCallback(
    (filters: Record<string, string[]>) => {
      setColumnFilters(filters);
    },
    []
  );

  const handleApplyFilters = useCallback(() => {
    applyCurrentFilters();
  }, [applyCurrentFilters]);

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
        const authToken = localStorage.getItem("token");
        const query = new URLSearchParams({ month, year }).toString();

        const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/marketing-rfc?${query}`;
        const saveUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/marketing-rfc-save?${query}`;

        const [postRes, saveRes] = await Promise.all([
          fetch(postUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(data),
          }),
          fetch(saveUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(data),
          }),
        ]);

        if (!postRes.ok || !saveRes.ok) {
          throw new Error(
            `Post failed with status: ${postRes.status}, Save failed with status: ${saveRes.status}`
          );
        }

        await fetchBranchRFCData(branch, month, year);
      } catch (error) {
        console.error("Error posting RFC data:", error);
      } finally {
        setPosting(false);
        toast.success("Data posted successfully");
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
    ) => {
      setSaving(true);
      try {
        const query = new URLSearchParams({ month, year }).toString();
        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/marketing-rfc-save?${query}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(changedData),
        });

        if (!response.ok) {
          toast.error("Save failed");
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        toast.success("Changes saved successfully");
        await fetchBranchRFCData(branch, month, year);
      } catch (error) {
        console.error("Error saving RFC data:", error);
        toast.error("Failed to save changes");
      } finally {
        setSaving(false);
      }
    },
    [fetchBranchRFCData]
  );

  const handleAutoSave = useCallback(
    // eslint-disable-next-line
    async (changedData: Array<{ material: string; [key: string]: any }>) => {
      if (
        !currentBranch ||
        !currentMonth ||
        !currentYear ||
        changedData.length === 0
      )
        return;
      // setAutoSaving(true);
      try {
        const query = new URLSearchParams({
          month: currentMonth,
          year: currentYear,
        }).toString();
        const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/marketing-rfc-save?${query}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(changedData),
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        console.error("Error auto-saving RFC data:", error);
      }
      //  finally {
      //   setAutoSaving(false);
      // }
    },
    [currentBranch, currentMonth, currentYear]
  );

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
          option={"marketing"}
          warningMessage={warningMessage}
        />
      </div>
    </div>
  );
}
