"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, X, Loader2 } from "lucide-react";
import { transformToApiFormat } from "@/lib/data-transformers";
import type { FieldConfig } from "@/lib/types";
import { MultiSelectField } from "./MultiSelectField";
import { ConditionalField } from "./ConditionalField";
import { SearchableSelectField } from "./SearchableSelect";
import { FormField } from "./FormField";
import { MaterialField } from "./MaterialField";
// import { MaterialField } from "./form-fields/material-field";
// import { MultiSelectField } from "./form-fields/multi-select-field";
// import { FormField } from "./form-fields/form-field";
// import { SearchableSelectField } from "./form-fields/searchable-select-field";
// import { ConditionalField } from "./form-fields/conditional-field";

interface SelectOption {
  value: string;
  label: string;
}

interface RightSheetProps {
  parent: string;
  children?: React.ReactNode;
  className?: string;
  // eslint-disable-next-line
  selectedRow?: Record<string, any> | null;
  onReset?: () => void;
  // eslint-disable-next-line
  onSave?: (data: Record<string, any>) => Promise<void>;
  title?: string;
  fields?: FieldConfig[];
  apiEndpoint?: string;
  isOpen?: boolean;
  onClose?: () => void;
  fetchSuggestions?: (field: string, query: string) => Promise<string[]>;
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
  // eslint-disable-next-line
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<
    Record<string, boolean>
  >({}); // Track field validation

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
      if (selectedRow) {
        setFormData({ ...selectedRow });
        setHasChanges(false);
      }
    } else {
      setIsExpanded(false);
      setFormData({});
      setHasChanges(false);
      setFieldValidation({}); // Reset validation when closing
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
        if (!("apiEndpoint" in field) || !field.apiEndpoint) continue;

        setLoadingSelects((prev) => ({ ...prev, [field.key]: true }));
        try {
          const response = await fetch(field.apiEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (!response.ok)
            throw new Error(`Failed to fetch options for ${field.label}`);

          const data = await response.json();
          let options: SelectOption[] = [];

          if (Array.isArray(data)) {
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
              options = Object.entries(data).map(([key, value]) => ({
                value: key,
                label: typeof value === "string" ? value : key,
              }));
            } else if (field.key === "branch" || field.key === "branches") {
              if (data.sales_office && Array.isArray(data.sales_office)) {
                options = data.sales_office.map((code: string) => ({
                  value: code,
                  label: code,
                }));
              }
            } else if (field.key === "product" || field.key === "products") {
              // Handle products API response
              if (data.product && Array.isArray(data.product)) {
                // eslint-disable-next-line
                options = data.product.map((product: any) => ({
                  value:
                    typeof product === "string"
                      ? product
                      : product.id || product.name,
                  label:
                    typeof product === "string"
                      ? product
                      : product.name || product.label || product.id,
                }));
              } else if (Array.isArray(data)) {
                // eslint-disable-next-line
                options = data.map((product: any) => ({
                  value:
                    typeof product === "string"
                      ? product
                      : product.id || product.name,
                  label:
                    typeof product === "string"
                      ? product
                      : product.name || product.label || product.id,
                }));
              }
            } else {
              const fieldKey = field.key.toLowerCase();
              const possibleKeys = [
                fieldKey,
                `${fieldKey}s`,
                field.key,
                `${field.key}s`,
              ];
              for (const key of possibleKeys) {
                if (data[key] && Array.isArray(data[key])) {
                  // eslint-disable-next-line
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
            const response = await fetch(branchField.apiEndpoint, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });

            if (!response.ok) throw new Error("Failed to fetch branch options");

            const data = await response.json();
            let options: SelectOption[] = [];
            if (data.sales_office && Array.isArray(data.sales_office)) {
              options = data.sales_office.map((code: string) => ({
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

  // Load product options when role changes to "Product Manager"
  useEffect(() => {
    const loadProductOptions = async () => {
      if (formData.role === "product_manager" && !selectOptionsCache.products) {
        const productField = effectiveFields.find(
          (field) => field.key === "product"
        );

        if (
          productField &&
          "apiEndpoint" in productField &&
          productField.apiEndpoint
        ) {
          setLoadingSelects((prev) => ({ ...prev, products: true }));
          try {
            const response = await fetch(productField.apiEndpoint, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });

            if (!response.ok)
              throw new Error("Failed to fetch product options");

            const data = await response.json();
            let options: SelectOption[] = [];

            // Handle different response formats for products
            if (data.product && Array.isArray(data.product)) {
              // eslint-disable-next-line
              options = data.product.map((product: any) => ({
                value:
                  typeof product === "string"
                    ? product
                    : product.id || product.name,
                label:
                  typeof product === "string"
                    ? product
                    : product.name || product.label || product.id,
              }));
            } else if (Array.isArray(data)) {
              // eslint-disable-next-line
              options = data.map((product: any) => ({
                value:
                  typeof product === "string"
                    ? product
                    : product.id || product.name,
                label:
                  typeof product === "string"
                    ? product
                    : product.name || product.label || product.id,
              }));
            } else {
              // Handle other possible response formats
              const possibleKeys = ["product", "data", "items"];
              for (const key of possibleKeys) {
                if (data[key] && Array.isArray(data[key])) {
                  // eslint-disable-next-line
                  options = data[key].map((product: any) => ({
                    value:
                      typeof product === "string"
                        ? product
                        : product.id || product.name || product.value,
                    label:
                      typeof product === "string"
                        ? product
                        : product.name ||
                          product.label ||
                          product.value ||
                          product.id,
                  }));
                  break;
                }
              }
            }

            setSelectOptionsCache((prev) => ({
              ...prev,
              products: options,
            }));
          } catch (error) {
            console.error("Error loading product options:", error);
            setSelectOptionsCache((prev) => ({
              ...prev,
              products: [],
            }));
          } finally {
            setLoadingSelects((prev) => ({ ...prev, products: false }));
          }
        }
      }
    };

    loadProductOptions();
  }, [formData.role, effectiveFields, selectOptionsCache.products]);

  const toggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (!newExpandedState) {
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({});
    setHasChanges(false);
    setFieldValidation({});
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

      // Clear products selection when role changes from "Product Manager" to something else
      if (key === "role" && value !== "product_manager" && prev.products) {
        newData.products = [];
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

  // Handle validation changes from searchable select fields
  const handleValidationChange = (key: string, isValid: boolean) => {
    setFieldValidation((prev) => ({
      ...prev,
      [key]: isValid,
    }));
  };

  // Check if all fields are valid
  const isFormValid = () => {
    const searchableSelectFields = effectiveFields.filter(
      (field) => field.type === "searchable-select"
    );

    // Check if any searchable select field is invalid
    const hasInvalidFields = searchableSelectFields.some((field) => {
      const fieldValue = formData[field.key]?.toString().trim();
      // If field has a value but validation is false, it's invalid
      return fieldValue && fieldValidation[field.key] === false;
    });

    return !hasInvalidFields;
  };

  const handleSave = async () => {
    if (!hasChanges || !isFormValid()) {
      return;
    }

    setIsSaving(true);
    try {
      const apiFormattedData = transformToApiFormat(formData);
      if (onSave) {
        await onSave(apiFormattedData);
      } else {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    setFieldValidation({});
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

  const renderField = (field: FieldConfig) => {
    if (field.key === "Master ID" && selectedRow) return null;
    if (!isFieldVisible(field)) return null;

    // Handle Material field with existing logic
    if (field.key === "Material" || field.key === "material") {
      return (
        <MaterialField
          key={field.key}
          field={field}
          formData={formData}
          selectedRow={selectedRow}
          hasChanges={hasChanges}
          onInputChange={handleInputChange}
          parent={parent}
        />
      );
    }

    // Handle Multi-select fields for branches - only show when role is "branch"
    if (field.key === "branch") {
      if (formData.role !== "branch") {
        return null;
      }
      return (
        <MultiSelectField
          key={field.key}
          field={field}
          formData={formData}
          selectedRow={selectedRow}
          hasChanges={hasChanges}
          options={selectOptionsCache[field.key] || []}
          isLoading={loadingSelects[field.key] || false}
          onInputChange={handleInputChange}
        />
      );
    }

    // Handle Multi-select fields for products - only show when role is "Product Manager"
    if (field.key === "products") {
      if (formData.role !== "Product Manager") {
        return null;
      }
      return (
        <MultiSelectField
          key={field.key}
          field={field}
          formData={formData}
          selectedRow={selectedRow}
          hasChanges={hasChanges}
          options={selectOptionsCache[field.key] || []}
          isLoading={loadingSelects[field.key] || false}
          onInputChange={handleInputChange}
        />
      );
    }

    // Handle conditional fields (checkbox + searchable select OR date picker)
    if (field.type === "conditional") {
      return (
        <ConditionalField
          key={field.key}
          field={field}
          formData={formData}
          selectedRow={selectedRow}
          hasChanges={hasChanges}
          onInputChange={handleInputChange}
          onValidationChange={handleValidationChange}
        />
      );
    }

    // Handle searchable select fields (like Product)
    if (field.type === "searchable-select") {
      return (
        <SearchableSelectField
          key={field.key}
          field={field}
          formData={formData}
          selectedRow={selectedRow}
          hasChanges={hasChanges}
          onInputChange={handleInputChange}
          onValidationChange={handleValidationChange}
        />
      );
    }

    // Handle regular fields
    return (
      <FormField
        key={field.key}
        field={field}
        formData={formData}
        selectedRow={selectedRow}
        hasChanges={hasChanges}
        options={field.selectOptions || selectOptionsCache[field.key] || []}
        isLoading={loadingSelects[field.key] || false}
        onInputChange={handleInputChange}
      />
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
          className="flex-1 bg-transparent"
        >
          Reset
        </Button>
        <Button
          disabled={
            !isVisible ||
            !hasChanges ||
            isSaving ||
            !isFormValid() || // Add form validation check
            effectiveFields.some(
              (field) =>
                field.required &&
                (!formData[field.key] ||
                  (Array.isArray(formData[field.key])
                    ? formData[field.key].length === 0
                    : formData[field.key].toString().trim() === ""))
            )
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
