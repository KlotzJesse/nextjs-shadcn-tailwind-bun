/**
 * @deprecated This hook has been replaced with server actions for Next.js 15 compliance
 * Use the server actions from @/app/actions/area-actions.ts instead:
 * - getLayersAction()
 * - createLayerAction()
 * - updateLayerAction()
 * - deleteLayerAction()
 * - addPostalCodesToLayerAction()
 * - removePostalCodesFromLayerAction()
 *
 * Data should be fetched in server components and passed down as props.
 * Mutations should use server actions with useTransition for loading states.
 */

import { useState } from "react";

export interface CreateLayerData {
  areaId: number;
  name: string;
  color?: string;
  opacity?: number;
  isVisible?: string;
  orderIndex?: number;
  postalCodes?: string[];
}

export interface UpdateLayerData {
  name?: string;
  color?: string;
  opacity?: number;
  isVisible?: string;
  orderIndex?: number;
  postalCodes?: string[];
}

/**
 * @deprecated Use server actions instead of this hook
 * This is kept for backward compatibility only
 */
export function useAreaLayers(areaId: number) {
  const [layers] = useState([]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // All functions are no-ops - use server actions instead
  const fetchLayers = async () => {
    console.warn(
      "useAreaLayers.fetchLayers is deprecated. Use getLayersAction() from server actions."
    );
  };

  const createLayer = async () => {
    console.warn(
      "useAreaLayers.createLayer is deprecated. Use createLayerAction() from server actions."
    );
    throw new Error("Deprecated: Use createLayerAction() from server actions");
  };

  const updateLayer = async () => {
    console.warn(
      "useAreaLayers.updateLayer is deprecated. Use updateLayerAction() from server actions."
    );
    throw new Error("Deprecated: Use updateLayerAction() from server actions");
  };

  const addPostalCodesToLayer = async () => {
    console.warn(
      "useAreaLayers.addPostalCodesToLayer is deprecated. Use addPostalCodesToLayerAction() from server actions."
    );
    throw new Error(
      "Deprecated: Use addPostalCodesToLayerAction() from server actions"
    );
  };

  const removePostalCodesFromLayer = async () => {
    console.warn(
      "useAreaLayers.removePostalCodesFromLayer is deprecated. Use removePostalCodesFromLayerAction() from server actions."
    );
    throw new Error(
      "Deprecated: Use removePostalCodesFromLayerAction() from server actions"
    );
  };

  const toggleLayerVisibility = async () => {
    console.warn(
      "useAreaLayers.toggleLayerVisibility is deprecated. Use updateLayerAction() from server actions."
    );
    throw new Error("Deprecated: Use updateLayerAction() from server actions");
  };

  const updateLayerColor = async () => {
    console.warn(
      "useAreaLayers.updateLayerColor is deprecated. Use updateLayerAction() from server actions."
    );
    throw new Error("Deprecated: Use updateLayerAction() from server actions");
  };

  const deleteLayer = async () => {
    console.warn(
      "useAreaLayers.deleteLayer is deprecated. Use deleteLayerAction() from server actions."
    );
    throw new Error("Deprecated: Use deleteLayerAction() from server actions");
  };

  return {
    layers,
    isLoading,
    error,
    fetchLayers,
    createLayer,
    updateLayer,
    deleteLayer,
    addPostalCodesToLayer,
    removePostalCodesFromLayer,
    toggleLayerVisibility,
    updateLayerColor,
  };
}
