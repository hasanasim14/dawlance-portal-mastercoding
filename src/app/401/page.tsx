"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rolePages } from "@/lib/rolePages";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const UnauthorizedPage = () => {
  const router = useRouter();
  const [firstAccessiblePage, setFirstAccessiblePage] = useState<string | null>(
    null
  );

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role && role in rolePages) {
      const firstPage = rolePages[role as keyof typeof rolePages]?.[0];
      if (firstPage) {
        setFirstAccessiblePage(firstPage);
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="max-w-md w-full text-center bg-white shadow-md rounded-lg p-8">
        <h1 className="text-4xl font-bold text-red-600 mb-4">401</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Unauthorized Access
        </h2>
        <p className="text-gray-600 mb-6">
          You do not have permission to view this page.
        </p>
        <Button
          onClick={() => {
            if (firstAccessiblePage) {
              router.push(firstAccessiblePage);
            } else {
              router.push("/");
            }
          }}
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
