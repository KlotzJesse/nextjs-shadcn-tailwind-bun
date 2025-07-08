import { toast } from 'sonner'

/**
 * Exports an array of postal codes as an XLSX file. Uses dynamic import for xlsx.
 * @param codes Array of postal codes (strings)
 */
export async function exportPostalCodesXLSX(codes: string[]) {
  try {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['Postal Code'], ...codes.map((code: string) => [code])])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'PostalCodes')
    XLSX.writeFile(wb, 'postal-codes.xlsx')
    toast.success('Postal codes exported as XLSX!')
  } catch {
    toast.error('Failed to export XLSX')
  }
}

/**
 * Copies an array of postal codes as a CSV string to the clipboard.
 * @param codes Array of postal codes (strings)
 */
export async function copyPostalCodesCSV(codes: string[]) {
  try {
    const csv = codes.join(',')
    await navigator.clipboard.writeText(csv)
    toast.success('Postal codes copied to clipboard!')
  } catch {
    toast.error('Failed to copy to clipboard')
  }
} 