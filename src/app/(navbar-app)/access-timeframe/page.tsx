"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Info, Loader2, Send } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TimeFrameProps {
  Branch: string;
  StartDate: string;
  EndDate: string;
  NumberOfDays: number | null;
  Error?: string;
}

export default function AccessTimeFrame() {
  const [timeFrameData, setTimeFrameData] = useState<TimeFrameProps[]>([]);
  const [originalData, setOriginalData] = useState<TimeFrameProps[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    FetchTimeFrames();
  }, []);

  const FetchTimeFrames = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/bm-timeframes`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();

      const parsedData: TimeFrameProps[] = (data?.data || []).map(
        // eslint-disable-next-line
        (item: any) => {
          const start = new Date(item.StartDate);
          const end = new Date(item.EndDate);
          const days =
            Math.floor(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

          return {
            Branch: item.Branch,
            StartDate: item.StartDate
              ? new Date(item.StartDate).toISOString().substring(0, 10)
              : "",
            EndDate: item.EndDate
              ? new Date(item.EndDate).toISOString().substring(0, 10)
              : "",
            NumberOfDays: isNaN(days) ? null : days,
          };
        }
      );

      // Clone it for original reference
      setTimeFrameData(parsedData);
      setOriginalData(parsedData);
    } catch (error) {
      console.error("Fetch error: ", error);
    }
  };

  const normalize = (data: TimeFrameProps[]) =>
    data.map(({ Branch, StartDate, EndDate, NumberOfDays }) => ({
      Branch,
      StartDate: StartDate || "",
      EndDate: EndDate || "",
      NumberOfDays: NumberOfDays ?? null,
    }));

  const isChanged = useCallback(() => {
    return (
      JSON.stringify(normalize(timeFrameData)) !==
      JSON.stringify(normalize(originalData))
    );
  }, [timeFrameData, originalData]);

  const hasErrors = useCallback(() => {
    return timeFrameData.some((item) => item.Error);
  }, [timeFrameData]);

  const isComplete = timeFrameData.every(
    (item) => item.StartDate && item.EndDate && item.NumberOfDays !== null
  );

  const getMonthEnd = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const handleStartDateChange = (index: number, value: string) => {
    const updated = [...timeFrameData];
    updated[index] = {
      ...updated[index],
      StartDate: value,
    };

    const days = updated[index].NumberOfDays;
    if (days) {
      handleDaysChange(index, days, updated);
    } else {
      setTimeFrameData(updated);
    }
  };

  const handleDaysChange = (
    index: number,
    days: number,
    dataOverride?: TimeFrameProps[]
  ) => {
    const updated = dataOverride ? [...dataOverride] : [...timeFrameData];

    const startDate = updated[index].StartDate;
    if (!startDate || days <= 0) {
      updated[index] = {
        ...updated[index],
        NumberOfDays: null,
        EndDate: "",
        Error: "",
      };
      setTimeFrameData(updated);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);
    const monthEnd = getMonthEnd(startDate);

    if (end > monthEnd) {
      if (
        end.getDate() === monthEnd.getDate() &&
        end.getMonth() === monthEnd.getMonth()
      ) {
        updated[index] = {
          ...updated[index],
          EndDate: end.toISOString().split("T")[0],
          NumberOfDays: days,
          Error: "",
        };
      } else {
        updated[index] = {
          ...updated[index],
          EndDate: end.toISOString().split("T")[0],
          NumberOfDays: days,
          Error: `Number too high — exceeds month-end (last valid day is ${monthEnd.getDate()})`,
        };
      }
    } else {
      updated[index] = {
        ...updated[index],
        EndDate: end.toISOString().split("T")[0],
        NumberOfDays: days,
        Error: "",
      };
    }

    // Cascade logic for next rows
    for (let i = index + 1; i < updated.length; i++) {
      const prevEnd = updated[i - 1].EndDate;
      if (!prevEnd) break;

      const nextStart = new Date(prevEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      const monthEnd = getMonthEnd(prevEnd);

      if (nextStart > monthEnd) {
        updated[i] = {
          ...updated[i],
          StartDate: "",
          EndDate: "",
          Error: "Start date exceeds current month.",
        };
        continue;
      }

      updated[i].StartDate = nextStart.toISOString().split("T")[0];
      const nextDays = updated[i].NumberOfDays ?? 0;
      const newEnd = new Date(nextStart);
      newEnd.setDate(newEnd.getDate() + nextDays - 1);

      if (
        nextDays &&
        newEnd > monthEnd &&
        !(
          newEnd.getDate() === monthEnd.getDate() &&
          newEnd.getMonth() === monthEnd.getMonth()
        )
      ) {
        updated[i] = {
          ...updated[i],
          EndDate: newEnd.toISOString().split("T")[0],
          Error: `Exceeds month-end (max ${monthEnd.getDate()})`,
        };
      } else {
        updated[i] = {
          ...updated[i],
          EndDate: nextDays > 0 ? newEnd.toISOString().split("T")[0] : "",
          Error: "",
        };
      }
    }

    setTimeFrameData(updated);
  };

  const handlePost = async () => {
    const payload = timeFrameData.map(({ Branch, StartDate, EndDate }) => ({
      branch: Branch,
      start_date: StartDate,
      end_date: EndDate,
    }));

    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/bm-timeframes`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        toast.success("Data saved successfully!");
        setOriginalData(normalize(timeFrameData));
      } else {
        toast.error("Failed to save data");
      }
    } catch (err) {
      console.error("Post error", err);
      toast.error("Failed to save data. Please try again later");
    } finally {
      setLoading(false);
    }
  };

  const disabled = !isChanged() || hasErrors() || !isComplete;

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
            className="w-[280px] p-4 shadow-lg rounded-lg bg-popover bg-[#1c1917]"
          >
            <div className="text-sm font-semibold text-gray-400 mb-2 font-mono">
              Date Entry Tips
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-200 font-mono">
              <li>Only the first row’s start date can be edited manually.</li>
              <li>Enter days to calculate end date automatically.</li>
              <li>
                If your days land on the <b>last date of the month</b>,
                it&apos;s valid.
              </li>
              <li>
                Going beyond will still show the result, but with an error.
              </li>
              <li>Start and end dates will auto-cascade for each branch.</li>
            </ul>
          </TooltipContent>
        </Tooltip>
        <Button
          onClick={handlePost}
          disabled={disabled || loading}
          className={cn(
            disabled || loading ? "opacity-50 cursor-not-allowed" : ""
          )}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="mr-2" />
              Post
            </>
          )}
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
                      disabled={idx !== 0}
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
                        value={item.NumberOfDays ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parsed = parseInt(val, 10);
                          handleDaysChange(idx, val === "" ? 0 : parsed);
                        }}
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
