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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAreas } from "@/lib/hooks/use-areas";
import { useState } from "react";

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAreaCreated?: (areaId: number) => void;
}

export function CreateAreaDialog({
  open,
  onOpenChange,
  onAreaCreated,
}: CreateAreaDialogProps) {
  const { createArea, isLoading } = useAreas();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [granularity, setGranularity] = useState("5digit");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const area = await createArea({ name, description, granularity });
      setName("");
      setDescription("");
      setGranularity("5digit");
      onOpenChange(false);
      if (onAreaCreated && area) {
        onAreaCreated(area.id);
      }
    } catch (error) {
      // Error already handled in useAreas hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Neues Gebiet erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Gebiet mit mehreren Layern für
              verschiedene Postleitzahlen-Bereiche.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Nord-Region"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="granularity">PLZ-Granularität</Label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger id="granularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1digit">1-stellig</SelectItem>
                  <SelectItem value="2digit">2-stellig</SelectItem>
                  <SelectItem value="3digit">3-stellig</SelectItem>
                  <SelectItem value="5digit">5-stellig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
