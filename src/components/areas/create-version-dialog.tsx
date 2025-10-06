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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVersionHistory } from "@/lib/hooks/use-version-history";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";

interface CreateVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
  onVersionCreated?: () => void;
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  areaId,
  onVersionCreated,
}: CreateVersionDialogProps) {
  const { createVersion } = useVersionHistory(areaId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [changesSummary, setChangesSummary] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await createVersion({
        name: name || undefined,
        description: description || undefined,
        changesSummary: changesSummary || undefined,
      });

      setName("");
      setDescription("");
      setChangesSummary("");
      onOpenChange(false);
      onVersionCreated?.();
    } catch (error) {
      console.error("Failed to create version:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconDeviceFloppy className="h-5 w-5" />
              Neue Version erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie einen Snapshot des aktuellen Zustands aller Layer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="version-name">Name (optional)</Label>
              <Input
                id="version-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Vor Änderung Region Nord"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="version-description">
                Beschreibung (optional)
              </Label>
              <Textarea
                id="version-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung dieser Version..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="changes-summary">
                Änderungszusammenfassung (optional)
              </Label>
              <Textarea
                id="changes-summary"
                value={changesSummary}
                onChange={(e) => setChangesSummary(e.target.value)}
                placeholder="Was wurde in dieser Version geändert..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Erstelle..." : "Version erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
