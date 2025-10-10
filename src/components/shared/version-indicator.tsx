import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconEye, IconHistory } from "@tabler/icons-react";
import { getVersionIndicatorInfo, getAreaById } from "@/lib/db/data-functions";

interface VersionIndicatorProps {
  areaId?: number | null;
}

export async function VersionIndicator({ areaId }: VersionIndicatorProps) {
  if (!areaId) {
    return null;
  }
  const area = await getAreaById(areaId!);
  const versionInfo = await getVersionIndicatorInfo(
    areaId!,
    area.currentVersionNumber
  );

  console.log("VERSION INFO:", versionInfo, areaId);

  // Don't show anything if no area is selected or no versions exist
  if (!areaId || !versionInfo.hasVersions || !versionInfo.versionInfo) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={versionInfo.versionInfo.isLatest ? "default" : "secondary"}
        className="flex items-center gap-1"
      >
        <IconHistory className="h-3 w-3" />
        {versionInfo.versionInfo.isLatest ? "Aktuelle " : ""}Version{" "}
        {versionInfo.versionInfo.versionNumber}
        {versionInfo.versionInfo.name && ` (${versionInfo.versionInfo.name})`}
      </Badge>
      {!versionInfo.versionInfo.isLatest && (
        <Button variant="outline" size="sm" className="h-6 text-xs">
          <IconEye className="h-3 w-3 mr-1" />
          Aktuelle Version
        </Button>
      )}
      {!versionInfo.versionInfo.isLatest && (
        <span className="text-xs text-muted-foreground">
          Änderungen → neue Version
        </span>
      )}
    </div>
  );
}
