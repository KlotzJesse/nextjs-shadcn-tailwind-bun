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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconClock,
  IconEye,
  IconRestore,
  IconGitBranch,
  IconDelta,
} from "@tabler/icons-react";
import { useState, useEffect, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  getVersionsAction,
  restoreVersionAction,
  compareVersionsAction,
} from "@/app/actions/version-actions";
import {
  getChangeHistoryAction,
} from "@/app/actions/change-tracking-actions";
import { toast } from "sonner";

interface Version {
  id: number;
  areaId: number;
  versionNumber: number;
  name: string | null;
  description: string | null;
  snapshot: any;
  changesSummary: string | null;
  parentVersionId: number | null;
  branchName: string | null;
  isActive: string;
  changeCount: number;
  createdBy: string | null;
  createdAt: string;
}

interface Change {
  id: number;
  changeType: string;
  entityType: string;
  changeData: any;
  previousData: any;
  createdAt: string;
  createdBy: string | null;
}

interface EnhancedVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
}

export function EnhancedVersionHistoryDialog({
  open,
  onOpenChange,
  areaId,
}: EnhancedVersionHistoryDialogProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && areaId) {
      loadVersions();
      loadChanges();
    }
  }, [open, areaId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const result = await getVersionsAction(areaId);
      if (result.success && result.data) {
        setVersions(result.data);
      }
    } catch (error) {
      console.error("Failed to load versions:", error);
      toast.error("Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  const loadChanges = async () => {
    try {
      const result = await getChangeHistoryAction(areaId, { limit: 50 });
      if (result.success && result.data) {
        setChanges(result.data);
      }
    } catch (error) {
      console.error("Failed to load changes:", error);
    }
  };

  const handleRestore = async (version: Version) => {
    if (!confirm(`Restore version ${version.versionNumber}? This will create a new branch.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await restoreVersionAction(areaId, version.id, {
          createBranch: true,
          branchName: `Restored from v${version.versionNumber}`,
        });

        if (result.success) {
          toast.success(`Version ${version.versionNumber} restored`);
          onOpenChange(false);
          window.location.reload();
        } else {
          toast.error(result.error || "Failed to restore version");
        }
      } catch (error) {
        toast.error("Failed to restore version");
      }
    });
  };

  const handleCompare = async () => {
    if (!selectedVersion || !compareVersion) return;

    try {
      const result = await compareVersionsAction(
        selectedVersion.id,
        compareVersion.id
      );

      if (result.success && result.data) {
        setComparison(result.data);
      } else {
        toast.error("Failed to compare versions");
      }
    } catch (error) {
      toast.error("Failed to compare versions");
    }
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      create_layer: "Layer Created",
      update_layer: "Layer Updated",
      delete_layer: "Layer Deleted",
      add_postal_codes: "Postal Codes Added",
      remove_postal_codes: "Postal Codes Removed",
      update_area: "Area Updated",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Version History & Changes</DialogTitle>
          <DialogDescription>
            View all versions and detailed change history for this area
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="versions" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="versions">
              <IconClock className="h-4 w-4 mr-2" />
              Versions ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="changes">
              <IconDelta className="h-4 w-4 mr-2" />
              Changes ({changes.length})
            </TabsTrigger>
            <TabsTrigger value="compare" disabled={versions.length < 2}>
              <IconGitBranch className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  Loading versions...
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <IconClock className="h-12 w-12 mb-2" />
                  <p>No versions saved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id
                          ? "border-primary bg-accent"
                          : version.isActive === "true"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">v{version.versionNumber}</Badge>
                          {version.isActive === "true" && (
                            <Badge variant="default" className="bg-blue-600">
                              Active
                            </Badge>
                          )}
                          {version.branchName && (
                            <Badge variant="secondary">
                              <IconGitBranch className="h-3 w-3 mr-1" />
                              {version.branchName}
                            </Badge>
                          )}
                          {version.name && (
                            <span className="font-medium">{version.name}</span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
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

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{version.changeCount} changes</span>
                        <span>
                          {version.snapshot?.layers?.length || 0} layer(s)
                        </span>
                        {version.createdBy && <span>by {version.createdBy}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="changes" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {changes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <IconDelta className="h-12 w-12 mb-2" />
                  <p>No changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getChangeTypeLabel(change.changeType)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(change.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                      </div>
                      <div className="text-sm">
                        {change.changeType === "add_postal_codes" && (
                          <span>
                            Added {change.changeData?.postalCodes?.length || 0} postal code(s)
                          </span>
                        )}
                        {change.changeType === "remove_postal_codes" && (
                          <span>
                            Removed {change.changeData?.postalCodes?.length || 0} postal code(s)
                          </span>
                        )}
                        {change.changeType === "create_layer" && (
                          <span>Created layer: {change.changeData?.layer?.name}</span>
                        )}
                        {change.changeType === "update_layer" && (
                          <span>Updated layer properties</span>
                        )}
                        {change.changeType === "delete_layer" && (
                          <span>Deleted layer: {change.previousData?.layer?.name}</span>
                        )}
                        {change.createdBy && (
                          <span className="text-xs text-muted-foreground ml-2">
                            by {change.createdBy}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compare" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    First Version
                  </label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedVersion?.id || ""}
                    onChange={(e) => {
                      const version = versions.find(
                        (v) => v.id === Number(e.target.value)
                      );
                      setSelectedVersion(version || null);
                      setComparison(null);
                    }}
                  >
                    <option value="">Select version</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} {v.name ? `- ${v.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Second Version
                  </label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={compareVersion?.id || ""}
                    onChange={(e) => {
                      const version = versions.find(
                        (v) => v.id === Number(e.target.value)
                      );
                      setCompareVersion(version || null);
                      setComparison(null);
                    }}
                  >
                    <option value="">Select version</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} {v.name ? `- ${v.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={handleCompare}
                disabled={!selectedVersion || !compareVersion}
                className="w-full"
              >
                Compare Versions
              </Button>

              {comparison && (
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <div className="space-y-4">
                    {comparison.layersAdded?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">
                          Layers Added ({comparison.layersAdded.length})
                        </h4>
                        {comparison.layersAdded.map((layer: any, idx: number) => (
                          <div key={idx} className="text-sm pl-4">
                            + {layer.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {comparison.layersRemoved?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">
                          Layers Removed ({comparison.layersRemoved.length})
                        </h4>
                        {comparison.layersRemoved.map((layer: any, idx: number) => (
                          <div key={idx} className="text-sm pl-4">
                            - {layer.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {comparison.layersModified?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-600 mb-2">
                          Layers Modified ({comparison.layersModified.length})
                        </h4>
                        {comparison.layersModified.map((layer: any, idx: number) => (
                          <div key={idx} className="text-sm pl-4">
                            ~ {layer.name}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <div className="text-sm space-y-1">
                        <div className="text-green-600">
                          +{comparison.postalCodesAdded?.length || 0} postal codes added
                        </div>
                        <div className="text-red-600">
                          -{comparison.postalCodesRemoved?.length || 0} postal codes removed
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedVersion && (
            <Button
              onClick={() => handleRestore(selectedVersion)}
              disabled={isPending || selectedVersion.isActive === "true"}
              className="gap-2"
            >
              <IconRestore className="h-4 w-4" />
              Restore v{selectedVersion.versionNumber}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}