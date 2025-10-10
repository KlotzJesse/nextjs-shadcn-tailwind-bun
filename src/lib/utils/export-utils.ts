import { toast } from "sonner";

interface LayerExportData {
  layerName: string;
  postalCodes: string[];
}

/**
 * Exports postal codes per layer as PDF with CSV list format.
 * Creates sections for each layer in the format:
 * Layer Name1:
 * D-Postalcode1, D-Postalcode2
 *
 * Layer Name 2:
 * ...
 * @param layers Array of layer data with postal codes
 */
export function exportLayersPDF(layers: LayerExportData[]) {
  const exportPromise = async () => {
    // Use pdfmake for PDF generation without manual positioning
    const pdfMake = await import("pdfmake/build/pdfmake");
    const pdfFonts = await import("pdfmake/build/vfs_fonts");

    // Register fonts
    pdfMake.default.vfs = pdfFonts.vfs;

    // Create document content
    const content: unknown[] = [];

    // Add title
    content.push({
      text: "Gebiete Export",
      style: "header",
      margin: [0, 0, 0, 20],
    });

    // Add each layer
    layers.forEach(({ layerName, postalCodes }) => {
      // Layer title
      content.push({
        text: `${layerName}:`,
        style: "subheader",
        margin: [0, 0, 0, 10],
      });

      // Layer postal codes
      const formattedCodes = postalCodes.map((code) => `D-${code}`).join(", ");
      content.push({
        text: formattedCodes,
        style: "content",
        margin: [0, 0, 0, 20],
      });
    });

    // Define styles
    const styles = {
      header: {
        fontSize: 16,
        bold: true,
      },
      subheader: {
        fontSize: 14,
        bold: true,
      },
      content: {
        fontSize: 10,
      },
    };

    // Create document definition
    const docDefinition = {
      content: content as unknown,
      styles,
      pageSize: "A4" as unknown,
      pageMargins: [20, 20, 20, 20] as [number, number, number, number],
    };

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, "-");
    const filename = `gebiete-export-${timestamp}.pdf`;

    // Generate and download PDF
    const pdfDocGenerator = pdfMake.default.createPdf(docDefinition);
    pdfDocGenerator.download(filename);

    const totalCodes = layers.reduce(
      (sum, layer) => sum + layer.postalCodes.length,
      0
    );
    return `${totalCodes} Postleitzahlen in ${layers.length} Ebenen als PDF exportiert`;
  };

  return toast.promise(exportPromise(), {
    loading: `📄 Exportiere Ebenen als PDF...`,
    success: (message: string) => message,
    error: "PDF-Export fehlgeschlagen",
  });
}

/**
 * Exports postal codes per layer as separate sheets in XLSX file.
 * Creates one sheet per layer with 3 columns: PLZ without D-, PLZ with D-, PLZ with D-POSTALCODE
 * @param layers Array of layer data with postal codes
 */
export async function exportLayersXLSX(layers: LayerExportData[]) {
  const exportPromise = async () => {
    const XLSX = await import("xlsx");

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create a sheet for each layer
    layers.forEach(({ layerName, postalCodes }) => {
      // Transform postal codes into the 3 required formats
      const sheetData = postalCodes.map((plz) => {
        const plzWithoutD = plz.startsWith("D-") ? plz.substring(2) : plz;
        const plzWithD = plzWithoutD.startsWith("D-")
          ? plzWithoutD
          : `D-${plzWithoutD}`;
        const plzWithDAndComma = `${plzWithD},`;

        return [plzWithoutD, plzWithD, plzWithDAndComma];
      });

      // Add header row
      const wsData = [
        ["PLZ ohne D-", "PLZ mit D-", "PLZ mit D- und Komma"],
        ...sheetData,
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, layerName);
    });

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, "-");
    const filename = `gebiete-export-${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);

    const totalCodes = layers.reduce(
      (sum, layer) => sum + layer.postalCodes.length,
      0
    );
    return `${totalCodes} Postleitzahlen in ${layers.length} Ebenen als XLSX exportiert`;
  };

  return toast.promise(exportPromise(), {
    loading: `📊 Exportiere Ebenen...`,
    success: (message: string) => message,
    error: "XLSX-Export fehlgeschlagen",
  });
}

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
