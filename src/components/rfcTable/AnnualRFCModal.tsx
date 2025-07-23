"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RFCEntry {
  Month: string;
  RFC: number;
}

interface AnnualRFCModalProps {
  open: boolean;
  onClose: () => void;
  materialId: string | null;
  option: string;
  branch: string | null | undefined;
}

const AnnualRFCModal = ({
  open,
  onClose,
  materialId,
  option,
  branch,
}: AnnualRFCModalProps) => {
  const [data, setData] = useState<RFCEntry[]>([]);

  useEffect(() => {
    if (!materialId) return;

    const fetchRFCHistory = async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("option", option);
      queryParams.append("material", materialId);
      console.log("branch", branch);

      if (option === "branch" && branch) {
        queryParams.append("branch", branch);
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/hist-rfc?${queryParams}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        console.log("tje", data?.data);
        setData(data?.data || []);
      } catch (error) {
        console.error("Error fetching RFC history:", error);
      }
    };

    fetchRFCHistory();
  }, [materialId]);

  console.log("the data,", data);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[75vw]">
        <DialogHeader>
          <DialogTitle>Annual RFC Overview</DialogTitle>
          <div className="text-m">
            RFC data for material: <strong>{materialId}</strong>
            {branch && (
              <p>
                Branch: <span className="font-bold">{branch}</span>
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
