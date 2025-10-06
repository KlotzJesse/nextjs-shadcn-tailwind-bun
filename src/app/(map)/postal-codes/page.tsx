import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { areas } from "@/lib/schema/schema";
import { eq } from "drizzle-orm";

export const experimental_ppr = true;

// Default postal codes page - redirects to appropriate granularity while preserving query params
export default async function PostalCodesDefaultPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Check if an area is selected and get its granularity
  let granularity = "1digit";

  if (params.areaId) {
    const areaIdValue = Array.isArray(params.areaId)
      ? params.areaId[0]
      : params.areaId;
    const areaId = parseInt(areaIdValue, 10);

    if (!isNaN(areaId)) {
      try {
        const area = await db.query.areas.findFirst({
          where: eq(areas.id, areaId),
        });

        if (area && area.granularity) {
          granularity = area.granularity;
        }
      } catch (error) {
        console.error("Failed to fetch area granularity:", error);
      }
    }
  }

  // Preserve query parameters when redirecting to appropriate granularity
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = Array.isArray(value) ? value[0] : value;
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const redirectUrl = queryString
    ? `/postal-codes/${granularity}?${queryString}`
    : `/postal-codes/${granularity}`;

  redirect(redirectUrl);
}
