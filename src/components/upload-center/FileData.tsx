"use client";
import type React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { PreviousCardData } from "@/app/(navbar-app)/upload-center/page";

interface DataTableProps {
  data: PreviousCardData[];
  type: "sales" | "stocks" | "production" | "production_plan" | string;
  title: string;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  type,
  title,
  currentPage,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
  onClose,
  isLoading = false,
}) => {
  const headers = (() => {
    switch (type) {
      case "sales":
        return [
          "Sales Office Description",
          "Payer",
          "Payer Name",
          "Item text",
          "Billing Document",
          "Sales Document Type",
          "Sales Document",
          "Billing Date",
          "Due Date",
          "Material",
          "Material Description",
          "Sales Order Item Created Date",
          "Descr. of Storage Loc.",
          "Document Currency",
          "ZBTP value",
          "ZPK0 value",
          "Billing qty in SKU",
          "MWST value",
          "ZPT2 value",
          "Product",
        ];
      case "stocks":
        return [
          "Year",
          "Month",
          "Warehouse_code",
          "Warehouse",
          "Product",
          "Material",
          "Material_name",
          "TTL",
        ];
      case "production":
        return [
          "Material",
          "Material Description",
          "Month",
          "Quantity",
          "Year",
        ];
      case "production_plan":
        return ["Material", "Month", "Year", "PlanProdQty"];
      default:
        return Object.keys(data?.[0] ?? {});
    }
  })();

  // eslint-disable-next-line
  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined) return "";
    if (key.toLowerCase().includes("date") && typeof value === "number") {
      return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    if (key.toLowerCase().includes("value") || key === "Payer") {
      return value;
    }
    return String(value);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[80vw] max-w-[80vw] max-h-[90vh] h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-6 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[calc(95vh-180px)]">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">Loading data...</p>
              <p className="text-xs text-muted-foreground mt-2">
                Please wait while we fetch your data
              </p>
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(95vh-180px)]">
              <p className="text-center text-muted-foreground">
                No data available for this type.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden h-[calc(95vh-180px)]">
                <div className="overflow-auto h-full">
                  <table className="w-full text-sm relative table-auto">
                    <thead className="bg-[#F5FBFF] sticky top-0 z-20 border-b">
                      <tr>
                        <th className="p-3 text-left font-medium border-r bg-background/95 sticky left-0 z-30 min-w-[1px]">
                          #
                        </th>
                        {headers.map((header) => (
                          <th
                            key={header}
                            className="p-3 text-left font-medium border-r whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line */}
                      {data.map((row: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="p-3 border-r font-medium text-muted-foreground bg-background/95 sticky left-0 z-10">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          {headers.map((header) => (
                            <td
                              key={header}
                              className="p-3 border-r whitespace-nowrap"
                            >
                              <div
                                className="max-w-[400px] truncate"
                                title={formatValue(row[header], header)}
                              >
                                {formatValue(row[header], header)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => onPageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalRecords} total
                  records)
                </div>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages || isLoading}
                  onClick={() => onPageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataTable;
