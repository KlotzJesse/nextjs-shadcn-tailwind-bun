import { getPostalCodesDataForGranularity } from "@/lib/utils/postal-codes-data";
import { getStatesData } from "@/lib/utils/states-data";
import nextDynamic from "next/dynamic";

const PostalCodesViewClient = nextDynamic(
  () => import("@/components/postal-codes/postal-codes-view-client")
);

interface ServerPostalCodesViewProps {
  defaultGranularity: string;
}

export const dynamic = "force-static";

export default async function ServerPostalCodesView({
  defaultGranularity,
}: ServerPostalCodesViewProps) {
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(defaultGranularity),
    getStatesData(),
  ]);

  return (
    <PostalCodesViewClient
      initialData={postalCodesData}
      statesData={statesData}
      defaultGranularity={defaultGranularity}
    />
  );
}
