import { getPostalCodesDataForGranularity } from "@/lib/utils/postal-codes-data";
import { getStatesData } from "@/lib/utils/states-data";
import { PostalCodesMap } from "./postal-codes-map";

interface ServerPostalCodesMapProps {
  granularity: string;
  onSearch?: (plz: string) => void;
  onGranularityChange?: (granularity: string) => void;
}

export const dynamic = "force-static";

export default async function ServerPostalCodesMap({
  granularity,
  onSearch,
  onGranularityChange,
}: ServerPostalCodesMapProps) {
  // Fetch postal codes and states data server-side
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(granularity),
    getStatesData(),
  ]);

  return (
    <PostalCodesMap
      data={postalCodesData}
      granularity={granularity}
      onSearch={onSearch}
      onGranularityChange={onGranularityChange}
      statesData={statesData}
    />
  );
}
