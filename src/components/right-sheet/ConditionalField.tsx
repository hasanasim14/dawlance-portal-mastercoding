"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/types";
import { SearchableSelectField } from "./SearchableSelect";
// import { SearchableSelectField } from "./searchable-select-field";

interface ConditionalFieldProps {
  field: FieldConfig & {
    apiEndpoint?: string;
    checkboxLabel?: string;
    dateLabel?: string;
    searchLabel?: string;
  };
  // eslint-disable-next-line
  formData: Record<string, any>;
  // eslint-disable-next-line
  selectedRow?: Record<string, any> | null;
  hasChanges: boolean;
  onInputChange: (key: string, value: string) => void;
  onValidationChange?: (key: string, isValid: boolean) => void;
}

export function ConditionalField({
  field,
  formData,
  selectedRow,
  hasChanges,
  onInputChange,
  onValidationChange,
}: ConditionalFieldProps) {
  const checkboxKey = `${field.key}_use_date`;
  const valueKey = field.key;

  const [calendarOpen, setCalendarOpen] = useState(false);

  // Convert string to boolean for checkbox
  const isDateMode =
    formData[checkboxKey] === "true" || formData[checkboxKey] === true;
  const currentValue = formData[valueKey] || "";

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    onInputChange(checkboxKey, isChecked.toString());
    // Clear the value when switching modes
    onInputChange(valueKey, "");
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      onInputChange(valueKey, formattedDate);
    } else {
      onInputChange(valueKey, "");
    }
    setCalendarOpen(false);
  };

  const parseDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  };

  return (
    <div className="space-y-3">
      <Label>{field.label}</Label>

      {/* Checkbox to toggle between modes */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={checkboxKey}
          checked={isDateMode}
          onCheckedChange={handleCheckboxChange}
        />
        <Label
          htmlFor={checkboxKey}
          className="text-sm font-normal cursor-pointer"
        >
          {field.checkboxLabel || "Use date instead of search"}
        </Label>
      </div>

      {/* Conditional rendering based on checkbox */}
      {isDateMode ? (
        // Date picker mode
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            {field.dateLabel || "Select date"}
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !currentValue && "text-muted-foreground",
                  hasChanges &&
                    formData[valueKey] !== selectedRow?.[valueKey] &&
                    "border-orange-300"
                )}
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentValue
                  ? format(parseDate(currentValue) || new Date(), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDate(currentValue)}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        // Searchable select mode
        <div className="space-y-2">
          <SearchableSelectField
            field={field}
            formData={formData}
            selectedRow={selectedRow}
            hasChanges={hasChanges}
            onInputChange={onInputChange}
            onValidationChange={onValidationChange}
          />
        </div>
      )}
    </div>
  );
}
