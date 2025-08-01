"use client";

import { useEffect, useState } from "react";
// import { RightSheet } from "@/components/RightSheet";
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
import { RightSheet } from "@/components/right-sheet/RightSheet";

export default function Users() {
  const [selectedRow, setSelectedRow] = useState<RowDataType | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
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

  // Define field configuration for the RightSheet with select dropdowns
  const fieldConfig: FieldConfig[] = [
    { key: "username", label: "Name", type: "text", required: true },
    {
      key: "email",
      label: "Email",
      type: "text",
      required: true,
    },
    {
      key: "password",
      label: "Password",
      type: "text",
      required: true,
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      required: true,
      apiEndpoint: `${process.env.NEXT_PUBLIC_BASE_URL}/roles`,
    },
    {
      key: "branch",
      label: "Branch",
      type: "select",
      apiEndpoint: `${process.env.NEXT_PUBLIC_BASE_URL}/branches/distinct/branch_code`,
    },
    {
      key: "product",
      label: "Product",
      type: "select",
      apiEndpoint: `${process.env.NEXT_PUBLIC_BASE_URL}/mastercoding/distinct/product`,
    },
  ];

  const columns: readonly ColumnConfig[] = [
    { key: "Name", label: "Name" },
    { key: "Email", label: "Email" },
    { key: "Role", label: "Role" },
    { key: "Branch", label: "Branch" },
    { key: "Product", label: "Product" },
  ];

  const fetchUserData = async (
    searchParams: Record<string, string> = {},
    page = 1,
    recordsPerPage = 50
  ) => {
    setLoading(true);
    try {
      let endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/users`;

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
      const masterIds = extractFields(selectedRows, "Master ID");

      const deletePayload = {
        master_id: masterIds,
      };

      const authToken = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/mastercoding/delete`,
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
      fetchUserData({}, currentPage, pageSize);

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
    fetchUserData({}, 1, size);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchUserData({}, newPage, pageSize);
  };

  useEffect(() => {
    fetchUserData({}, currentPage, pageSize);
  }, []);

  // Handle row selection
  const handleRowSelect = (row: RowDataType, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, row]);
    } else {
      setSelectedRows((prev) =>
        prev.filter((r) => r["Master ID"] !== row["Master ID"])
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
    const clickedRowId = row["Master ID"];

    // If clicking the same row, toggle the sheet
    if (selectedRowId === clickedRowId) {
      setSelectedRow(null);
      setSelectedRowId(null);
    } else {
      // Select new row
      // setSelectedRow(row);
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
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/mastercoding/update/${selectedRowId}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/register`;

      const method = isUpdate ? "PUT" : "POST";
      const authToken = localStorage.getItem("token");

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
          row["Master ID"] === data["Master ID"] ? { ...row, ...data } : row
        )
      );

      // Update selected row data
      // setSelectedRow(data as RowDataType);
    } catch (error) {
      console.error("Error saving user data:", error);
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
            selectionValue="User"
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
          parent={"users"}
          selectedRow={selectedRow}
          onReset={() => {
            setSelectedRow(null);
            setIsSheetOpen(false);
          }}
          onSave={handleSave}
          fields={selectedRow ? fieldConfig : filteredFieldConfig}
          title={selectedRow ? "Edit User Information" : "Create New User"}
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
