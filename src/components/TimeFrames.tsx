"use client";

import { useEffect, useState } from "react";

interface TimeFramesProps {
  option: string;
}

const formatDate = (dateStr: string, time: "start" | "end") => {
  if (!dateStr) return "N/A";

  const date = new Date(dateStr);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);

  const timeLabel = time === "start" ? "12:01 AM" : "11:59 PM";
  return `${formattedDate} at ${timeLabel}`;
};

const TimeFrames = ({ option }: TimeFramesProps) => {
  const [dates, setDates] = useState({
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTimeFrames = async () => {
      const queryParams = new URLSearchParams({ branch: option });

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/bm-timeframes?${queryParams}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        const data = await res.json();
        const firstEntry = data?.data?.[0];

        if (!firstEntry) throw new Error("No data found");

        setDates({
          startDate: firstEntry.StartDate,
          endDate: firstEntry.EndDate,
        });
      } catch (error) {
        console.error("Error fetching time frame data:", error);
        setError("Could not load time frames");
      } finally {
        setLoading(false);
      }
    };

    fetchTimeFrames();
  }, [option]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 italic">Loading timeframes...</p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 italic">{error}</p>;
  }

  return (
    <div className="flex justify-center items-center gap-x-6 w-full">
      <p className="text-sm text-gray-700">
        <span className="font-semibold">Start Date:</span>{" "}
        {formatDate(dates.startDate, "start")}
      </p>
      <p className="text-sm text-gray-700">
        <span className="font-semibold">End Date:</span>{" "}
        {formatDate(dates.endDate, "end")}
      </p>
    </div>
  );
};

export default TimeFrames;
