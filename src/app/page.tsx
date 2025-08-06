"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { rolePages } from "@/lib/rolePages";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("user_role");

    if (role && role in rolePages) {
      const firstPage = rolePages[role as keyof typeof rolePages]?.[0];
      if (firstPage) {
        router.replace(firstPage);
        return;
      }
    }

    router.replace("/unauthorized");
  }, [router]);

  return null; 
}
