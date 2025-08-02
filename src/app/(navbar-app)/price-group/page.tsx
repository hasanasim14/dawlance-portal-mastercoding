"use client";

import { useEffect, useState } from "react";
import { PaginationData } from "@/lib/types";
import PriceGroupDataTable from "@/components/price-group/PriceGroupDataTable";

export interface PriceGroupDataProps {
  "Price Group": string;
  "Min Price": number;
  "Max Price": number;
}

export default function PriceGroup() {
  const [priceGroupData, setPriceGroupData] = useState<PriceGroupDataProps[]>(
    []
  );
  const [pagination, setPagination] = useState<PaginationData>({
    total_records: 0,
    records_per_page: 50,
    page: 1,
    total_pages: 0,
  });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPriceGroup(currentPage, pageSize);
  }, []);

  const fetchPriceGroup = async (page = 1, recordsPerPage = 50) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: recordsPerPage.toString(),
      });

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/pricegroups?${queryParams.toString()}`
      );

      const data = await res.json();
      setPriceGroupData(data?.data || []);
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
    fetchPriceGroup(1, size);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPriceGroup(page, pageSize);
  };

  const handleUpdate = async ({
    priceGroup,
    field,
    value,
  }: {
    priceGroup: string;
    field: "Min Price" | "Max Price";
    value: string;
  }) => {
    try {
      const payload = {
        priceGroup,
        [field === "Min Price" ? "min_price" : "max_price"]: parseFloat(value),
      };

      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pricegroups/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Refresh after save
      fetchPriceGroup(currentPage, pageSize);
    } catch (error) {
      console.error("Failed to update price group:", error);
    }
  };

  return (
    <div className="p-4">
      <PriceGroupDataTable
        data={priceGroupData}
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
