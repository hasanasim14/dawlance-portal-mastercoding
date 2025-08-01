import type React from "react";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationData } from "@/app/(navbar-app)/upload-center/page";

// Modal content component for detailed error display
function ErrorDetailsModal({
  title,
  value,
  children,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  children: React.ReactNode;
}) {
  const renderContent = () => {
    // for arrays
    if (Array.isArray(value)) {
      return (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Found {value.length} item{value.length !== 1 ? "s" : ""}:
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {value.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary text-xs rounded-full flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <span className="text-sm">{String(item)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // for objects
    if (typeof value === "object" && value !== null) {
      return (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {Object.entries(value).map(([key, val]: [string, any]) => (
            <div key={key} className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </h4>
              {Array.isArray(val) ? (
                <div className="space-y-1">
                  {val.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground ml-2"
                    >
                      • {String(item)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{String(val)}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // for strings
    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm">{String(value)}</p>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[40vw] max-w-[80vw] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

function DuplicatesTableModal({
  title,
  duplicates,
  uploadType,
  children,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  duplicates: any[];
  uploadType: string;
  children: React.ReactNode;
}) {
  const getHeadersForType = (type: string) => {
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
        return [];
    }
  };

  const headers = getHeadersForType(uploadType);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined) return "N/A";

    if (key.toLowerCase().includes("date") && typeof value === "number") {
      return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    if (key.toLowerCase().includes("value") || key === "Payer") {
      return typeof value === "number" ? value.toLocaleString() : value;
    }

    return String(value);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[80vw] max-w-[80vw] max-h-[90vh] h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 flex-1 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-4">
            Found {duplicates.length} duplicate record
            {duplicates.length !== 1 ? "s" : ""}:
          </p>

          <div className="border rounded-lg overflow-hidden h-[calc(95vh-140px)]">
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
                  {duplicates.map((duplicate, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30">
                      <td className="p-3 border-r font-medium text-muted-foreground bg-background/95 sticky left-0 z-10">
                        {index + 1}
                      </td>
                      {headers.map((header) => (
                        <td
                          key={header}
                          className="p-3 border-r whitespace-nowrap"
                        >
                          <div
                            className="max-w-[400px] truncate"
                            title={formatValue(duplicate[header], header)}
                          >
                            {formatValue(duplicate[header], header)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dynamic validation item component
function ValidationItem({
  label,
  value,
  uploadType,
}: {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  uploadType: string;
}) {
  const getValidationStatus = () => {
    // Handle boolean values
    if (typeof value === "boolean") {
      return {
        passed: value,
        icon: value ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        ),
        status: value ? "Passed" : "Failed",
        color: value
          ? "text-green-700 dark:text-green-400"
          : "text-red-700 dark:text-red-400",
      };
    }

    // Handle arrays (empty arrays are usually good)
    if (Array.isArray(value)) {
      const isEmpty = value.length === 0;
      return {
        passed: isEmpty,
        icon: isEmpty ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ),
        status: isEmpty ? "Passed" : `${value.length} issues found`,
        color: isEmpty
          ? "text-green-700 dark:text-green-400"
          : "text-yellow-700 dark:text-yellow-400",
      };
    }

    // Handle objects (empty objects are usually good)
    if (typeof value === "object" && value !== null) {
      const hasIssues = Object.keys(value).length > 0;
      return {
        passed: !hasIssues,
        icon: !hasIssues ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ),
        status: !hasIssues ? "Passed" : "Issues found",
        color: !hasIssues
          ? "text-green-700 dark:text-green-400"
          : "text-yellow-700 dark:text-yellow-400",
      };
    }

    // Handle strings and numbers
    if (typeof value === "string" || typeof value === "number") {
      // For strings
      const isGood =
        (typeof value === "string" && value.length > 0) ||
        (typeof value === "number" && value >= 0);

      return {
        passed: isGood,
        icon: isGood ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        ),
        status: String(value),
        color: isGood
          ? "text-green-700 dark:text-green-400"
          : "text-red-700 dark:text-red-400",
      };
    }

    // Default case
    return {
      passed: false,
      icon: <AlertCircle className="h-4 w-4 text-gray-400" />,
      status: String(value),
      color: "text-gray-700 dark:text-gray-400",
    };
  };

  const validation = getValidationStatus();

  // Convert snake_case to proper case
  const formatLabel = (text: string) => {
    return text
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Check if this item has details that can be shown in a modal
  const hasDetails = () => {
    if (Array.isArray(value) && value.length > 0) return true;
    if (
      typeof value === "object" &&
      value !== null &&
      Object.keys(value).length > 0
    )
      return true;
    return false;
  };

  const StatusContent = () => (
    <span className={cn("text-sm font-medium", validation.color)}>
      {validation.status}
      {hasDetails() && <ExternalLink className="h-3 w-3 ml-1 inline" />}
    </span>
  );

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/30 last:border-b-0">
      {validation.icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{formatLabel(label)}</span>
          {hasDetails() ? (
            // Special handling for "Duplicates in Data" field
            label.toLowerCase().includes("duplicates") &&
            label.toLowerCase().includes("data") &&
            Array.isArray(value) ? (
              <DuplicatesTableModal
                title={formatLabel(label)}
                duplicates={value}
                uploadType={uploadType}
              >
                <button
                  className={cn(
                    "text-sm font-medium transition-colors hover:underline cursor-pointer flex items-center gap-1",
                    validation.color,
                    "hover:opacity-80"
                  )}
                >
                  <StatusContent />
                </button>
              </DuplicatesTableModal>
            ) : (
              <ErrorDetailsModal title={formatLabel(label)} value={value}>
                <button
                  className={cn(
                    "text-sm font-medium transition-colors hover:underline cursor-pointer flex items-center gap-1",
                    validation.color,
                    "hover:opacity-80"
                  )}
                >
                  <StatusContent />
                </button>
              </ErrorDetailsModal>
            )
          ) : (
            <StatusContent />
          )}
        </div>
      </div>
    </div>
  );
}

interface ValidationResultsProps {
  setNoValidationErrors: React.Dispatch<React.SetStateAction<boolean>>;
  validationData: ValidationData;
  uploadType: string;
  checkStatement: string;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({
  setNoValidationErrors,
  validationData,
  uploadType,
  checkStatement,
}) => {
  // Get all keys from the validation data and sort them for consistent display
  const allKeys = Object.keys(validationData);

  // Filter out common non-validation fields if needed
  const validationKeys = allKeys.filter(
    (key) => !["message", "timestamp", "file_name", "file_size"].includes(key)
  );

  // Use useEffect to update parent state after render
  useEffect(() => {
    if (validationKeys.length === 0) {
      setNoValidationErrors(false);
      return;
    }

    // Count passed and failed validations
    const passedCount = validationKeys.filter((key) => {
      const value = validationData[key];
      if (typeof value === "boolean") return value;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "object" && value !== null)
        return Object.keys(value).length === 0;
      return true;
    }).length;

    const totalCount = validationKeys.length;
    setNoValidationErrors(passedCount === totalCount);
  }, [validationData, validationKeys.length, setNoValidationErrors]);

  if (validationKeys.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No validation data available</p>
      </div>
    );
  }

  // Count passed and failed validations for display
  const passedCount = validationKeys.filter((key) => {
    const value = validationData[key];
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object" && value !== null)
      return Object.keys(value).length === 0;
    return true;
  }).length;

  const totalCount = validationKeys.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">Validation Summary</span>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              passedCount === totalCount
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"
            )}
          >
            {checkStatement}
          </Badge>
        </div>
      </div>

      {/* Individual validations */}
      <div className="space-y-1">
        {validationKeys.map((key) => (
          <ValidationItem
            key={key}
            label={key}
            value={validationData[key]}
            uploadType={uploadType}
          />
        ))}
      </div>
    </div>
  );
};

export default ValidationResults;
