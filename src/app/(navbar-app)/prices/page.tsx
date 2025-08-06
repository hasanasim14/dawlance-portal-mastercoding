"use client";

import { useEffect, useState } from "react";
import { PaginationData } from "@/lib/types";
import PricesDataTable from "@/components/prices/PricesDataTable";

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

  useEffect(() => {
    fetchPrices(currentPage, pageSize);
  }, []);

  const fetchPrices = async (page = 1, recordsPerPage = 50) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: recordsPerPage.toString(),
      });

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
    fetchPrices(1, size);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPrices(page, pageSize);
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
      // fetchPrices(currentPage, pageSize);
    } catch (error) {
      console.error("Failed to update price:", error);
    }
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
      />
    </div>
  );
}
