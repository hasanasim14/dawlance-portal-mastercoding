"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/types";

interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectFieldProps {
  field: FieldConfig & {
    apiEndpoint?: string;
  };
  formData: Record<string, any>;
  selectedRow?: Record<string, any> | null;
  hasChanges: boolean;
  onInputChange: (key: string, value: string) => void;
  onValidationChange?: (key: string, isValid: boolean) => void;
}

export function SearchableSelectField({
  field,
  formData,
  selectedRow,
  hasChanges,
  onInputChange,
  onValidationChange,
}: SearchableSelectFieldProps) {
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [allFetchedOptions, setAllFetchedOptions] = useState<
    SearchableOption[]
  >([]); // Store all fetched options
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentValue = formData[field.key]?.toString() || "";

  // Validate current value against available options
  const validateValue = (value: string) => {
    if (!value.trim()) {
      setIsValid(true);
      setValidationMessage("");
      onValidationChange?.(field.key, true);
      return;
    }

    const isValueValid = allFetchedOptions.some(
      (option) => option.value.toLowerCase() === value.toLowerCase()
    );

    setIsValid(isValueValid);

    if (!isValueValid) {
      setValidationMessage(
        `"${value}" is not a valid ${field.label.toLowerCase()}. Please select from the dropdown.`
      );
    } else {
      setValidationMessage("");
    }

    onValidationChange?.(field.key, isValueValid);
  };

  // Validate whenever the current value changes
  useEffect(() => {
    validateValue(currentValue);
  }, [currentValue, allFetchedOptions]);

  // Debounced API search effect
  useEffect(() => {
    const searchOptions = async () => {
      if (!field.apiEndpoint) {
        console.warn(`No API endpoint provided for field: ${field.key}`);
        return;
      }

      const query = searchQuery.trim();
      if (!query) {
        setOptions([]);
        setIsOpen(false);
        return;
      }

      if (query.length < 2) {
        setOptions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const authToken = localStorage.getItem("token");

        // Build the API endpoint with search query
        const url = new URL(
          field.apiEndpoint,
          process.env.NEXT_PUBLIC_BASE_URL
        );
        url.searchParams.append("filt", query);
        // url.searchParams.append("limit", "20"); // Limit results for dropdown

        console.log(`Fetching options from: ${url.toString()}`);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`API response for ${field.key}:`, data);

        let searchableOptions: SearchableOption[] = [];

        // Handle different response formats
        if (Array.isArray(data)) {
          // Direct array response
          searchableOptions = data.map((item) => ({
            value:
              typeof item === "string"
                ? item
                : item.value || item.id || item.name || item[field.key],
            label:
              typeof item === "string"
                ? item
                : item.label ||
                  item.name ||
                  item.value ||
                  item[field.key] ||
                  item.id,
          }));
        } else if (data && typeof data === "object") {
          // Handle nested response formats
          let dataArray = null;

          // Attempt direct match with field.key (lowercase)
          const responseKeys = Object.keys(data);
          for (const key of responseKeys) {
            if (Array.isArray(data[key])) {
              // Match based on normalized field key
              const normalizedFieldKey = field.key
                .toLowerCase()
                .replace(/[^a-z0-9]/gi, "");
              const normalizedResponseKey = key
                .toLowerCase()
                .replace(/[^a-z0-9]/gi, "");

              if (
                normalizedResponseKey === normalizedFieldKey ||
                normalizedResponseKey === normalizedFieldKey + "s"
              ) {
                dataArray = data[key];
                break;
              }
            }
          }

          if (dataArray) {
            searchableOptions = dataArray.map((item: any) => ({
              value:
                typeof item === "string"
                  ? item
                  : item.value || item.id || item.name || item[field.key],
              label:
                typeof item === "string"
                  ? item
                  : item.label ||
                    item.name ||
                    item.value ||
                    item[field.key] ||
                    item.id,
            }));
          } else {
            console.warn(
              `Could not find data array in response for field: ${field.key}`,
              data
            );
          }
        }

        // Filter out any invalid options
        searchableOptions = searchableOptions.filter(
          (option) => option.value && option.label
        );

        console.log(
          `Processed ${searchableOptions.length} options for ${field.key}:`,
          searchableOptions
        );

        setOptions(searchableOptions);

        // Add new options to the all fetched options (avoid duplicates)
        setAllFetchedOptions((prev) => {
          const combined = [...prev, ...searchableOptions];
          const unique = combined.filter(
            (option, index, self) =>
              index ===
              self.findIndex(
                (o) => o.value.toLowerCase() === option.value.toLowerCase()
              )
          );
          return unique;
        });

        if (searchableOptions.length > 0) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
          setError(`No ${field.label.toLowerCase()} found matching "${query}"`);
        }
      } catch (error) {
        console.error(`Error searching ${field.label}:`, error);
        setError(`Failed to search ${field.label}`);
        setOptions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchOptions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, field.key, field.label, field.apiEndpoint]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const container = target.closest("[data-searchable-container]");
      if (!container && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    onInputChange(field.key, value);

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleOptionSelect = (option: SearchableOption) => {
    setSearchQuery(option.value);
    onInputChange(field.key, option.value);
    setIsOpen(false);
    setError("");
    setIsValid(true);
    setValidationMessage("");
    onValidationChange?.(field.key, true);
  };

  const handleInputFocus = () => {
    if (currentValue.trim().length >= 2 && options.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Validate the current value when user leaves the field
    setTimeout(() => {
      validateValue(currentValue);
    }, 100); // Small delay to allow for option selection
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
        {field.label}
      </Label>
      <div className="relative" data-searchable-container>
        <div className="relative">
          <Input
            ref={inputRef}
            id={field.key.toLowerCase().replace(/\s+/g, "_")}
            type="text"
            placeholder={`Search ${field.label}...`}
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            readOnly={field.readOnly}
            required={field.required}
            className={cn(
              "pr-10",
              field.readOnly && "bg-muted/40",
              hasChanges &&
                formData[field.key] !== selectedRow?.[field.key] &&
                "border-orange-300",
              !isValid &&
                "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {!isValid && <AlertCircle className="h-4 w-4 text-red-500" />}
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && options.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                className="cursor-pointer rounded px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOptionSelect(option);
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="font-medium">{option.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Validation error message */}
        {!isValid && validationMessage && (
          <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
            <AlertCircle className="h-3 w-3" />
            {validationMessage}
          </div>
        )}

        {/* API error message */}
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}

        {/* No results message */}
        {isOpen &&
          options.length === 0 &&
          !isLoading &&
          searchQuery.length >= 2 &&
          !error && (
            <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg p-3">
              <div className="text-sm text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
