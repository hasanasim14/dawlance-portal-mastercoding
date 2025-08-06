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
  // eslint-disable-next-line
  formData: Record<string, any>;
  // eslint-disable-next-line
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
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track user interaction
  const [initialLoad, setInitialLoad] = useState(true); // Track if this is initial load

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentValue = formData[field.key]?.toString() || "";

  // Set initial load to false after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 1000); // Give 1 second for initial data to load

    return () => clearTimeout(timer);
  }, []);

  // Validate current value against available options
  const validateValue = (value: string, showError = true) => {
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

    // Only show validation message if user has interacted and we should show errors
    if (!isValueValid && showError && hasUserInteracted && !initialLoad) {
      setValidationMessage(
        `"${value}" is not a valid ${field.label.toLowerCase()}. Please select from the dropdown.`
      );
    } else {
      setValidationMessage("");
    }

    onValidationChange?.(field.key, isValueValid);
  };

  // Validate whenever the current value changes, but don't show errors initially
  useEffect(() => {
    // For existing entries, try to validate the value by fetching options first
    if (
      selectedRow &&
      currentValue &&
      allFetchedOptions.length === 0 &&
      !hasUserInteracted
    ) {
      // Don't show validation errors for existing entries until user interacts
      validateValue(currentValue, false);
    } else {
      validateValue(currentValue, hasUserInteracted && !initialLoad);
    }
  }, [currentValue, allFetchedOptions, hasUserInteracted, initialLoad]);

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
        // Build the API endpoint with search query
        const url = new URL(
          field.apiEndpoint,
          process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        );
        url.searchParams.append("filt", query);
        url.searchParams.append("limit", "20");

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let searchableOptions: SearchableOption[] = [];

        // Handle different response formats
        if (Array.isArray(data)) {
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
          const normalizedKey = field.key.toLowerCase().replace(/\s+/g, "_");

          if (Array.isArray(data[normalizedKey])) {
            // eslint-disable-next-line
            searchableOptions = data[normalizedKey].map((item: any) => ({
              value: item,
              label: item,
            }));
          }
        }

        searchableOptions = searchableOptions.filter(
          (option) => option.value && option.label
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
    setHasUserInteracted(true); // Mark that user has interacted
    setSearchQuery(value);
    onInputChange(field.key, value);

    if (error) {
      setError("");
    }
  };

  const handleOptionSelect = (option: SearchableOption) => {
    setHasUserInteracted(true);
    setSearchQuery(option.value);
    onInputChange(field.key, option.value);
    setIsOpen(false);
    setError("");
    setIsValid(true);
    setValidationMessage("");
    onValidationChange?.(field.key, true);
  };

  const handleInputFocus = () => {
    setHasUserInteracted(true);
    if (currentValue.trim().length >= 2 && options.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (hasUserInteracted && !initialLoad) {
        validateValue(currentValue, true);
      }
    }, 100);
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
                hasUserInteracted &&
                !initialLoad &&
                "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {!isValid && hasUserInteracted && !initialLoad && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
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

        {/* Validation error message - only show after user interaction */}
        {!isValid && validationMessage && hasUserInteracted && !initialLoad && (
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
                No results found for &quot;{searchQuery}&quot;
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
