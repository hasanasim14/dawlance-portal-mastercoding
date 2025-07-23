"use client";

import { useEffect, useState } from "react";
import { getNextMonthAndYear } from "@/lib/utils";
import ConfigTable from "@/components/config-dawlance-rfc/ConfigTable";

interface RFCRow {
  Product: string | null;
  Year: number;
  Month: number;
  RFC: number;
}

export default function ConfigureDawlanceRFC() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [tableData, setTableData] = useState<RFCRow[]>([]);

  // query parameters
  const query = new URLSearchParams();
  query.append("month", selectedMonth);
  query.append("year", selectedYear);

  // Setting the month and
  useEffect(() => {
    const { month, year } = getNextMonthAndYear("RFC");
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  useEffect(() => {
    const FetchTableData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-product-rfc?${query}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        setTableData(data?.data);
      } catch (error) {
        console.error("Fetch error: ", error);
      }
    };

    FetchTableData();
  }, [selectedMonth, selectedYear]);

  const handleRFCChange = async (index: number, updatedRow: RFCRow) => {
    try {
      const payload = [
        {
          product: updatedRow.Product,
          rfc: updatedRow.RFC,
        },
      ];

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-product-rfc?${query}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to save RFC");
      }
    } catch (error) {
      console.error("Save error: ", error);
    }
  };

  return (
    <ConfigTable
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
      selectedYear={selectedYear}
      setSelectedYear={setSelectedYear}
      tableData={tableData}
      onRFCChange={handleRFCChange}
    />
  );
}
