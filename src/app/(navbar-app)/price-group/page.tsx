"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type {
  RowDataType,
  PaginationData,
  FieldConfig,
  ColumnConfig,
} from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import {
  transformToApiFormat,
  transformArrayFromApiFormat,
  extractFields,
} from "@/lib/data-transformers";
import { cn } from "@/lib/utils";
import { RightSheet } from "@/components/right-sheet/RightSheet";
import SearchComponent from "@/components/SearchComponent";
import { toast } from "sonner";

export default function PriceGroup() {
  const [selectedRow, setSelectedRow] = useState<RowDataType | null>(null);
  const [selectedRows, setSelectedRows] = useState<RowDataType[]>([]);
  const [rowData, setRowData] = useState<RowDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(
    null
  );
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Pagination states
  const [pagination, setPagination] = useState<PaginationData>({
    total_records: 0,
    records_per_page: 50,
    page: 1,
    total_pages: 0,
  });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Define field configuration for the RightSheet
  const fieldConfig: FieldConfig[] = [
    {
      key: "Price Group",
      label: "Price Group",
      type: "text",
      readOnly: false,
    },
    {
      key: "Min Price",
      label: "Min Price",
      type: "number",
      readOnly: false,
    },
    {
      key: "Max Price",
      label: "Max Price",
      type: "number",
      readOnly: false,
    },
  ];

  const columns: readonly ColumnConfig[] = [
    { key: "Price Group", label: "Price Group" },
    { key: "Min Price", label: "Min Price" },
    { key: "Max Price", label: "Max Price" },
  ];

  // fetch prices data
  const fetchPricesData = async (
    searchParams: Record<string, string> = {},
    page = 1,
    recordsPerPage = 50
  ) => {
    setLoading(true);
    try {
      let endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/pricegroups`;

      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", recordsPerPage.toString());
      const hasSearchParams = Object.keys(searchParams).length > 0;

      if (hasSearchParams) {
        const apiSearchParams = transformToApiFormat(searchParams);
        Object.entries(apiSearchParams).forEach(([field, value]) => {
          queryParams.append(field, value);
        });
      }

      endpoint = `${endpoint}?${queryParams.toString()}`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();

      const parsedData = typeof data === "string" ? JSON.parse(data) : data;

      if (parsedData && parsedData.data && Array.isArray(parsedData.data)) {
        const transformedData = transformArrayFromApiFormat(
          parsedData.data
        ) as RowDataType[];
        setRowData(transformedData);

        if (parsedData.pagination) {
          setPagination(parsedData.pagination);
        }
      } else {
        console.error("Invalid data structure received:", parsedData);
        setRowData([]);
      }
    } catch (error) {
      console.error("Error fetching data", error);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (
    field: string,
    query: string
  ): Promise<string[]> => {
    if (!query.trim()) return [];

    try {
      const fieldForApi = field.replace(/\s+/g, "_");
      const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/phaseinout/distinct/${fieldForApi}?filt=${query}`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch suggestions: ${res.status}`);
      }

      const data = await res.json();

      if (data && typeof data === "object") {
        // Try multiple key formats to match the response
        const possibleKeys = [
          field,
          fieldForApi,
          field.toLowerCase(),
          fieldForApi.toLowerCase(),
          field.toLowerCase().replace(/\s+/g, "_"),
        ];

        // Find the matching key in the response
        const matchingKey = Object.keys(data).find((responseKey) =>
          possibleKeys.some(
            (possibleKey) =>
              responseKey.toLowerCase() === possibleKey.toLowerCase() ||
              responseKey.toLowerCase().replace(/\s+/g, "_") ===
                possibleKey.toLowerCase().replace(/\s+/g, "_")
          )
        );

        if (matchingKey && Array.isArray(data[matchingKey])) {
          return data[matchingKey];
        }

        // If no exact match, try to find any key that contains our field name
        const partialMatchKey = Object.keys(data).find((responseKey) =>
          possibleKeys.some((possibleKey) => {
            const normalizedResponseKey = responseKey
              .toLowerCase()
              .replace(/[_\s]+/g, "");
            const normalizedPossibleKey = possibleKey
              .toLowerCase()
              .replace(/[_\s]+/g, "");
            return (
              normalizedResponseKey.includes(normalizedPossibleKey) ||
              normalizedPossibleKey.includes(normalizedResponseKey)
            );
          })
        );

        if (partialMatchKey && Array.isArray(data[partialMatchKey])) {
          return data[partialMatchKey];
        }
      }

      return [];
    } catch (error) {
      console.error(`Error fetching suggestions for ${field}:`, error);
      return [];
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setDeleting(true);
    try {
      const pricegroupIDs = extractFields(selectedRows, "Price Group");

      const deletePayload = {
        material: pricegroupIDs,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/prices/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(deletePayload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh data after deletion
      fetchPricesData({}, currentPage, pageSize);

      // Clear selections
      setSelectedRows([]);
      setSelectedRow(null);
      setSelectedRowId(null);
    } catch (error) {
      console.error("Error deleting records:", error);
    } finally {
      toast.success("Records deleted successfully");
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    // Clear any existing search timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Reset to first page and fetch data without any filters
    setCurrentPage(1);
    fetchPricesData({}, 1, pageSize);
  };

  // Pagination handlers
  const handlePageSizeChange = (newPageSize: string) => {
    const size = Number.parseInt(newPageSize);
    setPageSize(size);
    setCurrentPage(1);
    fetchPricesData({}, 1, size);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchPricesData({}, newPage, pageSize);
  };

  useEffect(() => {
    fetchPricesData({}, currentPage, pageSize);
  }, []);

  // Handle search with debouncing
  const handleSearch = (searchParams: Record<string, string>) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      fetchPricesData(searchParams, 1, pageSize);
    }, 500); // 0.5 seconds

    setSearchTimeout(timeout);
  };

  // Handle row selection
  const handleRowSelect = (row: RowDataType, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, row]);
    } else {
      setSelectedRows((prev) =>
        prev.filter((r) => r["Price Group"] !== row["Price Group"])
      );
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows([...rowData]);
    } else {
      setSelectedRows([]);
    }
  };

  // Handle row click
  const handleRowClick = (row: RowDataType) => {
    setIsSheetOpen(true);
    const clickedRowId = row["Price Group"];

    // If clicking the same row, toggle the sheet
    if (selectedRowId === clickedRowId) {
      setSelectedRow(null);
      setSelectedRowId(null);
    } else {
      // Select new row
      setSelectedRow(row);
      setSelectedRowId(clickedRowId);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = async (data: Record<string, any>): Promise<void> => {
    try {
      // Transform data to API format before sending
      const apiFormattedData = transformToApiFormat(data);
      const isUpdate = !!selectedRowId;

      const endpoint = isUpdate
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/pricegroups/update/${selectedRowId}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/pricegroups/add`;

      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(apiFormattedData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRowData((prevData) =>
        prevData.map((row) =>
          row["Price Group"] === data["Price Group"] ? { ...row, ...data } : row
        )
      );

      if (method === "POST") {
        toast.success("Master ID created successfully");
      } else {
        toast.success("Master ID updated successfully");
      }

      // Update selected row data
      setSelectedRow(data as RowDataType);
    } catch (error) {
      console.error("Error saving pricing data:", error);
      throw error;
    }
  };

  const handleAddClick = () => {
    setIsSheetOpen(true);
  };

  //   const excludedKeys = ["Master ID"];
  const excludedKeys = [""];

  const filteredFieldConfig = fieldConfig.filter(
    (field) => !excludedKeys.includes(field.key)
  );

  return (
    <div className="w-full h-[85vh] p-2 overflow-hidden">
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
        <div
          className={cn(
            "w-full flex-shrink-0 h-full overflow-hidden",
            "transition-all duration-300 ease-in-out",
            isCollapsed ? "lg:w-[300px]" : "lg:w-[70px]"
          )}
        >
          <div className="h-full overflow-auto">
            <SearchComponent
              fields={columns}
              onSearch={handleSearch}
              onClearFilters={handleClearFilters}
              fetchSuggestions={fetchSuggestions}
              setIsCollapsed={setIsCollapsed}
              isCollapsed={isCollapsed}
            />
          </div>
        </div>

        <div className="flex-1 h-full overflow-hidden min-w-0">
          <DataTable
            selectionValue="Price Group"
            loading={loading}
            deleting={deleting}
            data={rowData}
            selectedRows={selectedRows}
            selectedRowId={selectedRowId}
            pagination={pagination}
            currentPage={currentPage}
            pageSize={pageSize}
            columns={columns}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onRowClick={handleRowClick}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={handlePageChange}
            onDeleteClick={() => setShowDeleteDialog(true)}
            onAddClick={handleAddClick}
          />
        </div>

        <RightSheet
          parent={"prices"}
          selectedRow={selectedRow}
          onReset={() => {
            setSelectedRow(null);
            setIsSheetOpen(false);
          }}
          onSave={handleSave}
          fields={selectedRow ? fieldConfig : filteredFieldConfig}
          title={selectedRow ? "Edit Entry" : "Create New Price"}
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
        />
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        description={`Are you sure you want to delete ${
          selectedRows.length
        } record${
          selectedRows.length > 1 ? "s" : ""
        }? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
