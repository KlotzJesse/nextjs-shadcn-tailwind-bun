import { PostalCodesOverview } from "@/components/postal-codes/postal-codes-overview";

export const experimental_ppr = true;

export default async function HomePage() {
  return <PostalCodesOverview />;
}
