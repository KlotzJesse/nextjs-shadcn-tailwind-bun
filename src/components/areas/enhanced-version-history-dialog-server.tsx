import { getVersions, getChangeHistory } from "@/lib/db/data-functions";
import { EnhancedVersionHistoryDialog } from "./enhanced-version-history-dialog";

interface EnhancedVersionHistoryDialogServerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
}

export async function EnhancedVersionHistoryDialogServer({
  open,
  onOpenChange,
  areaId,
}: EnhancedVersionHistoryDialogServerProps) {
  // Fetch data on the server
  const [initialVersions, initialChanges] = await Promise.all([
    getVersions(areaId),
    getChangeHistory(areaId, { limit: 50 }),
  ]);

  console.log(initialVersions, initialChanges);

  return (
    <EnhancedVersionHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      areaId={areaId}
      initialVersions={initialVersions}
      initialChanges={initialChanges}
    />
  );
}
