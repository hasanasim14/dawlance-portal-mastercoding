"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import ReactMarkdown from "react-markdown";

interface WarningContainerProps {
  warningMessage: string;
}

const MAX_COLLAPSED_HEIGHT = 50;

const WarningContainer = ({ warningMessage }: WarningContainerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT);
    }
  }, [warningMessage]);

  if (!warningMessage) return null;

  return (
    <Card className="mx-2 pt-4 p-2 bg-red-50 border border-red-300 gap-1 text-sm">
      <div className="flex items-center space-x-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <CardTitle className="text-red-800">Warning</CardTitle>
      </div>
      <div
        ref={contentRef}
        className={`text-red-700 prose prose-sm transition-all duration-300 ${
          !isExpanded && isOverflowing ? "max-h-[22px] overflow-hidden" : ""
        }`}
      >
        <ReactMarkdown>{warningMessage}</ReactMarkdown>
      </div>

      {isOverflowing && (
        <Button
          variant="link"
          className="mt-2 text-red-700 hover:text-red-900 px-0"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Show less" : "Show more"}
        </Button>
      )}
    </Card>
  );
};

export default WarningContainer;
