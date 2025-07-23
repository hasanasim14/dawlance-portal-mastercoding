"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// Optional: clean and format the path
function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Home";

  const parts = pathname.split("/").filter(Boolean);

  return parts
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ")
    )
    .join(" / ");
}

export const Navbar = () => {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex justify-between items-center p-4 sticky top-0 z-10 bg-background border-b">
      {/* Top left image */}
      <div className="relative h-10 w-32">
        <Image
          src="/logo.png"
          alt="Dawlance logo"
          fill
          className="object-contain object-left"
          priority
        />
      </div>

      {/* Page title in center */}
      <div className="text-lg font-bold text-center uppercase tracking-widest">
        {pageTitle}
      </div>

      {/* Top right image */}
      <div className="relative h-10 w-32">
        <Image
          src="aiSystemslogo.svg"
          alt="Right header logo"
          fill
          className="object-contain object-right"
          priority
        />
      </div>
    </div>
  );
};
