"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStableCallback } from "@/lib/hooks/use-stable-callback";
import {
    findPostalCodeMatches,
    groupMatchesByPattern,
    parsePostalCodeInput,
} from "@/lib/utils/postal-code-parser";
import type { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const BulkImportDialog = dynamic(
  () => import("./bulk-import-dialog").then(m => ({ default: m.BulkImportDialog })),
  { ssr: false }
);

interface PostalCodeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  granularity: string;
  onImport: (postalCodes: string[]) => void;
  areaId?: number; // Optional for bulk import
}

export function PostalCodeImportDialog({
  open,
  onOpenChange,
  data,
  granularity,
  onImport,
  areaId,
}: PostalCodeImportDialogProps) {
  const [textInput, setTextInput] = useState("");
  const [activeTab, setActiveTab] = useState("paste");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Parse and validate input
  const parsedCodes = useMemo(() => {
    if (!textInput.trim()) return [];
    return parsePostalCodeInput(textInput);
  }, [textInput]);

  // Find matches based on current granularity
  const matches = useMemo(() => {
    if (parsedCodes.length === 0) return [];
    return findPostalCodeMatches(parsedCodes, data, granularity);
  }, [parsedCodes, data, granularity]);

  const groupedMatches = useMemo(() => {
    return groupMatchesByPattern(matches);
  }, [matches]);

  // Statistics
  const stats = useMemo(() => {
    const validCodes = parsedCodes.filter(p => p.isValid);
    const invalidCodes = parsedCodes.filter(p => !p.isValid);
    const totalMatches = matches.reduce((sum, match) => sum + match.matched.length, 0);

    return {
      total: parsedCodes.length,
      valid: validCodes.length,
      invalid: invalidCodes.length,
      matches: totalMatches,
      uniqueMatches: new Set(matches.flatMap(m => m.matched)).size,
    };
  }, [parsedCodes, matches]);

  // Handle import
  const handleImport = useStableCallback(() => {
    if (stats.uniqueMatches === 0) {
      toast.error("Keine gültigen PLZ-Übereinstimmungen gefunden");
      return;
    }

    const allMatchedCodes = matches.flatMap(match => match.matched);
    const uniqueCodes = [...new Set(allMatchedCodes)];

    onImport(uniqueCodes);

    toast.success(`${uniqueCodes.length} PLZ-Regionen erfolgreich importiert`);

    // Clear and close
    setTextInput("");
    onOpenChange(false);
  });

  // Clear input
  const handleClear = useStableCallback(() => {
    setTextInput("");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>PLZ-Regionen importieren</DialogTitle>
          <DialogDescription>
            Importieren Sie PLZ direkt oder nutzen Sie den Excel/CSV Massen-Import für mehrere Layer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text eingeben
              </TabsTrigger>
              {areaId && (
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel/CSV Massen-Import
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="paste" className="flex-1 mt-4 flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal-input">PLZ eingeben</Label>
                <Textarea
                  id="postal-input"
                  placeholder={`PLZ eingeben... Beispiele:
86899, 86932
D-86899, D-86932
8, 9 (alle PLZ mit 8 oder 9 beginnend)
86899
86932

Unterstützte Trennzeichen: Komma, Semikolon, Leerzeichen, neue Zeile`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-32 font-mono text-sm"
                />
              </div>

              {/* Statistics */}
              {parsedCodes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {stats.valid} gültig
                    </Badge>
                    {stats.invalid > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {stats.invalid} ungültig
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {stats.uniqueMatches} PLZ-Regionen gefunden
                    </Badge>
                  </div>

                  {/* Preview of matches */}
                  {matches.length > 0 && (
                    <div className="space-y-2">
                      <Label>Gefundene Übereinstimmungen:</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-muted/30">
                        <div className="space-y-2 text-sm">
                          {Object.entries(groupedMatches).map(([pattern, match]) => (
                            <div key={pattern} className="flex items-start gap-2">
                              <Badge variant="outline" className="shrink-0">
                                {pattern}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                              <div className="flex flex-wrap gap-1">
                                {match.matched.slice(0, 10).map(code => (
                                  <Badge key={code} variant="secondary" className="text-xs">
                                    {code}
                                  </Badge>
                                ))}
                                {match.matched.length > 10 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{match.matched.length - 10} weitere
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show invalid codes */}
                  {stats.invalid > 0 && (
                    <div className="space-y-2">
                      <Label className="text-destructive">Ungültige Eingaben:</Label>
                      <div className="max-h-20 overflow-y-auto">
                        <div className="flex flex-wrap gap-1">
                          {parsedCodes
                            .filter(p => !p.isValid)
                            .map(p => (
                              <Badge key={p.original} variant="destructive" className="text-xs">
                                {p.original}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {areaId && (
              <TabsContent value="bulk" className="flex-1 mt-4">
                <div className="flex flex-col items-center gap-6 p-8">
                  <div className="p-6 rounded-full bg-muted">
                    <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Excel/CSV Massen-Import</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Laden Sie Excel (.xlsx, .xls) oder CSV Dateien mit PLZ und Layer-Zuordnungen hoch.
                      Ordnen Sie Spalten zu und importieren Sie mehrere Layer gleichzeitig.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                      setBulkImportOpen(true);
                      onOpenChange(false);
                    }}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Massen-Import starten
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ Unterstützt Excel (.xlsx, .xls) und CSV Dateien</p>
                    <p>✓ Automatische Spaltenerkennung für PLZ und Layer</p>
                    <p>✓ Vorschau und Validierung vor Import</p>
                    <p>✓ Bulk-Erstellung oder Update von Layern</p>
                    <p>✓ Unterstützt Format: 12345 oder D-12345</p>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClear} disabled={!textInput.trim()}>
            Leeren
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleImport}
              disabled={stats.uniqueMatches === 0}
            >
              {`${stats.uniqueMatches} PLZ importieren`}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Bulk Import Dialog */}
      {areaId && (
        <BulkImportDialog
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          areaId={areaId}
          onImportComplete={() => {
            setBulkImportOpen(false);
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}
