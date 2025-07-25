"use client";
import type React from "react";
import ValidationResults from "./ValidationResults";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CloudUpload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  UploadCardData,
  UploadStatus,
  PostStatus,
} from "@/app/(navbar-app)/upload-center/page";
import { useState } from "react";

interface UploadCardProps {
  checkStatement: string;
  allowUpload: boolean;
  card: UploadCardData;
  onFileChange: (
    cardId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onFileDrop: (cardId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onPost: (cardId: string) => void;
  onFetch: (cardId: string) => void;
  isLoading?: boolean;
}

function UploadCard({
  checkStatement,
  allowUpload,
  card,
  onFileChange,
  onFileDrop,
  onDragOver,
  onPost,
  onFetch,
  isLoading = false,
}: UploadCardProps) {
  // eslint-disable-next-line
  const [noValidationErrors, setNoValidationErrors] = useState(false);

  if (!card) {
    return null;
  }

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"
          >
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPostStatusBadge = (status: PostStatus) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Posted
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Post Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
          >
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Posting...
          </Badge>
        );
      default:
        return null;
    }
  };

  const canPost =
    card.status === "success" &&
    card.uploadedFile &&
    card.postStatus !== "pending";

  return (
    <Card
      className="overflow-hidden border-l-4 transition-all hover:shadow-md"
      style={{
        borderLeftColor:
          card.status === "success"
            ? "var(--green-500)"
            : card.status === "error"
            ? "var(--red-500)"
            : card.status === "pending"
            ? "var(--yellow-500)"
            : "var(--border)",
      }}
    >
      <div className="grid md:grid-cols-[1fr_1fr]">
        {/* Upload Section */}
        <div className="p-5 border-r border-border/50">
          <div className="flex items-start justify-between mb-4">
            {/* Left side: Icon + Title + Description */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                {card.icon}
              </div>
              <div>
                <CardTitle className="text-lg font-medium">
                  {card.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {card.description}
                </CardDescription>
              </div>
            </div>
            {/* Right side: Button + Badges */}
            <div className="flex items-center gap-4">
              <Button
                className="text-xs"
                onClick={() => onFetch(card.id)}
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "View Last Uploaded File"
                )}
              </Button>
              <div className="flex gap-2">
                {getStatusBadge(card.status)}
                {getPostStatusBadge(card.postStatus)}
              </div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {card.lastUploaded && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span>Last uploaded: {card.lastUploaded}</span>
              </div>
            )}
            {card.lastPosted && (
              <div className="flex items-center text-xs text-muted-foreground">
                {/* <Send className="h-3 w-3 mr-1" /> */}
                <span>Last posted: {card.lastPosted}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center flex flex-col items-center justify-center min-h-[140px] transition-colors duration-200",
              "border-gray-300 dark:border-gray-600 hover:border-primary/50 cursor-pointer",
              card.status === "pending" ? "opacity-50 pointer-events-none" : ""
            )}
            onDragOver={onDragOver}
            onDrop={(e) => onFileDrop(card.id, e)}
            onClick={() => card.inputRef.current?.click()}
          >
            <CloudUpload className="h-12 w-12 mb-3 text-primary/80" />
            <p className="text-base font-medium mb-2">
              Drop Excel file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground">(.xlsx files only)</p>
            {card.status === "pending" && (
              <p className="text-xs text-muted-foreground mt-4">
                Processing file...
              </p>
            )}
            <input
              type="file"
              ref={card.inputRef}
              onChange={(e) => onFileChange(card.id, e)}
              accept=".xlsx"
              className="hidden"
            />
          </div>
        </div>
        {/* Results Section */}
        <div className="p-5 bg-muted/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Validation Results
            </h3>
            <div className="flex items-center space-x-3">
              {card.status === "pending" && (
                <Badge
                  variant="outline"
                  className="animate-pulse text-sm px-2 py-1"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Processing...
                </Badge>
              )}
              {canPost && (
                <Button
                  onClick={() => onPost(card.id)}
                  disabled={!allowUpload}
                  className="h-8 px-4 text-sm"
                  variant={
                    card.postStatus === "success" ? "outline" : "default"
                  }
                >
                  {card.postStatus === "pending" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : card.postStatus === "success" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Posted
                    </>
                  ) : (
                    <>
                      Post
                      <Send className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          {card.status === "pending" ? (
            <div className="flex flex-col items-center justify-center h-[180px] text-center">
              <div className="animate-spin mb-4">
                <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium">Processing your file</p>
              <p className="text-xs text-muted-foreground mt-2">
                Validating data...
              </p>
            </div>
          ) : card.validationData && card.status === "success" ? (
            <div className="p-4 bg-background rounded-lg border border-border/50 max-h-[300px] overflow-y-auto">
              <ValidationResults
                setNoValidationErrors={setNoValidationErrors}
                validationData={card.validationData}
                uploadType={card.id}
                checkStatement={checkStatement}
              />
            </div>
          ) : card.result ? (
            <div className="p-4 bg-background rounded-lg border border-border/50 h-[180px] flex items-center">
              <div className="space-y-2">
                <div className="flex items-center">
                  {card.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                  )}
                  <h4 className="font-medium">
                    {card.status === "success"
                      ? "Upload Successful"
                      : "Upload Failed"}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">{card.result}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[180px] text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                No results to display
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                Upload a file to see validation results
              </p>
            </div>
          )}
        </div>
      </div>
      {(card.status === "pending" || card.postStatus === "pending") && (
        <Progress value={50} className="h-1 rounded-none animate-pulse" />
      )}
    </Card>
  );
}

export default UploadCard;
