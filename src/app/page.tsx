import { redirect } from "next/navigation";
import { mockUser } from "@/lib/mockUser";
import { rolePages } from "@/lib/rolePages";

type Role = "admin" | "marketing" | "manager";

export default function HomePage() {
  const role = mockUser.role as Role;

  const firstPage = rolePages[role]?.[0];

  if (firstPage) {
    redirect(firstPage);
  }

  redirect("/unauthorized");
}
