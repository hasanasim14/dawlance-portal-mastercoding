"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
  Settings,
  Clock8,
  DollarSign,
} from "lucide-react";
import { mockUser } from "@/lib/mockUser";
import { rolePages } from "@/lib/rolePages";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

type Role = keyof typeof rolePages;

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const role = mockUser.role;

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
      title: "SKU Offerings",
      url: "/sku-offerings",
      icon: Gift,
    },
    {
      title: "Results",
      url: "/results",
      icon: TrendingUp,
    },
    {
      title: "Prices",
      url: "/prices",
      icon: DollarSign,
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
      title: "Configure Dawlance RFC",
      url: "/configure-dawlance-rfc",
      icon: Settings,
    },
    {
      title: "Access Timeframe",
      url: "/access-timeframe",
      icon: Clock8,
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

      <SidebarContent className={cn("p-2 flex flex-col h-full")}>
        <SidebarMenu>
          {filteredItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="mt-auto">
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

      <SidebarRail />
    </Sidebar>
  );
}
