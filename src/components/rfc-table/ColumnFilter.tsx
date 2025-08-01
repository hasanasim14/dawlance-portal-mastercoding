"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Filter, Search, X } from "lucide-react";
import { ScrollArea } from "../ui/scrollarea";

interface ColumnFilterProps {
  columnKey: string;
  columnLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  selectedFilters: string[];
  onFilterChange: (columnKey: string, selectedValues: string[]) => void;
  onApplyFilter: () => void;
}

export const ColumnFilter: React.FC<ColumnFilterProps> = ({
  columnKey,
  columnLabel,
  data,
  selectedFilters,
  onFilterChange,
  onApplyFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelectedFilters, setLocalSelectedFilters] =
    useState<string[]>(selectedFilters);

  // Get all unique values from the column
  const uniqueValues = React.useMemo(() => {
    const values = data
      .map((row) => String(row[columnKey] || ""))
      .filter((value) => value.trim() !== "")
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return values;
  }, [data, columnKey]);

  // filtering
  const filteredValues = uniqueValues.filter((value) =>
    value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // changing local state of data
  useEffect(() => {
    setLocalSelectedFilters(selectedFilters);
  }, [selectedFilters]);

  const handleSelectAll = () => {
    const newSelection =
      localSelectedFilters.length === filteredValues.length
        ? []
        : filteredValues;
    setLocalSelectedFilters(newSelection);
  };

  const handleValueToggle = (value: string) => {
    const newSelection = localSelectedFilters.includes(value)
      ? localSelectedFilters.filter((item) => item !== value)
      : [...localSelectedFilters, value];
    setLocalSelectedFilters(newSelection);
  };

  const handleApply = () => {
    onFilterChange(columnKey, localSelectedFilters);
    onApplyFilter();
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalSelectedFilters([]);
    onFilterChange(columnKey, []);
    onApplyFilter();
    setIsOpen(false);
  };

  const hasActiveFilters = selectedFilters.length > 0;
  const isSelectAllChecked =
    localSelectedFilters.length === filteredValues.length &&
    filteredValues.length > 0;
  const isSelectAllIndeterminate =
    localSelectedFilters.length > 0 &&
    localSelectedFilters.length < filteredValues.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 hover:bg-muted ${
            hasActiveFilters ? "text-blue-600" : "text-muted-foreground"
          }`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="right" align="start">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Filter {columnLabel}</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>

        <div className="p-4">
          {/* Select All Checkbox */}
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={isSelectAllChecked}
              onCheckedChange={handleSelectAll}
              className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
              {...(isSelectAllIndeterminate && {
                "data-state": "indeterminate",
              })}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select All ({filteredValues.length})
            </label>
          </div>

          {/* Values List */}
          <ScrollArea className="h-45">
            <div className="space-y-2">
              {filteredValues.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No values found
                </div>
              ) : (
                filteredValues.map((value) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${value}`}
                      checked={localSelectedFilters.includes(value)}
                      onCheckedChange={() => handleValueToggle(value)}
                    />
                    <label
                      htmlFor={`filter-${value}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      title={value}
                    >
                      <span className="truncate block max-w-[200px]">
                        {value}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t flex justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {localSelectedFilters.length} of {filteredValues.length} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 px-3 text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
