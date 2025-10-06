/**
 * @deprecated This hook has been replaced with server actions for Next.js 15 compliance
 * Use the server actions from @/app/actions/area-actions.ts instead:
 * - getAreasAction()
 * - getAreaByIdAction()
 * - createAreaAction()
 * - updateAreaAction()
 * - deleteAreaAction()
 *
 * Data should be fetched in server components and passed down as props.
 * Mutations should use server actions with useTransition for loading states.
 */

import { useState } from "react";

export interface Area {
  id: number;
  name: string;
  description: string | null;
  granularity: string;
  isArchived: string;
  createdAt: string;
  updatedAt: string;
}

export interface AreaWithLayers extends Area {
  layers: Layer[];
}

export interface Layer {
  id: number;
  areaId: number;
  name: string;
  color: string;
  opacity: number;
  isVisible: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  postalCodes?: PostalCodeEntry[];
}

export interface PostalCodeEntry {
  postalCode: string;
}

export interface CreateAreaData {
  name: string;
  description?: string;
  granularity?: string;
}

export interface UpdateAreaData {
  name?: string;
  description?: string;
  granularity?: string;
}

/**
 * @deprecated Use server actions instead of this hook
 */
export function useAreas() {
  const [areas] = useState<Area[]>([]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const fetchAreas = async () => {
    console.warn(
      "useAreas.fetchAreas is deprecated. Use getAreasAction() from server actions."
    );
  };

  const createArea = async () => {
    console.warn(
      "useAreas.createArea is deprecated. Use createAreaAction() from server actions."
    );
    throw new Error("Deprecated: Use createAreaAction() from server actions");
  };

  const updateArea = async () => {
    console.warn(
      "useAreas.updateArea is deprecated. Use updateAreaAction() from server actions."
    );
    throw new Error("Deprecated: Use updateAreaAction() from server actions");
  };

  const deleteArea = async () => {
    console.warn(
      "useAreas.deleteArea is deprecated. Use deleteAreaAction() from server actions."
    );
    throw new Error("Deprecated: Use deleteAreaAction() from server actions");
  };

  const getAreaById = async () => {
    console.warn(
      "useAreas.getAreaById is deprecated. Use getAreaByIdAction() from server actions."
    );
    throw new Error("Deprecated: Use getAreaByIdAction() from server actions");
  };

  const getArea = async () => {
    console.warn(
      "useAreas.getArea is deprecated. Use getAreaByIdAction() from server actions."
    );
    throw new Error("Deprecated: Use getAreaByIdAction() from server actions");
  };

  return {
    areas,
    isLoading,
    error,
    fetchAreas,
    createArea,
    updateArea,
    deleteArea,
    getAreaById,
    getArea,
  };
}
