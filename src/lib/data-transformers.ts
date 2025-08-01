/**
 * Utility functions for transforming data between different formats
 * Used across components for consistent API communication
 */

// Mapping between display keys and API keys
const KEY_MAPPING = {
  "Master ID": "master_id",
  Product: "product",
  Material: "material",
  "Material Description": "material_description",
  "Measurement Instrument": "measurement_instrument",
  "Colour Similarity": "colour_similarity",
  "Product type": "product_type",
  Function: "function",
  Series: "series",
  Colour: "colour",
  "Key Feature": "key_feature",
  Role: "role",
  Branch: "branch",
} as const;

// Reverse mapping for transforming API response back to display format
const REVERSE_KEY_MAPPING = Object.entries(KEY_MAPPING).reduce(
  (acc, [displayKey, apiKey]) => {
    acc[apiKey] = displayKey;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Transform display format data to API format (snake_case)
 * @param data - Data object with display format keys
 * @returns Data object with API format keys
 */

export function transformToApiFormat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed: Record<string, any> = {};

  Object.entries(data).forEach(([key, value]) => {
    const apiKey =
      KEY_MAPPING[key as keyof typeof KEY_MAPPING] ||
      key.toLowerCase().replace(/\s+/g, "_");
    transformed[apiKey] = value;
  });

  if (transformed.role) {
    if (transformed.role !== "branch") {
      transformed.branch = ["All"];
    }
    if (transformed.role !== "product_manager") {
      transformed.product = ["All"];
    }
  }

  return transformed;
}

/**
 * Transform API format data to display format
 * @param data - Data object with API format keys
 * @returns Data object with display format keys
 */
export function transformFromApiFormat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed: Record<string, any> = {};

  Object.entries(data).forEach(([key, value]) => {
    const displayKey =
      REVERSE_KEY_MAPPING[key] ||
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    transformed[displayKey] = value;
  });

  return transformed;
}

/**
 * Transform array of data objects from API format to display format
 * @param dataArray - Array of data objects with API format keys
 * @returns Array of data objects with display format keys
 */
export function transformArrayFromApiFormat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataArray: Record<string, any>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any>[] {
  return dataArray.map(transformFromApiFormat);
}

/**
 * Transform array of data objects to API format
 * @param dataArray - Array of data objects with display format keys
 * @returns Array of data objects with API format keys
 */
export function transformArrayToApiFormat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataArray: Record<string, any>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any>[] {
  return dataArray.map(transformToApiFormat);
}

/**
 * Get API key from display key
 * @param displayKey - Display format key
 * @returns API format key
 */
export function getApiKey(displayKey: string): string {
  return (
    KEY_MAPPING[displayKey as keyof typeof KEY_MAPPING] ||
    displayKey.toLowerCase().replace(/\s+/g, "_")
  );
}

/**
 * Get display key from API key
 * @param apiKey - API format key
 * @returns Display format key
 */
export function getDisplayKey(apiKey: string): string {
  return (
    REVERSE_KEY_MAPPING[apiKey] ||
    apiKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * Transform array of Master IDs for bulk delete operations
 * @param masterIds - Array of Master ID values
 * @returns Object with master_ids array for API
 */
export function transformMasterIdsForDelete(masterIds: number[]): {
  master_ids: number[];
} {
  return {
    master_ids: masterIds,
  };
}

export function extractFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedRows: Record<string, any>[],
  fieldName: string
) {
  return selectedRows
    .map((row) => row[fieldName])
    .filter((id) => id !== undefined && id !== null);
}
