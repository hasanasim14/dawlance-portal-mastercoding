"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, Loader2, ChevronDown } from "lucide-react";
import { transformToApiFormat } from "@/lib/data-transformers";
import { FieldConfig } from "@/lib/types";

interface SelectOption {
  value: string;
  label: string;
}

interface RightSheetProps {
  parent: string;
  children?: React.ReactNode;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedRow?: Record<string, any> | null;
  onReset?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave?: (data: Record<string, any>) => Promise<void>;
  title?: string;
  fields?: FieldConfig[];
  apiEndpoint?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MaterialOption {
  material: string;
}

interface MaterialDetails {
  material: string;
  material_description: string;
  product: string;
}

export function RightSheet({
  parent,
  children,
  className,
  selectedRow,
  onReset,
  onSave,
  title = "Details",
  fields,
  apiEndpoint = "/api/save",
  isOpen,
  onClose,
}: RightSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Material-specific states (existing functionality)
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  const [materialError, setMaterialError] = useState("");
  // Dynamic select options state
  const [selectOptionsCache, setSelectOptionsCache] = useState<
    Record<string, SelectOption[]>
  >({});
  const [loadingSelects, setLoadingSelects] = useState<Record<string, boolean>>(
    {}
  );
  const sheetRef = useRef<HTMLDivElement>(null);

  // Auto-generate fields from selectedRow if not provided
  const effectiveFields =
    fields ||
    (selectedRow
      ? Object.keys(selectedRow).map((key) => ({
          key,
          label: key,
          type: "text" as const,
          required: false,
          readOnly: false,
        }))
      : []);

  // Effect to expand sheet when a row is selected
  useEffect(() => {
    const shouldBeOpen = isOpen !== undefined ? isOpen : !!selectedRow;
    if (shouldBeOpen) {
      setIsExpanded(true);
      // Initialize form data with selected row data
      if (selectedRow) {
        setFormData({ ...selectedRow });
        setHasChanges(false);
      }
    } else {
      setIsExpanded(false);
      setFormData({});
      setHasChanges(false);
    }
  }, [selectedRow, isOpen]);

  // Load select options for fields with apiEndpoint
  useEffect(() => {
    const loadSelectOptions = async () => {
      const fieldsWithApiEndpoints = effectiveFields.filter(
        (field) =>
          field.type === "select" &&
          field.apiEndpoint &&
          !selectOptionsCache[field.key]
      );

      for (const field of fieldsWithApiEndpoints) {
        // if (!field.apiEndpoint) continue;
        if (!("apiEndpoint" in field) || !field.apiEndpoint) continue;
        setLoadingSelects((prev) => ({ ...prev, [field.key]: true }));

        try {
          const authToken = localStorage.getItem("token");
          const response = await fetch(field.apiEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
          });
          if (!response.ok)
            throw new Error(`Failed to fetch options for ${field.label}`);

          const data = await response.json();

          // Handle different response formats
          let options: SelectOption[] = [];

          if (Array.isArray(data)) {
            // If data is directly an array of strings
            options = data.map((item) => ({
              value:
                typeof item === "string"
                  ? item
                  : item.value || item.id || item.name,
              label:
                typeof item === "string"
                  ? item
                  : item.label || item.name || item.value || item.id,
            }));
          } else if (data && typeof data === "object") {
            if (field.key === "role" || field.key === "roles") {
              // Handle roles API response
              options = Object.entries(data).map(([key, value]) => ({
                value: key,
                label: typeof value === "string" ? value : key,
              }));
            } else if (field.key === "branch" || field.key === "branches") {
              // Handle branches API response
              if (data.branch_code && Array.isArray(data.branch_code)) {
                options = data.branch_code.map((code: string) => ({
                  value: code,
                  label: code,
                }));
              }
            } else {
              // Generic object handling for other fields
              const fieldKey = field.key.toLowerCase();
              const possibleKeys = [
                fieldKey,
                `${fieldKey}s`,
                field.key,
                `${field.key}s`,
              ];

              for (const key of possibleKeys) {
                if (data[key] && Array.isArray(data[key])) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options = data[key].map((item: any) => ({
                    value:
                      typeof item === "string"
                        ? item
                        : item.value || item.id || item.name,
                    label:
                      typeof item === "string"
                        ? item
                        : item.label || item.name || item.value || item.id,
                  }));
                  break;
                }
              }
            }
          }

          setSelectOptionsCache((prev) => ({
            ...prev,
            [field.key]: options,
          }));
        } catch (error) {
          console.error(`Error loading options for ${field.label}:`, error);
          setSelectOptionsCache((prev) => ({
            ...prev,
            [field.key]: [],
          }));
        } finally {
          setLoadingSelects((prev) => ({ ...prev, [field.key]: false }));
        }
      }
    };

    if (effectiveFields.length > 0) {
      loadSelectOptions();
    }
  }, [effectiveFields]);

  // Load branch options when role changes to "branch"
  useEffect(() => {
    const loadBranchOptions = async () => {
      if (formData.role === "branch" && !selectOptionsCache.branch) {
        const branchField = effectiveFields.find(
          (field) => field.key === "branch"
        );
        if (
          branchField &&
          "apiEndpoint" in branchField &&
          branchField.apiEndpoint
        ) {
          setLoadingSelects((prev) => ({ ...prev, branch: true }));

          try {
            const authToken = localStorage.getItem("token");
            const response = await fetch(branchField.apiEndpoint, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
              },
            });
            if (!response.ok) throw new Error("Failed to fetch branch options");

            const data = await response.json();
            let options: SelectOption[] = [];

            if (data.branch_code && Array.isArray(data.branch_code)) {
              options = data.branch_code.map((code: string) => ({
                value: code,
                label: code,
              }));
            }

            setSelectOptionsCache((prev) => ({
              ...prev,
              branch: options,
            }));
          } catch (error) {
            console.error("Error loading branch options:", error);
            setSelectOptionsCache((prev) => ({
              ...prev,
              branch: [],
            }));
          } finally {
            setLoadingSelects((prev) => ({ ...prev, branch: false }));
          }
        }
      }
    };

    loadBranchOptions();
  }, [formData.role, effectiveFields]);

  const toggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // If collapsing, also clear the selected row
    if (!newExpandedState) {
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({});
    setHasChanges(false);
    onClose?.();
    onReset?.();
  };

  const handleInputChange = (key: string, value: string | string[]) => {
    setFormData((prev) => {
      const newData = { ...prev, [key]: value };

      // Clear branch selection when role changes from "branch" to something else
      if (key === "role" && value !== "branch" && prev.branch) {
        newData.branch = [];
      }

      const hasDataChanges = selectedRow
        ? Object.keys(newData).some((k) => {
            const newVal = Array.isArray(newData[k])
              ? newData[k].join(",")
              : newData[k];
            const oldVal = Array.isArray(selectedRow[k])
              ? selectedRow[k].join(",")
              : selectedRow[k];
            return newVal !== oldVal;
          })
        : Object.values(newData).some((v) => {
            if (Array.isArray(v)) return v.length > 0;
            return v !== "";
          });
      setHasChanges(hasDataChanges);
      return newData;
    });
  };

  const handleSave = async () => {
    if (!hasChanges) {
      return;
    }

    setIsSaving(true);
    try {
      // Transform data to API format before sending
      const apiFormattedData = transformToApiFormat(formData);

      if (onSave) {
        // Use custom save handler if provided
        await onSave(apiFormattedData);
      } else {
        // Default API call
        const authToken = localStorage.getItem("token");
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(apiFormattedData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedRow) {
      setFormData({ ...selectedRow });
    } else {
      setFormData({});
    }
    setHasChanges(false);
    onReset?.();
  };

  const isVisible = isOpen !== undefined ? isOpen : !!selectedRow;

  // Check if field should be visible based on dependencies
  const isFieldVisible = (field: FieldConfig) => {
    if (!field.dependsOn || !field.dependsOnValue) return true;

    const dependentValue = formData[field.dependsOn];
    if (Array.isArray(field.dependsOnValue)) {
      return field.dependsOnValue.includes(dependentValue);
    }
    return dependentValue === field.dependsOnValue;
  };

  const MultiSelectField = ({ field }: { field: FieldConfig }) => {
    const options = selectOptionsCache[field.key] || [];
    const isLoading = loadingSelects[field.key];
    const selectedValues = Array.isArray(formData[field.key])
      ? formData[field.key]
      : [];
    const [isOpen, setIsOpen] = useState(false);

    const handleToggleOption = (value: string) => {
      const currentValues = Array.isArray(formData[field.key])
        ? formData[field.key]
        : [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v: string) => v !== value)
        : [...currentValues, value];

      handleInputChange(field.key, newValues);
    };

    const handleRemoveOption = (value: string) => {
      const currentValues = Array.isArray(formData[field.key])
        ? formData[field.key]
        : [];
      const newValues = currentValues.filter((v: string) => v !== value);
      handleInputChange(field.key, newValues);
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
              // Only close if clicking outside the popover
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
  };

  // Existing material search logic (unchanged)
  useEffect(() => {
    if (selectedRow || parent === "mastercoding") {
      setMaterialOptions([]);
      setMaterialDropdownOpen(false);
      return;
    }

    const materialValue = formData.Material || formData.material || "";

    const searchMaterials = async () => {
      const query = materialValue.toString();

      if (!query.trim()) {
        setMaterialOptions([]);
        setMaterialError("");
        setMaterialDropdownOpen(false);
        return;
      }

      if (query.trim().length < 2) {
        setMaterialOptions([]);
        setMaterialDropdownOpen(false);
        return;
      }

      setIsSearchingMaterials(true);
      setMaterialError("");

      try {
        const endpoint = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/mastercoding/distinct/material?filt=${encodeURIComponent(query)}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to fetch materials");
        const data = await response.json();

        const materialOptions =
          data.material?.map((material: string) => ({ material })) || [];

        setMaterialOptions(materialOptions);

        if (materialOptions.length > 0) {
          setMaterialDropdownOpen(true);
        } else {
          setMaterialDropdownOpen(false);
          setMaterialError("Please add material in mastercoding first");
        }
      } catch (error) {
        console.error("Error searching materials:", error);
        setMaterialError("Failed to search materials");
        setMaterialOptions([]);
        setMaterialDropdownOpen(false);
      } finally {
        setIsSearchingMaterials(false);
      }
    };

    const debounceTimer = setTimeout(searchMaterials, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.Material, formData.material, selectedRow]);

  // Handle clicking outside to close material dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const materialContainer = target.closest("[data-material-container]");
      if (!materialContainer && materialDropdownOpen) {
        setMaterialDropdownOpen(false);
      }
    };

    if (materialDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [materialDropdownOpen]);

  const fetchMaterialDetails = async (
    materialCode: string
  ): Promise<MaterialDetails | null> => {
    try {
      const endpoint = `${
        process.env.NEXT_PUBLIC_BASE_URL
      }/mastercoding?page=1&limit=50&material=${encodeURIComponent(
        materialCode
      )}`;
      const response = await fetch(endpoint);

      if (!response.ok) throw new Error("Failed to fetch material details");

      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const item = result.data[0];
        return {
          material: item.Material || materialCode,
          material_description: item["Material Description"] || "",
          product: item.Product || "",
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching material details:", error);
      setMaterialError("Failed to fetch material details");
      return null;
    }
  };

  const handleMaterialSelect = async (material: MaterialOption) => {
    setMaterialDropdownOpen(false);
    setMaterialError("");

    const materialFieldKey = formData.hasOwnProperty("Material")
      ? "Material"
      : "material";

    setFormData((prev) => ({
      ...prev,
      [materialFieldKey]: material.material,
    }));
    setHasChanges(true);

    try {
      const details = await fetchMaterialDetails(material.material);
      if (details) {
        setFormData((prev) => ({
          ...prev,
          [materialFieldKey]: material.material,
          "Material Description": details.material_description,
          Product: details.product,
          material_description: details.material_description,
          product: details.product,
        }));
      }
    } catch (error) {
      console.error("Error fetching material details:", error);
    }
  };

  const renderField = (field: FieldConfig) => {
    if (field.key === "Master ID" && selectedRow) return null;
    if (!isFieldVisible(field)) return null;

    // Handle Material field with existing logic
    if (field.key === "Material" || field.key === "material") {
      const isEditMode = !!selectedRow;

      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
            {field.label}
          </Label>
          <div className="relative" data-material-container>
            <Input
              id={field.key.toLowerCase().replace(/\s+/g, "_")}
              type={field.type || "text"}
              placeholder={
                isEditMode ? field.label : `Search ${field.label}...`
              }
              value={formData[field.key]?.toString() || ""}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange(field.key, value);
              }}
              onFocus={() => {
                if (!isEditMode) {
                  const currentValue = formData[field.key]?.toString() || "";
                  if (
                    currentValue.trim().length >= 2 &&
                    materialOptions.length > 0
                  ) {
                    setMaterialDropdownOpen(true);
                  }
                }
              }}
              readOnly={field.readOnly}
              required={field.required}
              className={cn(
                field.readOnly && "bg-muted/40",
                hasChanges &&
                  formData[field.key] !== selectedRow?.[field.key] &&
                  "border-orange-300"
              )}
            />
            {isSearchingMaterials && !isEditMode && (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only">Loading...</span>
              </div>
            )}

            {materialDropdownOpen &&
              materialOptions.length > 0 &&
              !isEditMode && (
                <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {materialOptions.map((option, index) => (
                    <div
                      key={`${option.material}-${index}`}
                      className="cursor-pointer rounded px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMaterialSelect(option);
                      }}
                    >
                      <span className="font-medium">{option.material}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      );
    }

    // Handle Multi-select fields (for branches) - only show when role is "branch"
    if (field.key === "branch") {
      if (formData.role !== "branch") {
        return null;
      }
      return <MultiSelectField key={field.key} field={field} />;
    }

    // Handle Select fields
    if (field.type === "select") {
      const options =
        field.selectOptions || selectOptionsCache[field.key] || [];
      const isLoading = loadingSelects[field.key];

      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
            {field.label}
          </Label>
          <Select
            value={formData[field.key]?.toString() || ""}
            onValueChange={(value) => handleInputChange(field.key, value)}
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
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
          {field.label}
        </Label>
        <Input
          id={field.key.toLowerCase().replace(/\s+/g, "_")}
          type={field.type || "text"}
          placeholder={field.label}
          value={formData[field.key]?.toString() || ""}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
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
              (field.key.toLowerCase() === "product" &&
                formData["material"])) &&
              "bg-muted/40",
            hasChanges &&
              formData[field.key] !== selectedRow?.[field.key] &&
              "border-orange-300"
          )}
        />
      </div>
    );
  };

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed top-0 bottom-0 right-0 z-50 bg-background border-l border-border rounded-l-xl shadow-lg transition-all duration-300 ease-in-out",
        isExpanded ? "w-[450px]" : "w-[6px]",
        className
      )}
      style={{
        transform: isVisible ? "translateX(0)" : "translateX(100%)",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      {/* Handle and header */}
      <div
        className="cursor-pointer flex items-center justify-between p-4 border-b"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 bg-muted-foreground/30 rounded-full" />
          <h2 className="text-lg font-semibold truncate">
            {selectedRow && selectedRow["Master ID"]
              ? `Master ID: ${selectedRow["Master ID"]}`
              : title}
          </h2>
          {hasChanges && <div className="h-2 w-2 bg-orange-500 rounded-full" />}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="h-8 w-8"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded ? "rotate-0" : "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div
        className={cn(
          "overflow-auto p-5 transition-all h-[calc(100%-130px)]",
          isExpanded ? "opacity-100" : "opacity-0"
        )}
      >
        {materialError && (
          <div className="bg-red-200 mb-4 p-2 text-xs text-red-500 rounded">
            {materialError}
          </div>
        )}
        {isVisible && effectiveFields.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {effectiveFields.map(renderField)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-10">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <X className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-center">Select a row to view details</p>
          </div>
        )}

        {children}
      </div>

      {/* Action buttons */}
      <div
        className={cn(
          "border-t p-4 flex justify-end gap-3 bg-background/80 backdrop-blur-sm transition-all absolute bottom-0 left-0 right-0",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <Button
          variant="outline"
          disabled={!isVisible || isSaving}
          onClick={handleReset}
          className="flex-1"
        >
          Reset
        </Button>
        <Button
          disabled={
            !isVisible ||
            !hasChanges ||
            isSaving ||
            effectiveFields.some(
              (field) =>
                field.required &&
                (!formData[field.key] ||
                  (Array.isArray(formData[field.key])
                    ? formData[field.key].length === 0
                    : formData[field.key].toString().trim() === ""))
            ) ||
            !!materialError
          }
          onClick={handleSave}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
