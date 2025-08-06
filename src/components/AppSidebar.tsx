"use client";

import React, { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Atom,
  Repeat,
  TrendingUp,
  Upload,
  LayoutDashboard,
  LogOut,
  Workflow,
  Users,
  Gift,
  Store,
  Presentation,
  Clock8,
  DollarSign,
  Tag,
} from "lucide-react";
import { rolePages } from "@/lib/rolePages";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Role = keyof typeof rolePages;

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getUserRoleFromCookie = () => {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(/(?:^|;\s*)user_role=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : null;
    };

    const roleFromCookie = getUserRoleFromCookie();
    setRole(roleFromCookie);
  }, []);

  if (!role) return null;

  const allowedPages: string[] =
    role in rolePages ? rolePages[role as Role] : [];

  const allItems = [
    {
      title: "Main Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Dashboard",
      url: "/dashboard-branch",
      icon: LayoutDashboard,
    },
    {
      title: "Dashboard",
      url: "/dashboard-marketing",
      icon: LayoutDashboard,
    },
    {
      title: "Master Coding",
      url: "/master-coding",
      icon: Atom,
    },
    {
      title: "Phase In/Out",
      url: "/phase-in-out",
      icon: Repeat,
    },
    {
      title: "Access Timeframe",
      url: "/access-timeframe",
      icon: Clock8,
    },
    {
      title: "SKU Offerings",
      url: "/sku-offerings",
      icon: Gift,
    },
    {
      title: "Branch RFC",
      url: "/branch-rfc",
      icon: Store,
    },
    {
      title: "Marketing RFC",
      url: "/marketing-rfc",
      icon: Presentation,
    },

    {
      title: "Dawlance RFC",
      url: "/dawlance-rfc",
      icon: () => (
        <Image
          width={8}
          height={8}
          src="/dawlance.svg"
          alt="Dawlance"
          className="w-5 h-5 object-contain"
        />
      ),
    },
    {
      title: "Prices",
      url: "/prices",
      icon: DollarSign,
    },
    {
      title: "Price Group",
      url: "/price-group",
      icon: Tag,
    },
    {
      title: "Upload Files",
      url: "/upload-center",
      icon: Upload,
    },
    {
      title: "Branch Master",
      url: "/branch-master",
      icon: Workflow,
    },
    {
      title: "Results",
      url: "/results",
      icon: TrendingUp,
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
    },
  ];

  const filteredItems = allItems.filter((item) =>
    allowedPages.includes(item.url)
  );

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logout Successful");
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-2">
        <SidebarTrigger className="h-8 w-8" />
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full">
        {/* Scrollable content wrapper */}
        <div className={cn("flex-1 p-2 overflow-y-auto")}>
          <SidebarMenu>
            {filteredItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={cn(
                    "transition-colors",
                    pathname === item.url && "bg-gray-200 text-primary"
                  )}
                >
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* Sticky logout section */}
        <div className="border-t border-border p-2 shrink-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Logout"
                onClick={handleLogout}
                className="cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
