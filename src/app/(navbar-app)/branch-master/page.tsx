"use client";

import { useEffect, useState } from "react";
import { RightSheet } from "@/components/RightSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type {
  RowDataType,
  PaginationData,
  FieldConfig,
  ColumnConfig,
} from "@/lib/types";
import { DataTable } from "@/components/DataTable/DataTable";
import {
  transformToApiFormat,
  transformArrayFromApiFormat,
  extractFields,
} from "@/lib/data-transformers";

export default function Branchmaster() {
  const [selectedRow, setSelectedRow] = useState<RowDataType | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<RowDataType[]>([]);
  const [rowData, setRowData] = useState<RowDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
      key: "Branch Code",
      label: "Branch Code",
      type: "text",
      required: true,
    },
    {
      key: "Sales Branch",
      label: "Sales Branch",
      type: "text",
      required: true,
    },
    {
      key: "Sales Office",
      label: "Sales Office",
      type: "text",
      required: true,
    },
    {
      key: "Branch Manager",
      label: "Branch Manager",
      type: "text",
      required: true,
    },
  ];

  const columns: readonly ColumnConfig[] = [
    { key: "Branch Code", label: "Branch Code" },
    { key: "Sales Branch", label: "Sales Branch" },
    { key: "Sales Office", label: "Sales Office" },
    { key: "Branch Manager", label: "Branch Manager" },
  ];

  const fetchBranchData = async (
    searchParams: Record<string, string> = {},
    page = 1,
    recordsPerPage = 50
  ) => {
    setLoading(true);
    try {
      let endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/branches`;

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
      const authToken = localStorage.getItem("token");
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
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

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setDeleting(true);
    try {
      const branchcodes = extractFields(selectedRows, "Branch Code");

      const deletePayload = {
        branch_code: branchcodes,
      };

      const authToken = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/branches/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(deletePayload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh data after deletion
      fetchBranchData({}, currentPage, pageSize);

      // Clear selections
      setSelectedRows([]);
      setSelectedRow(null);
      setSelectedRowId(null);
    } catch (error) {
      console.error("Error deleting records:", error);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Pagination handlers
  const handlePageSizeChange = (newPageSize: string) => {
    const size = Number.parseInt(newPageSize);
    setPageSize(size);
    setCurrentPage(1);
    fetchBranchData({}, 1, size);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchBranchData({}, newPage, pageSize);
  };

  useEffect(() => {
    fetchBranchData({}, currentPage, pageSize);
    // eslint-disable-next-line
  }, []);

  // Handle row selection
  const handleRowSelect = (row: RowDataType, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, row]);
    } else {
      setSelectedRows((prev) =>
        prev.filter((r) => r["Branch Code"] !== row["Branch Code"])
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
    const clickedRowId = String(row["Branch Code"]);

    if (String(selectedRowId) === clickedRowId) {
      setSelectedRow(null);
      setSelectedRowId(null);
    } else {
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
      const authToken = localStorage.getItem("token");

      const endpoint = isUpdate
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/branches/update`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/branches`;

      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(apiFormattedData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRowData((prevData) =>
        prevData.map((row) =>
          row["Branch Code"] === data["Branch Code"] ? { ...row, ...data } : row
        )
      );

      // Update selected row data
      setSelectedRow(data as RowDataType);
    } catch (error) {
      console.error("Error saving branch master data:", error);
      throw error;
    }
  };

  const handleAddClick = () => {
    setIsSheetOpen(true);
  };

  const excludedKeys = [""];

  const filteredFieldConfig = fieldConfig.filter(
    (field) => !excludedKeys.includes(field.key)
  );

  return (
    <div className="w-full h-[85vh] p-2 overflow-hidden">
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
        <div className="flex-1 h-full overflow-hidden min-w-0">
          <DataTable
            selectionValue="Branch"
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
          parent={"branch-master"}
          selectedRow={selectedRow}
          onReset={() => {
            setSelectedRow(null);
            setIsSheetOpen(false);
          }}
          onSave={handleSave}
          fields={selectedRow ? fieldConfig : filteredFieldConfig}
          title={selectedRow ? "Edit Branch Information" : "Create New Branch"}
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
