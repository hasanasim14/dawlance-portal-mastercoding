"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface TableActionsProps {
  btnName: string;
  selectedRowsCount: number;
  deleting: boolean;
  onDeleteClick: () => void;
  onAddClick: () => void;
}

export function TableActions({
  btnName,
  selectedRowsCount,
  deleting,
  onDeleteClick,
  onAddClick,
}: TableActionsProps) {
  return (
    <div className="p-2 border-b flex justify-between items-center flex-shrink-0">
      <div className="flex items-center gap-4">
        {selectedRowsCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedRowsCount} record{selectedRowsCount > 1 ? "s" : ""}{" "}
            selected
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {btnName !== "User" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteClick}
            disabled={deleting || !selectedRowsCount}
            className="px-3 py-2"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        )}

        <Button
          onClick={onAddClick}
          className="px-4 py-2 text-white rounded-md transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New {btnName}
        </Button>
      </div>
    </div>
  );
}
