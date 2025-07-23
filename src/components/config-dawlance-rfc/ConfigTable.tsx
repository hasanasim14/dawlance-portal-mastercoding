"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DateFilter from "../DateFilter";
import { Input } from "../ui/input";
import { useEffect, useRef, useState } from "react";

interface RFCRow {
  Product: string | null;
  Year: number;
  Month: number;
  RFC: number;
}

type EditableRFCRow = Omit<RFCRow, "RFC"> & { RFC: number | string };

interface ConfigTableProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  tableData: RFCRow[];
  onRFCChange: (index: number, updatedRow: RFCRow) => void;
}

const ConfigTable = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  tableData,
  onRFCChange,
}: ConfigTableProps) => {
  const [editableData, setEditableData] = useState<EditableRFCRow[]>([]);
  const debounceTimeouts = useRef<{ [key: number]: NodeJS.Timeout }>({});

  useEffect(() => {
    setEditableData(tableData);
  }, [tableData]);

  const handleRFCChange = (index: number, value: string) => {
    const updated = [...editableData];
    updated[index].RFC = value;
    setEditableData(updated);

    if (debounceTimeouts.current[index]) {
      clearTimeout(debounceTimeouts.current[index]);
    }

    debounceTimeouts.current[index] = setTimeout(() => {
      const rfcNumber = Number(value);
      if (!isNaN(rfcNumber) && value !== "") {
        onRFCChange(index, {
          ...updated[index],
          RFC: rfcNumber,
        });
      }
    }, 800);
  };

  return (
    <div className="w-full flex flex-col overflow-hidden p-4 space-y-4 h-[85vh]">
      <div className="flex justify-end gap-3">
        <DateFilter
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-muted sticky top-0">
            <TableRow>
              <TableHead className="w-1/3 font-medium text-left">
                Product
              </TableHead>
              <TableHead className="w-1/6 text-left">Month</TableHead>
              <TableHead className="w-1/6 text-left">Year</TableHead>
              <TableHead className="w-1/6 text-left">RFC</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {editableData?.length > 0 ? (
              editableData?.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50">
                  <TableCell>{item.Product ?? " "}</TableCell>
                  <TableCell>{item.Month}</TableCell>
                  <TableCell>{item.Year}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="py-0"
                      value={item.RFC === "" ? "" : item.RFC}
                      onChange={(e) => handleRFCChange(idx, e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                >
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ConfigTable;
