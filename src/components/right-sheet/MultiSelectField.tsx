"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/types";

interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  field: FieldConfig;
  // eslint-disable-next-line
  formData: Record<string, any>;
  // eslint-disable-next-line
  selectedRow?: Record<string, any> | null;
  hasChanges: boolean;
  options: SelectOption[];
  isLoading: boolean;
  onInputChange: (key: string, value: string[]) => void;
}

export function MultiSelectField({
  field,
  formData,
  selectedRow,
  hasChanges,
  options,
  isLoading,
  onInputChange,
}: MultiSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedValues = Array.isArray(formData[field.key])
    ? formData[field.key]
    : [];

  const handleToggleOption = (value: string) => {
    const currentValues = Array.isArray(formData[field.key])
      ? formData[field.key]
      : [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];
    onInputChange(field.key, newValues);
  };

  const handleRemoveOption = (value: string) => {
    const currentValues = Array.isArray(formData[field.key])
      ? formData[field.key]
      : [];
    const newValues = currentValues.filter((v: string) => v !== value);
    onInputChange(field.key, newValues);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
        {field.label}
      </Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "w-full justify-between",
              hasChanges &&
                JSON.stringify(formData[field.key]) !==
                  JSON.stringify(selectedRow?.[field.key]) &&
                "border-orange-300"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : selectedValues.length > 0 ? (
              `${selectedValues.length} selected`
            ) : (
              `Select ${field.label}...`
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-popover-content]")) {
              setIsOpen(false);
            } else {
              e.preventDefault();
            }
          }}
          sideOffset={4}
        >
          <div data-popover-content className="max-h-60 overflow-auto w-full">
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center p-2 hover:bg-accent cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleToggleOption(option.value)}
                >
                  <div
                    className={cn(
                      "mr-2 h-4 w-4 border rounded-sm flex items-center justify-center",
                      selectedValues.includes(option.value)
                        ? "bg-primary border-primary"
                        : "border-input"
                    )}
                  >
                    {selectedValues.includes(option.value) && (
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">{option.label}</span>
                </div>
              ))
            ) : (
              <div className="p-2 text-sm text-muted-foreground">
                No options available
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {/* Selected values display */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedValues.map((value: string) => {
            const option = options.find((opt) => opt.value === value);
            return (
              <Badge key={value} variant="secondary" className="text-xs">
                {option?.label || value}
                <button
                  type="button"
                  className="ml-1 hover:bg-muted rounded-full"
                  onClick={() => handleRemoveOption(value)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
