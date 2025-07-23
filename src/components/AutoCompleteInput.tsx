"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AutocompleteInputProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
}

export function AutocompleteInput({
  id,
  placeholder,
  value,
  onChange,
  onSearch,
  fetchSuggestions,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when the input value changes and user is actively typing
  useEffect(() => {
    const getSuggestions = async () => {
      if (value.trim().length > 0 && isTyping) {
        setIsLoading(true);
        try {
          const results = await fetchSuggestions(value);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      } else if (value.trim().length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(getSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, fetchSuggestions, isTyping]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsTyping(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsTyping(true);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setIsTyping(false);
    inputRef.current?.focus();
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch(value);
      setShowSuggestions(false);
      setIsTyping(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setIsTyping(false);
    } else if (
      e.key === "ArrowDown" &&
      showSuggestions &&
      suggestions.length > 0
    ) {
      e.preventDefault();
      const firstSuggestion = suggestionsRef.current
        ?.firstElementChild as HTMLElement;
      if (firstSuggestion) firstSuggestion.focus();
    }
  };

  const handleSuggestionKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    suggestion: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSuggestionClick(suggestion);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setIsTyping(false);
      inputRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
      if (nextSibling) nextSibling.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevSibling = e.currentTarget.previousElementSibling as HTMLElement;
      if (prevSibling) {
        prevSibling.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  // Handle focus - only show suggestions if user starts typing
  const handleFocus = () => {
    // Don't automatically show suggestions on focus
    // They will show when user starts typing
  };

  // Handle search button click
  const handleSearchClick = () => {
    onSearch(value);
    setShowSuggestions(false);
    setIsTyping(false);
  };

  return (
    <div className="relative">
      <div className="flex">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full"
          onClick={handleSearchClick}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isLoading ? (
            <div className="p-2 text-center text-muted-foreground">
              Loading...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion}-${index}`}
                tabIndex={0}
                className="cursor-pointer rounded px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSuggestionClick(suggestion);
                }}
                onKeyDown={(e) => handleSuggestionKeyDown(e, suggestion)}
              >
                {suggestion}
              </div>
            ))
          ) : (
            <div className="p-2 text-center text-muted-foreground">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
