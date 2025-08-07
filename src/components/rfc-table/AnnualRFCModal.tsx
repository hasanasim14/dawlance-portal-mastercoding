"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectedMaterial } from "./DataTable";

interface RFCEntry {
  Month: string;
  RFC: number;
}

interface AnnualRFCModalProps {
  open: boolean;
  onClose: () => void;
  materialData: SelectedMaterial;
  option: string;
  branch: string | null | undefined;
  dates: {
    month: string;
    year: string;
  };
}

const AnnualRFCModal = ({
  open,
  onClose,
  materialData,
  option,
  branch,
  dates,
}: AnnualRFCModalProps) => {
  const [data, setData] = useState<RFCEntry[]>([]);

  useEffect(() => {
    if (!materialData?.material_id) return;

    const fetchRFCHistory = async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("month", dates?.month);
      queryParams.append("year", dates?.year);
      queryParams.append("material", materialData?.material_id || "");

      if (option === "branches" && branch) {
        queryParams.append("option", "branch");
        queryParams.append("branch", branch);
      } else {
        queryParams.append("option", option);
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/hist-rfc?${queryParams}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await res.json();
        setData(data?.data || []);
      } catch (error) {
        console.error("Error fetching RFC history:", error);
      }
    };

    fetchRFCHistory();
  }, [materialData?.material_id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[75vw]">
        <DialogHeader>
          <DialogTitle>Annual RFC Overview</DialogTitle>
          <div className="text-m space-y-1">
            <p>
              RFC data for material:{" "}
              <strong>{materialData?.material_id}</strong>
            </p>
            <p>
              Material Description:{" "}
              <strong>{materialData?.material_description}</strong>
            </p>
            {branch && (
              <p>
                Branch: <strong>{branch}</strong>
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden h-[calc(95vh-180px)]">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm relative table-auto">
              <thead className="bg-[#161616] sticky top-0 z-20 border-b text-white">
                <tr>
                  <th className="p-3 text-left font-medium border-r sticky left-0 bg-[#161616] z-30 min-w-[1px]">
                    #
                  </th>
                  <th className="p-3 text-left font-medium border-r whitespace-nowrap">
                    Month
                  </th>
                  <th className="p-3 text-left font-medium border-r whitespace-nowrap">
                    RFC
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30">
                      <td className="p-3 border-r font-medium text-muted-foreground bg-background/95 sticky left-0 z-10">
                        {index + 1}
                      </td>
                      <td className="p-3 border-r whitespace-nowrap">
                        {entry.Month}
                      </td>
                      <td className="p-3 border-r whitespace-nowrap">
                        {entry.RFC}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No RFC data found for this material.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnualRFCModal;
