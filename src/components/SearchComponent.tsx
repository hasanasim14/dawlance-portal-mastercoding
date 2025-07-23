"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AutocompleteInput } from "./AutoCompleteInput";
import type { ColumnConfig } from "@/lib/types";

// Define the type for the props based on the parent component's row data type
type SearchComponentProps = {
  fields: readonly ColumnConfig[];
  onSearch?: (fieldSearches: Record<string, string>) => void;
  onClearFilters?: () => void;
  fetchSuggestions?: (field: string, query: string) => Promise<string[]>;
  setIsCollapsed?: Dispatch<SetStateAction<boolean>>;
  isCollapsed?: boolean;
};

export default function SearchComponent({
  fields,
  onSearch,
  onClearFilters,
  fetchSuggestions,
  setIsCollapsed,
  isCollapsed,
}: SearchComponentProps) {
  const [fieldSearches, setFieldSearches] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.key]: "" }), {})
  );

  const handleInputChange = (field: string, key: string) => {
    setFieldSearches((prev) => ({
      ...prev,
      [field]: key,
    }));
  };

  const handleSearch = () => {
    if (onSearch) {
      // Filter out empty search fields
      const nonEmptySearches = Object.entries(fieldSearches).reduce(
        (acc, [key, value]) => {
          if (value.trim()) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>
      );

      onSearch(nonEmptySearches);
    }
  };

  const handleFieldSearch = (field: string, value: string) => {
    // Update the field value
    handleInputChange(field, value);

    // Create a search object with just this field
    const searchObj = { [field]: value };

    // Trigger the search
    if (onSearch) {
      onSearch(searchObj);
    }
  };

  const clearAllFields = () => {
    setFieldSearches(
      fields.reduce((acc, field) => ({ ...acc, [field.key]: "" }), {})
    );
    // Call the parent's clear filters handler to refresh data
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Default implementation if fetchSuggestions is not provided
  const defaultFetchSuggestions = async (query: string): Promise<string[]> => {
    // This is a placeholder - in a real app, you'd call your API
    console.log("Fetching suggestions for:", query);
    return [];
  };

  return (
    <Card
      className={cn(
        "gap-1 h-full flex flex-col pt-2 pb-1 transition-add duration-300 ease-in-out",
        isCollapsed ? "" : "h-32 w-16"
      )}
    >
      {!isCollapsed && (
        <div className="p-4 flex flex-col items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed?.(true)}
            className="w-8 h-8 p-0 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Filter className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </div>
      )}

      {isCollapsed && (
        <>
          <CardHeader className="flex-shrink-0 p-0">
            <div className="flex border-b p-2 justify-between">
              <CardTitle className="text-lg">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-lg">Search</span>
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearAllFields}>
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed?.(false)}
                  className="w-6 h-6 p-0 hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-grow pr-0 pl-3">
            <div className="space-y-3 pr-2">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`search-${field.key}`} className="text-sm">
                    {field.label}
                  </Label>
                  <AutocompleteInput
                    id={`search-${field.key}`}
                    placeholder={`Search by ${field.label}...`}
                    value={fieldSearches[field.key]}
                    onChange={(value) => handleInputChange(field.key, value)}
                    onSearch={(value) => handleFieldSearch(field.key, value)}
                    fetchSuggestions={(query) =>
                      fetchSuggestions
                        ? fetchSuggestions(field.key, query)
                        : defaultFetchSuggestions(query)
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-4 border-t mt-auto flex-shrink-0">
            <Button onClick={handleSearch} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
