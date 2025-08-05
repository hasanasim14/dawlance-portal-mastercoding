import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to get the current month and year
export const getNextMonthAndYear = (type: string) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let nextMonth;
  if (type === "RFC" || type === "offering") {
    nextMonth = currentMonth + 4;
  } else if (type === "uploads") {
    nextMonth = currentMonth - 1;
  } else {
    nextMonth = currentMonth + 1;
  }

  let nextYear = currentYear;

  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear = currentYear + 1;
  }

  const monthString = String(nextMonth + 1).padStart(2, "0");
  const yearString = String(nextYear);

  return { month: monthString, year: yearString };
};

// months for select dropdown
export const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
export const years = Array.from({ length: 10 }, (_, i) => ({
  value: (currentYear - 5 + i).toString(),
  label: (currentYear - 5 + i).toString(),
}));

// get full month names
export const getFullMonthName = (monthNumber: string) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const index = parseInt(monthNumber, 10) - 1;
  return monthNames[index] || monthNumber;
};
