"use client";

import { useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

interface TimeFrameProps {
  Branch: string;
  StartDate: string | null;
  EndDate: string | null;
}

export default function AccessTimeFrame() {
  const [timeFrameData, setTimeFrameData] = useState<TimeFrameProps[]>([]);
  const debounceTimeouts = useRef<Record<number, NodeJS.Timeout>>({});

  // Fetch data
  useEffect(() => {
    const FetchTimeFrames = async () => {
      const authToken = localStorage.getItem("token");
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/bm-timeframes`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        const data = await res.json();

        // Convert Date objects or strings into yyyy-mm-dd format
        // eslint-disable-next-line
        const parsedData = (data?.data || []).map((item: any) => ({
          ...item,
          StartData: item.StartData
            ? new Date(item.StartData).toISOString().substring(0, 10)
            : "",
          EndData: item.EndData
            ? new Date(item.EndData).toISOString().substring(0, 10)
            : "",
        }));

        setTimeFrameData(parsedData);
      } catch (error) {
        console.error("Fetch error: ", error);
      }
    };

    FetchTimeFrames();
  }, []);

  const handleDateChange = (
    index: number,
    field: "StartDate" | "EndDate",
    value: string
  ) => {
    const updated = [...timeFrameData];
    updated[index][field] = value;
    setTimeFrameData(updated);

    // Clear previous debounce if it exists
    if (debounceTimeouts.current[index]) {
      clearTimeout(debounceTimeouts.current[index]);
    }

    // Debounce API save
    debounceTimeouts.current[index] = setTimeout(() => {
      autosaveDate(updated[index]);
    }, 1000); // 1 second debounce
  };

  const autosaveDate = async (row: TimeFrameProps) => {
    try {
      const payload = {
        branch: row.Branch,
        start_date: row.StartDate,
        end_date: row.EndDate,
      };

      const authToken = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/update-bm-timeframes`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to save date");
      }
    } catch (error) {
      console.error("Autosave error: ", error);
    }
  };

  return (
    <div className="w-full flex flex-col overflow-hidden p-4 space-y-4 h-[85vh]">
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-muted sticky top-0">
            <TableRow>
              <TableHead className="w-1/3 font-medium text-left">
                Branch
              </TableHead>
              <TableHead className="w-1/6 text-center">Start Date</TableHead>
              <TableHead className="w-1/6 text-center">End Date</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {timeFrameData?.length > 0 ? (
              timeFrameData.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50">
                  <TableCell>{item.Branch ?? " "}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="date"
                      className="py-0 text-center"
                      value={item.StartDate || ""}
                      onChange={(e) =>
                        handleDateChange(idx, "StartDate", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="date"
                      className="py-0"
                      value={item.EndDate || ""}
                      onChange={(e) =>
                        handleDateChange(idx, "EndDate", e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
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
}
