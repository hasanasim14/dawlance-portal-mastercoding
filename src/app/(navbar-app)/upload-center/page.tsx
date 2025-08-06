"use client";

import type React from "react";
import type { PaginationData } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { getNextMonthAndYear } from "@/lib/utils";
import { ShoppingCart, Server, DollarSign } from "lucide-react";
import UploadCard from "@/components/upload-center/UploadCard";
import DataTable from "@/components/upload-center/FileData";
import DateFilter from "@/components/DateFilter";

// eslint-disable-next-line
export type PreviousCardData = Record<string, any>;

// Server Action for posting file to API
async function postFileAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const option = formData.get("type") as string;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const newFormData = new FormData();
    newFormData.append("file", file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/upload/post/${option}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: newFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Post API Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: result.message || `Successfully posted ${file.name}`,
      data: result,
    };
  } catch (error) {
    console.error("Post error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Post failed",
    };
  }
}

// Upload status types
export type UploadStatus = "idle" | "success" | "error" | "pending";
export type PostStatus = "idle" | "success" | "error" | "pending";

// Validation data interface
export interface ValidationData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Card data type
export interface UploadCardData {
  id: string;
  title: string;
  description: string;
  status: UploadStatus;
  postStatus: PostStatus;
  lastUploaded: string | null;
  lastPosted: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  icon: React.ReactNode;
  result: string | null;
  postResult: string | null;
  validationData: ValidationData | null;
  uploadedFile: File | null;
}

