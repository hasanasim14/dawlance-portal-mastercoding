import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const UnauthorizedPage = () => {
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
        <Link href="/">
          <Button>
            <ChevronLeft className="h-5 w-5" />
            Go Back Home
          </Button>
          {/* <span>GO Back Home</span> */}
          {/* <a className="text-blue-600 hover:underline">Go back to Home</a> */}
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
