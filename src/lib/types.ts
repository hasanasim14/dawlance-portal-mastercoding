export type RowDataType = {
  // Master Coding
  "Master ID": number;
  Product: string;
  Material: string;
  "Material Description": string;
  "Measurement Instrument": string;
  "Colour Similarity": string;
  "Product Type": string;
  Function: string;
  Series: string;
  Colour: string;
  "Key Feature": string;
  // Branch Master
  "Branch Code": string;
  "Sales Branch": string;
  "Sales Office": string;
  "Branch Manager": string;
  // Users
  User: string;
  Name: string;
  Email: string;
  Role: string;
  Branch: string;
  // Branch RFC
  "Last RFC": string;
  "YTD Sales": string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type SortConfig = {
  key: keyof RowDataType;
} | null;

export type FilterConfig = {
  [key: string]: string;
};

export type PaginationData = {
  total_records: number;
  records_per_page: number;
  page: number;
  total_pages: number;
};

export interface FieldConfig {
  key: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "email"
    | "tel"
    | "select"
    | "multi-select"
    | "searchable-select"
    | "conditional"
    | "date";
  required?: boolean;
  readOnly?: boolean;
  selectOptions?: SelectOption[];
  apiEndpoint?: string;
  dependsOn?: string;
  dependsOnValue?: string | string[];
  checkboxLabel?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

export type ColumnConfig = {
  key: string;
  label: string;
};

export type PermissionConfig = {
  post_allowed: number;
  save_allowed: number;
};
