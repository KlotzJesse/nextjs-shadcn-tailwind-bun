import type { Metadata } from "next";
import { PostalCodesOverview } from "@/components/postal-codes/postal-codes-overview";

export const experimental_ppr = true;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "KRAUSS Territory Management - Postal Codes",
    description: "Interactive territory management for German postal code regions",
    openGraph: {
      title: "KRAUSS Territory Management - Postal Codes",
      description: "Interactive territory management for German postal code regions",
      type: "website",
    },
  };
}

export default async function PostalCodesPage() {
  return <PostalCodesOverview />;
}
