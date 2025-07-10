import { toast } from "sonner";

/**
 * Exports an array of postal codes as an XLSX file. Uses dynamic import for xlsx.
 * @param codes Array of postal codes (strings)
 */
export async function exportPostalCodesXLSX(codes: string[]) {
  try {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Postleitzahl"],
      ...codes.map((code: string) => [code]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Postleitzahlen");
    XLSX.writeFile(wb, "postleitzahlen.xlsx");
    toast.success("Postleitzahlen als XLSX exportiert!");
  } catch {
    toast.error("XLSX-Export fehlgeschlagen");
  }
}

/**
 * Copies an array of postal codes as a CSV string to the clipboard.
 * @param codes Array of postal codes (strings)
 */
export async function copyPostalCodesCSV(codes: string[]) {
  try {
    const csv = codes.join(",");
    await navigator.clipboard.writeText(csv);
    toast.success("Postleitzahlen in Zwischenablage kopiert!");
  } catch {
    toast.error("Kopieren in Zwischenablage fehlgeschlagen");
  }
}
