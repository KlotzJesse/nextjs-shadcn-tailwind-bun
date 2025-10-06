import { useState, useCallback } from "react";
import { Layer } from "./use-areas";

export interface ConflictingPostalCode {
  postalCode: string;
  layers: {
    id: number;
    name: string;
    color: string;
  }[];
}

export function useLayerConflicts(layers: Layer[]) {
  const [conflicts, setConflicts] = useState<ConflictingPostalCode[]>([]);

  const detectConflicts = useCallback(() => {
    const postalCodeMap = new Map<string, Layer[]>();

    // Build map of postal codes to layers
    layers.forEach((layer) => {
      layer.postalCodes?.forEach((pc) => {
        if (!postalCodeMap.has(pc.postalCode)) {
          postalCodeMap.set(pc.postalCode, []);
        }
        postalCodeMap.get(pc.postalCode)!.push(layer);
      });
    });

    // Find conflicts (postal codes in multiple layers)
    const conflictsList: ConflictingPostalCode[] = [];
    postalCodeMap.forEach((layerList, postalCode) => {
      if (layerList.length > 1) {
        conflictsList.push({
          postalCode,
          layers: layerList.map((l) => ({
            id: l.id,
            name: l.name,
            color: l.color,
          })),
        });
      }
    });

    setConflicts(conflictsList);
    return conflictsList;
  }, [layers]);

  return {
    conflicts,
    detectConflicts,
    hasConflicts: conflicts.length > 0,
  };
}
