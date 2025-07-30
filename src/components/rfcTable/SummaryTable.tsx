import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SummaryDataProps {
  summaryData: any[];
  month: string;
  year: string;
  option: string;
}

const getFullMonthName = (monthNumber: string) => {
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

const SummaryTable = ({
  option,
  summaryData,
  month,
  year,
}: SummaryDataProps) => {
  const headers = summaryData.length > 0 ? Object.keys(summaryData[0]) : [];
  const stringMonth = getFullMonthName(month);

  const handleAutoSave = async (product: string, rfc: number) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("month", month);
      queryParams.append("year", year);
      const payload = [{ product, rfc }];

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dawlance-product-rfc?${queryParams}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Failed to auto-save");
      console.log(`Auto-saved for ${product}: ${rfc}`);
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <span className="uppercase font-bold block text-center mb-2">
        {`Summary Table - ${stringMonth} ${year}`}
      </span>

      <Table className="min-w-full text-sm">
        <TableHeader className="bg-muted">
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="text-left whitespace-nowrap">
                {header.trim()}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {summaryData.length > 0 ? (
            summaryData.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-muted/50">
                {headers.map((key, colIndex) => (
                  <TableCell key={key}>
                    {option === "dawlance" &&
                    colIndex === headers.length - 1 ? (
                      <input
                        type="number"
                        className="w-full border rounded px-2 py-1 text-sm"
                        defaultValue={item[key]}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            handleAutoSave(item["Product"], value); // adjust key if needed
                          }
                        }}
                      />
                    ) : item[key] !== null && item[key] !== undefined ? (
                      item[key]
                    ) : (
                      " "
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="text-center py-6 text-muted-foreground"
              >
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SummaryTable;
