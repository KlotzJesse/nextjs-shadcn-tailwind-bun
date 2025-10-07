"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMapState } from "@/lib/url-state/map-state";
import { IconEye, IconHistory } from "@tabler/icons-react";
import { useEffect, useState } from "react";

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
      // First check if area has any versions
      fetch(`/api/areas/${areaId}/versions`)
        .then((res) => res.json())
        .then((versions) => {
          setHasVersions(versions.length > 0);

          if (versionId) {
            // Specific version is selected
            const version = versions.find((v: any) => v.id === versionId);
            if (version) {
              setVersionInfo({
                versionNumber: version.versionNumber,
                name: version.name,
                isLatest: false,
              });
            }
          } else if (versions.length > 0) {
            // No specific version, but versions exist - showing latest
            const latestVersion = versions[0]; // Already sorted by versionNumber DESC
            setVersionInfo({
              versionNumber: latestVersion.versionNumber,
              name: latestVersion.name,
              isLatest: true,
            });
          } else {
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
