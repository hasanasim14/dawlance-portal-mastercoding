"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/types";

interface MaterialOption {
  material: string;
}

interface MaterialDetails {
  material: string;
  material_description: string;
  product: string;
}

interface MaterialFieldProps {
  field: FieldConfig;
  // eslint-disable-next-line
  formData: Record<string, any>;
  // eslint-disable-next-line
  selectedRow?: Record<string, any> | null;
  hasChanges: boolean;
  onInputChange: (key: string, value: string) => void;
  parent: string;
}

export function MaterialField({
  field,
  formData,
  selectedRow,
  hasChanges,
  onInputChange,
  parent,
}: MaterialFieldProps) {
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  const [materialError, setMaterialError] = useState("");

  const isEditMode = !!selectedRow;

  // Material search logic
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

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

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
  }, [formData.Material, formData.material, selectedRow, parent]);

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

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

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

    onInputChange(materialFieldKey, material.material);

    try {
      const details = await fetchMaterialDetails(material.material);
      if (details) {
        // Update additional fields with material details
        setTimeout(() => {
          onInputChange("Material Description", details.material_description);
          onInputChange("Product", details.product);
          onInputChange("material_description", details.material_description);
          onInputChange("product", details.product);
        }, 0);
      }
    } catch (error) {
      console.error("Error fetching material details:", error);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key.toLowerCase().replace(/\s+/g, "_")}>
        {field.label}
      </Label>
      <div className="relative" data-material-container>
        <Input
          id={field.key.toLowerCase().replace(/\s+/g, "_")}
          type={field.type || "text"}
          placeholder={isEditMode ? field.label : `Search ${field.label}...`}
          value={formData[field.key]?.toString() || ""}
          onChange={(e) => {
            const value = e.target.value;
            onInputChange(field.key, value);
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
        {materialDropdownOpen && materialOptions.length > 0 && !isEditMode && (
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
      {materialError && (
        <div className="bg-red-200 p-2 text-xs text-red-500 rounded">
          {materialError}
        </div>
      )}
    </div>
  );
}
