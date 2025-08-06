"use client";

import type React from "react";
import type { PaginationData, PermissionConfig } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Upload, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getNextMonthAndYear } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DateFilter from "@/components/DateFilter";
import SKUValidations from "@/components/sku-offerings/Validations";

interface UploadedData {
  Material: string;
  "Material Description": string;
  Product: string;
}

interface FileUploadStatus {
  file: File | null;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  progress: number;
  lastUploaded: string | null;
  error?: string;
}

export default function SKUOfferings() {
  const [uploadStatus, setUploadStatus] = useState<FileUploadStatus>({
    file: null,
    status: "idle",
    progress: 0,
    lastUploaded: null,
  });
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [permission, setPermission] = useState<PermissionConfig | null>(null);
  const [apiResponse, setApiResponse] = useState<{ data?: string[] } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pagination, setPagination] = useState<PaginationData>({
    total_records: 0,
    records_per_page: 50,
    page: 1,
    total_pages: 0,
  });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const isBusy =
    uploadStatus.status === "uploading" || uploadStatus.status === "processing";

  useEffect(() => {
    const { month, year } = getNextMonthAndYear("offering");
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchOffering(currentPage, pageSize);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const localProductValue = localStorage.getItem("product");

    const fetchMaterials = async () => {
      try {
        const authToken = localStorage.getItem("token");

        const productPromise = fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/mastercoding/distinct/product`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        // Only build lockPromise if month and year are present
        const lockPromise =
          selectedMonth && selectedYear
            ? fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/rfc/lock?` +
                  new URLSearchParams({
                    month: selectedMonth,
                    year: selectedYear,
                    branch: "Offerings",
                  }),
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                  },
                }
              )
            : null;

        const responses = await Promise.all([
          productPromise,
          lockPromise ?? Promise.resolve(null),
        ]);

        const productData = await responses[0].json();
        const lockData = lockPromise ? await responses[1]?.json() : null;

        if (lockData) {
          setPermission({
            post_allowed: lockData?.data?.permission?.post_allowed,
            save_allowed: lockData?.data?.permission?.save_allowed,
          });
        }

        const productList: string[] = productData?.product ?? [];

        if (!localProductValue || localProductValue === "All") {
          setProducts(productList);
        } else {
          const storedProducts = localProductValue
            .split(",")
            .map((product) => product.trim());

          setProducts(storedProducts);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchMaterials();
  }, [selectedMonth, selectedYear]);

  const fetchOffering = async (page = 1, recordsPerPage = 50) => {
    try {
      const localProductValue = localStorage.getItem("product");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: recordsPerPage.toString(),
      });

      if (localProductValue && localProductValue !== "All") {
        const storedProducts = localProductValue
          .split(",")
          .map((product) => product.trim())
          .join(",");

        queryParams.append("product", storedProducts);
      }

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/offerings/${selectedMonth}/${selectedYear}?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      setUploadedData(data?.data || []);
      setPagination(
        data?.pagination || {
          total_records: 0,
          records_per_page: 50,
          page: 1,
          total_pages: 0,
        }
      );
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleProductSelect = (product: string) => {
    if (!selectedProducts.includes(product)) {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleProductRemove = (productToRemove: string) => {
    setSelectedProducts(
      selectedProducts.filter((product) => product !== productToRemove)
    );
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return setUploadStatus({
        ...uploadStatus,
        status: "error",
        error: "Please upload only Excel files (.xlsx or .xls)",
        file,
      });
    }

    if (selectedProducts.length === 0) {
      return setUploadStatus({
        ...uploadStatus,
        status: "error",
        error: "Please select at least one product before uploading",
        file,
      });
    }

    setApiResponse(null);
    setUploadStatus({
      file,
      status: "uploading",
      progress: 50,
      lastUploaded: null,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("year", selectedYear);
      formData.append("month", selectedMonth);
      formData.append("products", selectedProducts.join(","));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/offerings`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        }
      );

      const data = await response.json();
      setUploadStatus((prev) => ({
        ...prev,
        status: "processing",
        progress: 75,
      }));

      if (!response.ok) {
        setApiResponse({ data: data?.data || [] });
        throw new Error(data?.message || data?.detail || "Upload failed.");
      }

      if (response.ok) {
        setUploadedData(data.data || []);
        fetchOffering(currentPage, pageSize);
      }

      setApiResponse({ data: data?.data || [] });

      setUploadStatus({
        file,
        status: "success",
        progress: 100,
        lastUploaded: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      });
      // eslint-disable-next-line
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus((prev) => ({
        ...prev,
        status: "error",
        error: error?.message || "Upload failed",
      }));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files?.length > 0) handleFileUpload(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) handleFileUpload(files[0]);
  };

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handlePageSizeChange = (val: string) => {
    const size = Number.parseInt(val);
    setPageSize(size);
    setCurrentPage(1);
    fetchOffering(1, size);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchOffering(page, pageSize);
  };

  const availableProducts = products.filter(
    (product) => !selectedProducts.includes(product)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Offerings</CardTitle>
                <p className="text-sm text-gray-600">
                  Upload Offerings Spreadsheet
                </p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="font-medium text-gray-900">File Validations</h3>
              {uploadStatus.lastUploaded && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Last uploaded: {uploadStatus.lastUploaded}
                </p>
              )}
            </div>
          </CardHeader>

          <div className="px-6 pb-4 border-b">
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap items-center">
                {/* Product Selection */}
                <Select value="" onValueChange={handleProductSelect}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableProducts.map((product, index) => (
                        <SelectItem key={index} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Date Filter */}
                <DateFilter
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                />
              </div>

              {/* Selected Products Display */}
              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Products ({selectedProducts.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <Badge
                        key={product}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        <span>{product}</span>
                        <button
                          onClick={() => handleProductRemove(product)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${product}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                } ${
                  permission?.post_allowed === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                onDragOver={
                  permission?.post_allowed === 0 ? undefined : handleDragOver
                }
                onDragLeave={
                  permission?.post_allowed === 0 ? undefined : handleDragLeave
                }
                onDrop={permission?.post_allowed === 0 ? undefined : handleDrop}
                onClick={
                  permission?.post_allowed === 0 ? undefined : handleBrowseClick
                }
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={
                    permission?.post_allowed === 0
                      ? undefined
                      : handleFileSelect
                  }
                  className="hidden"
                  disabled={permission?.post_allowed === 0}
                />
                <div className="flex flex-col items-center space-y-4">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">
                    {isBusy
                      ? "Processing file..."
                      : "Drop Excel file here or click to browse"}
                  </p>
                  <p className="text-xs text-gray-500">(.xlsx files only)</p>
                  {selectedProducts.length === 0 && (
                    <p className="text-xs text-red-500">
                      Please select at least one product first
                    </p>
                  )}
                  {permission?.post_allowed === 0 && (
                    <p className="text-xs text-red-500">
                      Posting is not allowed
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center">
                {uploadStatus.status === "success" && apiResponse ? (
                  <div className="h-[40vh] overflow-auto w-full">
                    <SKUValidations
                      validationData={apiResponse?.data ?? null}
                    />
                  </div>
                ) : uploadStatus.status === "error" ? (
                  <div className="h-[40vh] overflow-auto w-full">
                    <SKUValidations
                      validationData={apiResponse?.data ?? null}
                    />
                  </div>
                ) : isBusy ? (
                  <div className="flex flex-col items-center h-[180px] text-center">
                    <svg
                      className="h-8 w-8 animate-spin text-primary"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5 0 0 5 0 12h4zm2 5.3A7.96 7.96 0 014 12H0c0 3 1 6 3 8l3-2.7z"
                      />
                    </svg>
                    <p className="text-sm mt-2">Validating data...</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p className="text-sm font-medium">No results to display</p>
                    <p className="text-xs mt-1">
                      Upload a file to see processing results
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {uploadedData?.length > 0 && (
          <>
            <div className="rounded-md border p-2">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Material Description</TableHead>
                    <TableHead>Product</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedData.map((record) => (
                    <TableRow key={record.Material + record.Product}>
                      <TableCell className="font-medium">
                        {record.Material}
                      </TableCell>
                      <TableCell>{record["Material Description"]}</TableCell>
                      <TableCell>{record.Product}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                    disabled={isBusy}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="150">150</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">entries</span>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, pagination.total_records)}{" "}
                  of {pagination.total_records} entries
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {Array.from(
                  { length: Math.min(5, pagination.total_pages) },
                  (_, i) => {
                    let pageNum = i + 1;
                    if (pagination.total_pages > 5) {
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= pagination.total_pages - 2)
                        pageNum = pagination.total_pages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.total_pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
