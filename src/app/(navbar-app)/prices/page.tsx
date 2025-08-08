"use client";
import { useEffect, useState } from "react";
import { PaginationData } from "@/lib/types";
import PricesDataTable from "@/components/prices/PricesDataTable";

export type FilterableColumn = "Material" | "Material Description" | "Product";

type AppliedFilters = Partial<Record<FilterableColumn, string[]>>;

export interface PricesDataProps {
  Material: string;
  "Material Description": string;
  Product: string;
  Price: number;
}

export default function Prices() {
  const [pricesData, setPricesData] = useState<PricesDataProps[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total_records: 0,
    records_per_page: 50,
    page: 1,
    total_pages: 0,
  });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  // const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  useEffect(() => {
    fetchPrices(currentPage, pageSize, appliedFilters);
  }, [currentPage, pageSize, appliedFilters]); // Re-fetch when filters change

  const fetchPrices = async (
    page = 1,
    recordsPerPage = 50,
    filters: AppliedFilters = {}
  ) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: recordsPerPage.toString(),
      });

      // Add filters to query parameters
      if (filters.Material && filters.Material.length > 0) {
        queryParams.append("material", filters.Material.join(","));
      }
      if (
        filters["Material Description"] &&
        filters["Material Description"].length > 0
      ) {
        queryParams.append(
          "material_description",
          filters["Material Description"].join(",")
        );
      }
      if (filters.Product && filters.Product.length > 0) {
        queryParams.append("product", filters.Product.join(","));
      }

      const endpoint = `${
        process.env.NEXT_PUBLIC_BASE_URL
      }/prices?${queryParams.toString()}`;
      console.log("endoin", endpoint);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/prices?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      setPricesData(data?.data || []);
      setPagination({
        total_records: data?.total_records || 0,
        records_per_page: recordsPerPage,
        page,
        total_pages: data?.total_pages || 0,
      });
    } catch (error) {
      console.error("Error fetching price group data:", error);
    }
  };

  const handlePageSizeChange = (val: string) => {
    const size = Number.parseInt(val);
    setPageSize(size);
    setCurrentPage(1);
    // Filters are already in appliedFilters state, useEffect will trigger re-fetch
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Filters are already in appliedFilters state, useEffect will trigger re-fetch
  };

  const handleUpdate = async ({
    material,
    value,
  }: {
    material: string;
    value: number;
  }) => {
    try {
      const payload = {
        material,
        price: value,
      };
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/prices/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      // Optionally refresh or just update local state
      // fetchPrices(currentPage, pageSize, appliedFilters); // Re-fetch after update
    } catch (error) {
      console.error("Failed to update price:", error);
    }
  };

  const handleFilterApply = (column: FilterableColumn, values: string[]) => {
    setAppliedFilters((prev) => ({
      ...prev,
      [column]: values,
    }));
  };

  return (
    <div className="p-4">
      <PricesDataTable
        data={pricesData}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSize={pageSize}
        pagination={pagination}
        currentPage={currentPage}
        onUpdate={handleUpdate}
        onFilterApply={handleFilterApply}
        activeFilters={appliedFilters}
      />
    </div>
  );
}