function UploadCenter() {
  const SalesInputRef = useRef<HTMLInputElement>(null);
  const StocksInputRef = useRef<HTMLInputElement>(null);
  const ProductionInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Pagination states
  const [pagination, setPagination] = useState<PaginationData>({
    total_records: 0,
    records_per_page: 50,
    page: 1,
    total_pages: 0,
  });
  // eslint-disable-next-line
  const [pageSize, _setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Table data and modal states
  const [previousFileData, setPreviousFileData] = useState<PreviousCardData[]>(
    []
  );
  const [showTable, setShowTable] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentTableType, setCurrentTableType] = useState<string>("");
  const [allowUpload, setAllowUpload] = useState(false);
  const [checkStatement, setCheckStatement] = useState("");
  // Set default values on component mount
  useEffect(() => {
    const { month, year } = getNextMonthAndYear("uploads");
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  // Server Action for handling file upload
  async function uploadFileAction(formData: FormData) {
    try {
      const file = formData.get("file") as File;
      const option = formData.get("type") as string;
      if (!file) {
        return { success: false, error: "No file provided" };
      }

      // Validate file type
      if (!file.name.endsWith(".xlsx")) {
        return { success: false, error: "Only .xlsx files are supported" };
      }

      const newFormData = new FormData();
      newFormData.append("file", formData.get("file") as File);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/upload/${option}/${selectedMonth}/${selectedYear}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: newFormData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      setAllowUpload(result?.allow_upload);
      setCheckStatement(result?.check_statement);

      return {
        success: true,
        message: result.message || `Successfully processed ${file.name}`,
        validationData: result?.data,
      };
    } catch (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  const [cards, setCards] = useState<UploadCardData[]>([
    {
      id: "sales",
      title: "Sales",
      description: "Upload Sales information spreadsheet",
      status: "idle",
      postStatus: "idle",
      lastUploaded: null,
      lastPosted: null,
      inputRef: SalesInputRef,
      icon: <ShoppingCart className="h-5 w-5" />,
      result: null,
      postResult: null,
      validationData: null,
      uploadedFile: null,
    },
    {
      id: "stocks",
      title: "Stocks",
      description: "Upload Stocks information spreadsheet",
      status: "idle",
      postStatus: "idle",
      lastUploaded: null,
      lastPosted: null,
      inputRef: StocksInputRef,
      icon: <DollarSign className="h-5 w-5" />,
      result: null,
      postResult: null,
      validationData: null,
      uploadedFile: null,
    },
    {
      id: "production",
      title: "Production",
      description: "Upload Production information spreadsheet",
      status: "idle",
      postStatus: "idle",
      lastUploaded: null,
      lastPosted: null,
      inputRef: ProductionInputRef,
      icon: <Server className="h-5 w-5" />,
      result: null,
      postResult: null,
      validationData: null,
      uploadedFile: null,
    },
  ]);

  const processFile = async (cardId: string, file: File) => {
    // Set status to pending immediately
    setCards((prev) =>
      prev.map((card) => {
        if (!card || card.id !== cardId) return card;
        return {
          ...card,
          status: "pending" as UploadStatus,
          result: null,
          validationData: null,
          uploadedFile: file,
        };
      })
    );

    try {
      // Create FormData with file and type
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", cardId);
      const result = await uploadFileAction(formData);

      if (result.success) {
        setCards((prev) =>
          prev.map((card) => {
            if (!card || card.id !== cardId) return card;
            return {
              ...card,
              status: "success" as UploadStatus,
              result: result.message,
              validationData: result.validationData || null,
              lastUploaded: new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            };
          })
        );
      } else {
        setCards((prev) =>
          prev.map((card) => {
            if (!card || card.id !== cardId) return card;
            return {
              ...card,
              status: "error" as UploadStatus,
              result: result.error || null,
              validationData: null,
              uploadedFile: null,
            };
          })
        );
      }
    } catch (error) {
      setCards((prev) =>
        prev.map((card) => {
          if (!card || card.id !== cardId) return card;
          return {
            ...card,
            status: "error" as UploadStatus,
            result: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            validationData: null,
            uploadedFile: null,
          };
        })
      );
    }
  };

  const postFile = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || !card.uploadedFile) return;

    // Set post status to pending
    setCards((prev) =>
      prev.map((card) => {
        if (!card || card.id !== cardId) return card;
        return {
          ...card,
          postStatus: "pending" as PostStatus,
          postResult: null,
        };
      })
    );

    try {
      // Create FormData with file and type
      const formData = new FormData();
      formData.append("file", card.uploadedFile);
      formData.append("type", cardId);
      const result = await postFileAction(formData);

      if (result.success) {
        setCards((prev) =>
          prev.map((card) => {
            if (!card || card.id !== cardId) return card;
            return {
              ...card,
              postStatus: "success" as PostStatus,
              postResult: result.message,
              lastPosted: new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            };
          })
        );
      } else {
        setCards((prev) =>
          prev.map((card) => {
            if (!card || card.id !== cardId) return card;
            return {
              ...card,
              postStatus: "error" as PostStatus,
              postResult: result.error || null,
            };
          })
        );
      }
    } catch (error) {
      setCards((prev) =>
        prev.map((card) => {
          if (!card || card.id !== cardId) return card;
          return {
            ...card,
            postStatus: "error" as PostStatus,
            postResult: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          };
        })
      );
    }
  };

  const handleFileChange = async (
    cardId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      alert("Only .xlsx files are supported");
      return;
    }

    await processFile(cardId, file);
    e.target.value = "";
  };

  const handleFileDrop = async (
    cardId: string,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      alert("Only .xlsx files are supported");
      return;
    }

    await processFile(cardId, file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const fetchFileData = async (cardId: string, page = 1, limit = pageSize) => {
    try {
      setTableLoading(true);
      setCurrentTableType(cardId);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/upload/${cardId}?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      setPreviousFileData(data?.data || []);
      setPagination(data?.pagination || {});
      setCurrentPage(page);
      setShowTable(true);
    } catch (error) {
      console.error("Failed to fetch file data:", error);
      setPreviousFileData([]);
    } finally {
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (currentTableType) {
      fetchFileData(currentTableType, newPage, pageSize);
    }
  };

  const handleCloseTable = () => {
    setShowTable(false);
    setPreviousFileData([]);
    setCurrentTableType("");
    setCurrentPage(1);
  };

  const getTableTitle = (type: string) => {
    const card = cards.find((c) => c.id === type);
    return card ? `${card.title} Upload Preview` : "Upload Preview";
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col items-center justify-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Data Upload Center</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Upload your Excel files to update your business data. Click on a card
          or drag and drop files.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <DateFilter
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />
      </div>

      <div className="flex flex-col space-y-6">
        {cards.map((card) => (
          <UploadCard
            checkStatement={checkStatement}
            allowUpload={allowUpload}
            // responseObject={responseObject}
            key={card.id}
            card={card}
            onFileChange={handleFileChange}
            onFileDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onPost={postFile}
            onFetch={fetchFileData}
            isLoading={tableLoading && currentTableType === card.id}
          />
        ))}
      </div>

      {showTable && (
        <DataTable
          data={previousFileData}
          type={currentTableType}
          title={getTableTitle(currentTableType)}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={pagination.total_records}
          totalPages={pagination.total_pages}
          onPageChange={handlePageChange}
          onClose={handleCloseTable}
          isLoading={tableLoading}
        />
      )}
    </div>
  );
}

export default UploadCenter;
