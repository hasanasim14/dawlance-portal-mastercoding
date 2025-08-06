"use client";

import { redirect } from "next/navigation";
import { rolePages } from "@/lib/rolePages";

export default function HomePage() {
  const role = localStorage.getItem("user_role");

  if (role && role in rolePages) {
    const firstPage = rolePages[role as keyof typeof rolePages]?.[0];
    if (firstPage) {
      redirect(firstPage);
    }
  }

  redirect("/unauthorized");
}
