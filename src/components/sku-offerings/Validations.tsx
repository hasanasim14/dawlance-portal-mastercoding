import React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Modal for showing detailed error info
function ErrorDetailsModal({
  title,
  value,
  children,
}: {
  title: string;
  // eslint-disable-next-line
  value: any;
  children: React.ReactNode;
}) {
  const renderContent = () => {
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

    if (typeof value === "object" && value !== null) {
      return (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(value).map(([key, val]) => (
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

// eslint-disable-next-line
function ValidationItem({ label, value }: { label: string; value: any }) {
  const getValidationStatus = () => {
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
  };

  const validation = getValidationStatus();

  const formatLabel = (text: string) =>
    text
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const hasDetails = () =>
    (Array.isArray(value) && value.length > 0) ||
    (typeof value === "object" &&
      value !== null &&
      Object.keys(value).length > 0);

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
            label.toLowerCase().includes("duplicates") &&
            label.toLowerCase().includes("data") &&
            Array.isArray(value) ? (
              <p>Duplicates</p>
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

export interface ValidationData {
  // eslint-disable-next-line
  [key: string]: any;
}

interface SKUValidationsProps {
  validationData: ValidationData | null;
}

const SKUValidations: React.FC<SKUValidationsProps> = ({ validationData }) => {
  if (!validationData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No validation data available</p>
      </div>
    );
  }

  const allKeys = Object.keys(validationData);
  const validationKeys = allKeys.filter(
    (key) => !["message", "timestamp", "file_name", "file_size"].includes(key)
  );

  // const passedCount = validationKeys.filter((key) => {
  //   const value = validationData[key];
  //   if (typeof value === "boolean") return value;
  //   if (Array.isArray(value)) return value.length === 0;
  //   if (typeof value === "object" && value !== null)
  //     return Object.keys(value).length === 0;
  //   return true;
  // }).length;

  const totalCount = validationKeys.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No validation results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">Validation Summary</span>
        {/* <span
          className={cn(
            "text-xs font-medium px-2 py-1 rounded border",
            passedCount === totalCount
              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
              : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"
          )}
        >
          {passedCount}/{totalCount} Passed
        </span> */}
      </div>

      <div className="space-y-1">
        {validationKeys.map((key) => (
          <ValidationItem key={key} label={key} value={validationData[key]} />
        ))}
      </div>
    </div>
  );
};

export default SKUValidations;
