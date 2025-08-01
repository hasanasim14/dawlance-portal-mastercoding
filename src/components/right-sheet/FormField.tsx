"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/types";

interface SelectOption {
  value: string;
  label: string;
}

interface FormFieldProps {
  field: FieldConfig;
  // eslint-disable-next-line
  formData: Record<string, any>;
  // eslint-disable-next-line
  selectedRow?: Record<string, any> | null;
  hasChanges: boolean;
  options?: SelectOption[];
  isLoading?: boolean;
  onInputChange: (key: string, value: string) => void;
}

export function FormField({
  field,
  formData,
  selectedRow,
  hasChanges,
  options = [],
  isLoading = false,
  onInputChange,
}: FormFieldProps) {
  // Handle Select fields
  if (field.type === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
          {field.label}
        </Label>
        <Select
          value={formData[field.key]?.toString() || ""}
          onValueChange={(value) => onInputChange(field.key, value)}
          disabled={field.readOnly || isLoading}
        >
          <SelectTrigger
            className={cn(
              "w-full",
              field.readOnly && "bg-muted/40",
              hasChanges &&
                formData[field.key] !== selectedRow?.[field.key] &&
                "border-orange-300"
            )}
          >
            <SelectValue
              placeholder={isLoading ? "Loading..." : `Select ${field.label}`}
            />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No options available
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle regular Input fields
  return (
    <div className="space-y-2">
      <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
        {field.label}
      </Label>
      <Input
        id={field.key.toLowerCase().replace(/\s+/g, "_")}
        type={field.type || "text"}
        placeholder={field.label}
        value={formData[field.key]?.toString() || ""}
        onChange={(e) => onInputChange(field.key, e.target.value)}
        readOnly={
          field.readOnly ||
          (field.key.toLowerCase() === "material_description" &&
            formData["material"]) ||
          (field.key.toLowerCase() === "product" && formData["material"])
        }
        required={field.required}
        className={cn(
          (field.readOnly ||
            (field.key.toLowerCase() === "material_description" &&
              formData["material"]) ||
            (field.key.toLowerCase() === "product" && formData["material"])) &&
            "bg-muted/40",
          hasChanges &&
            formData[field.key] !== selectedRow?.[field.key] &&
            "border-orange-300"
        )}
      />
    </div>
  );
}
