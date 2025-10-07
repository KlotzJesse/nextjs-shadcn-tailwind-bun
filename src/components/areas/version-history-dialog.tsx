"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useVersionHistory,
  type AreaVersion,
} from "@/lib/hooks/use-version-history";
import { IconClock, IconEye, IconRestore } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useMapState } from "@/lib/url-state/map-state";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  areaId,
}: VersionHistoryDialogProps) {
  const { getVersionHistory, restoreVersion } = useVersionHistory(areaId);
  const { versionId, setVersion } = useMapState();
  const [versions, setVersions] = useState<AreaVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AreaVersion | null>(
    null
  );

  useEffect(() => {
    if (open && areaId) {
      loadVersions();
    }
  }, [open, areaId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await getVersionHistory();
      setVersions(data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVersion = (version: AreaVersion) => {
    // Set the version ID in URL to view this version
    setVersion(version.id);
    onOpenChange(false);
  };

  const handleRestore = async (version: AreaVersion) => {
    try {
      await restoreVersion(version);
      // Clear version from URL to go back to current version
      setVersion(null);
      onOpenChange(false);
      // Reload page to show restored data
      window.location.reload();
    } catch (error) {
      console.error("Failed to restore version:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Versionshistorie</DialogTitle>
          <DialogDescription className="space-y-2">
            <div>
              Alle gespeicherten Versionen dieses Gebiets anzeigen und
              wiederherstellen.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!versionId && versions.length > 0 && (
                <Badge variant="default">
                  Aktuelle Version {versions[0]?.versionNumber} angezeigt
                </Badge>
              )}
              {versionId && (
                <Badge variant="secondary">
                  Version{" "}
                  {versions.find((v) => v.id === versionId)?.versionNumber ||
                    versionId}{" "}
                  aktiv
                </Badge>
              )}
            </div>
            {versionId && (
              <div className="text-sm text-muted-foreground">
                💡 Änderungen an dieser Version erstellen automatisch eine neue
                Version (Branching)
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              Lade Versionen...
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <IconClock className="h-12 w-12 mb-2" />
              <p>Keine Versionen vorhanden</p>
              <p className="text-sm">
                Erstellen Sie eine Version, um den aktuellen Stand zu speichern
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedVersion?.id === version.id
                      ? "border-primary bg-accent"
                      : versionId === version.id
                      ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                      : !versionId &&
                        version.versionNumber === versions[0]?.versionNumber
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant="outline" className="flex-shrink-0">
                        Version {version.versionNumber}
                      </Badge>
                      {versionId === version.id && (
                        <Badge
                          variant="default"
                          className="bg-green-600 flex-shrink-0"
                        >
                          Aktuelle Ansicht
                        </Badge>
                      )}
                      {!versionId &&
                        version.versionNumber ===
                          versions[0]?.versionNumber && (
                          <Badge
                            variant="default"
                            className="bg-blue-600 flex-shrink-0"
                          >
                            Aktuelle Version
                          </Badge>
                        )}
                      {version.name && (
                        <span className="font-medium truncate">
                          {version.name}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </span>
                  </div>

                  {version.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {version.description}
                    </p>
                  )}

                  {version.changesSummary && (
                    <p className="text-sm mb-2">{version.changesSummary}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {version.snapshot.layers.length} Gebiet
                      {version.snapshot.layers.length !== 1 ? "e" : ""}
                    </span>
                    <span>
                      {version.snapshot.layers.reduce(
                        (sum, l) => sum + l.postalCodes.length,
                        0
                      )}{" "}
                      PLZ gesamt
                    </span>
                    {version.createdBy && <span>von {version.createdBy}</span>}
                  </div>

                  {selectedVersion?.id === version.id && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm font-medium mb-2">
                        Gebiets-Details:
                      </div>
                      <div className="space-y-1">
                        {version.snapshot.layers.map((layer, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span>{layer.name}</span>
                            <span className="text-muted-foreground">
                              ({layer.postalCodes.length} PLZ)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          {versionId && (
            <Button
              variant="outline"
              onClick={() => {
                setVersion(null);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <IconEye className="h-4 w-4" />
              Aktuelle Version
            </Button>
          )}
          {selectedVersion && (
            <>
              <Button
                variant="outline"
                onClick={() => handleViewVersion(selectedVersion)}
                className="gap-2"
              >
                <IconEye className="h-4 w-4" />V{selectedVersion.versionNumber}{" "}
                anzeigen
              </Button>
              <Button
                onClick={() => handleRestore(selectedVersion)}
                className="gap-2"
              >
                <IconRestore className="h-4 w-4" />V
                {selectedVersion.versionNumber} wiederherstellen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
