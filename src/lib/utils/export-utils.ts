import { toast } from "sonner";

/**
 * Exports an array of postal codes as an XLSX file. Uses dynamic import for xlsx.
 * @param codes Array of postal codes (strings)
 */
export async function exportPostalCodesXLSX(codes: string[]) {
  const exportPromise = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Postleitzahl"],
      ...codes.map((code: string) => [code]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Postleitzahlen");
    XLSX.writeFile(wb, "postleitzahlen.xlsx");
    return `${codes.length} Postleitzahlen als XLSX exportiert`;
  };

  return toast.promise(exportPromise(), {
    loading: `📊 Exportiere ${codes.length} Postleitzahlen...`,
    success: (message: string) => message,
    error: "XLSX-Export fehlgeschlagen",
  });
}

/**
 * Copies an array of postal codes as a CSV string to the clipboard.
 * @param codes Array of postal codes (strings)
 */
export async function copyPostalCodesCSV(codes: string[]) {
  const copyPromise = async () => {
    const csv = codes.join(",");
    await navigator.clipboard.writeText(csv);
    return `${codes.length} Postleitzahlen in Zwischenablage kopiert`;
  };

  return toast.promise(copyPromise(), {
    loading: `📋 Kopiere ${codes.length} Postleitzahlen...`,
    success: (message: string) => message,
    error: "Kopieren in Zwischenablage fehlgeschlagen",
  });
}
