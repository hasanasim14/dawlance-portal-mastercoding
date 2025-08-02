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
import { Button } from "@/components/ui/button";
import { Info, Send } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimeFrameProps {
  Branch: string;
  StartDate: string;
  EndDate: string;
  NumberOfDays?: number;
  Error?: string;
}

export default function AccessTimeFrame() {
  const [timeFrameData, setTimeFrameData] = useState<TimeFrameProps[]>([]);

  useEffect(() => {
    FetchTimeFrames();
  }, []);

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
      const parsedData = (data?.data || []).map((item: any) => ({
        Branch: item.Branch,
        StartDate: item.StartDate
          ? new Date(item.StartDate).toISOString().substring(0, 10)
          : "",
        EndDate: item.EndDate
          ? new Date(item.EndDate).toISOString().substring(0, 10)
          : "",
        NumberOfDays: item.NumberOfDays || 0,
        Error: "",
      }));

      setTimeFrameData(parsedData);
    } catch (error) {
      console.error("Fetch error: ", error);
    }
  };

  const getMonthEnd = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const handleDaysChange = (
    index: number,
    days: number,
    dataOverride?: TimeFrameProps[]
  ) => {
    const updated = dataOverride ? [...dataOverride] : [...timeFrameData];

    if (!days || days <= 0 || isNaN(days)) {
      updated[index].NumberOfDays = undefined;
      updated[index].EndDate = "";
      updated[index].Error = "";
      setTimeFrameData(updated);
      return;
    }

    const startDate = updated[index].StartDate;
    if (!startDate) return;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);
    const monthEnd = getMonthEnd(startDate);

    if (end > monthEnd) {
      updated[index].Error = "End date exceeds current month.";
      updated[index].EndDate = "";
    } else {
      updated[index].EndDate = end.toISOString().split("T")[0];
      updated[index].NumberOfDays = days;
      updated[index].Error = "";
    }

    // Cascade logic for next rows
    for (let i = index + 1; i < updated.length; i++) {
      const prevEnd = updated[i - 1].EndDate;
      if (!prevEnd) break;

      const nextStart = new Date(prevEnd);
      nextStart.setDate(nextStart.getDate() + 1);

      const monthEnd = getMonthEnd(prevEnd);
      if (nextStart > monthEnd) {
        updated[i].StartDate = "";
        updated[i].EndDate = "";
        updated[i].Error = "Start date exceeds current month.";
        continue;
      }

      updated[i].StartDate = nextStart.toISOString().split("T")[0];
      const newEnd = new Date(nextStart);
      const nextDays = updated[i].NumberOfDays || 0;
      newEnd.setDate(newEnd.getDate() + nextDays - 1);

      if (nextDays && newEnd > monthEnd) {
        updated[i].EndDate = "";
        updated[i].Error = "End date exceeds current month.";
      } else {
        updated[i].EndDate = nextDays ? newEnd.toISOString().split("T")[0] : "";
        updated[i].Error = "";
      }
    }

    setTimeFrameData(updated);
  };

  const handlePost = () => {
    const payload = timeFrameData.map(({ Branch, StartDate, EndDate }) => ({
      Branch,
      StartDate,
      EndDate,
    }));

    console.log("Posting values:", payload);
    // Call your API here with payload
  };

  const handleStartDateChange = (index: number, value: string) => {
    const updated = [...timeFrameData];
    updated[index].StartDate = value;

    // Recalculate days for this row if days already exist
    const days = updated[index].NumberOfDays;
    if (days) {
      handleDaysChange(index, days, updated);
    } else {
      setTimeFrameData(updated);
    }
  };

  return (
    <div className="w-full flex flex-col overflow-hidden p-4 space-y-4 h-[85vh]">
      <div className="flex gap-2 items-center justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon">
              <Info className="h-4 w-4 text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="w-70 p-4 shadow-lg rounded-lg"
          >
            <div className="text-sm font-semibold text-gray-400 mb-2 font-mono">
              Date Entry Tips
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-200 font-mono">
              <li>
                Enter the <span className="font-medium">Start Date</span> for
                each branch manually.
              </li>
              <li>
                Specify <span className="font-medium">Number of Days</span> to
                auto-calculate the End Date.
              </li>

              <li>
                End Date must stay within the{" "}
                <span className="font-medium">same month</span>.
              </li>
              <li>
                The <span className="font-medium">next Start Date</span>{" "}
                auto-adjusts to one day after the previous End Date.
              </li>
              <li>
                Errors will appear if the calculated dates overflow into the
                next month.
              </li>
            </ul>
          </TooltipContent>
        </Tooltip>
        <Button onClick={handlePost}>
          <Send className="mr-2" />
          Post
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-muted sticky top-0">
            <TableRow>
              <TableHead className="w-1/3 font-medium text-left">
                Branch
              </TableHead>
              <TableHead className="w-1/6 text-left">Start Date</TableHead>
              <TableHead className="w-1/6 text-left">End Date</TableHead>
              <TableHead className="w-1/6 text-left">Number of Days</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {timeFrameData?.length > 0 ? (
              timeFrameData.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50">
                  <TableCell>{item.Branch}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="date"
                      className="py-0 text-center"
                      value={item.StartDate || ""}
                      onChange={(e) =>
                        handleStartDateChange(idx, e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="date"
                      className="py-0 text-center"
                      value={item.EndDate || ""}
                      disabled
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Input
                        type="number"
                        className="py-0"
                        value={item.NumberOfDays || ""}
                        onChange={(e) =>
                          handleDaysChange(idx, parseInt(e.target.value, 10))
                        }
                      />
                      {item.Error && (
                        <span className="text-xs text-red-500 mt-1">
                          {item.Error}
                        </span>
                      )}
                    </div>
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
}
