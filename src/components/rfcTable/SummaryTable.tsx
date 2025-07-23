import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SummaryDataProps {
  // eslint-disable-next-line
  summaryData: any[];
}

const SummaryTable = ({ summaryData }: SummaryDataProps) => {
  // Get all unique column headers
  const headers = summaryData.length > 0 ? Object.keys(summaryData[0]) : [];

  return (
    <div className="overflow-x-auto">
      <span className="uppercase font-bold block text-center">
        Summary Table
      </span>
      <Table className="min-w-full text-sm">
        <TableHeader className="bg-muted">
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="text-left whitespace-nowrap">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {summaryData.length > 0 ? (
            summaryData.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-muted/50">
                {headers.map((key) => (
                  <TableCell key={key}>
                    {item[key] !== null && item[key] !== undefined
                      ? item[key]
                      : " "}
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
