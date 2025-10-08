"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMapState } from "@/lib/url-state/map-state";
import { IconEye, IconHistory } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getVersionIndicatorInfoAction } from "@/app/actions/version-actions";

interface VersionIndicatorProps {
  areaId?: number | null;
}

interface VersionInfo {
  versionNumber: number;
  name?: string;
  isLatest?: boolean;
}

export function VersionIndicator({ areaId }: VersionIndicatorProps) {
  const { versionId, setVersion } = useMapState();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [hasVersions, setHasVersions] = useState(false);

  useEffect(() => {
    if (areaId) {
      getVersionIndicatorInfoAction(areaId, versionId)
        .then((result) => {
          if (result.success && result.data) {
            setHasVersions(result.data.hasVersions);
            setVersionInfo(result.data.versionInfo);
          } else {
            setHasVersions(false);
            setVersionInfo(null);
          }
        })
        .catch(console.error);
    } else {
      setVersionInfo(null);
      setHasVersions(false);
    }
  }, [versionId, areaId]);

  // Don't show anything if no area is selected or no versions exist
  if (!areaId || !hasVersions || !versionInfo) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={versionInfo.isLatest ? "default" : "secondary"}
        className="flex items-center gap-1"
      >
        <IconHistory className="h-3 w-3" />
        {versionInfo.isLatest ? "Aktuelle " : ""}Version{" "}
        {versionInfo.versionNumber}
        {versionInfo.name && ` (${versionInfo.name})`}
      </Badge>
      {!versionInfo.isLatest && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVersion(null)}
          className="h-6 text-xs"
        >
          <IconEye className="h-3 w-3 mr-1" />
          Aktuelle Version
        </Button>
      )}
      {!versionInfo.isLatest && (
        <span className="text-xs text-muted-foreground">
          Änderungen → neue Version
        </span>
      )}
    </div>
  );
}