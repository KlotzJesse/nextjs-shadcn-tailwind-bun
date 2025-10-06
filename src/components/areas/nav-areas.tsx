"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAreas, type Area } from "@/lib/hooks/use-areas";
import { IconFolder, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { CreateAreaDialog } from "./create-area-dialog";
import { useRouter } from "next/navigation";

interface NavAreasProps {
  currentAreaId?: number | null;
  onAreaSelect?: (areaId: number) => void;
}

export function NavAreas({ currentAreaId, onAreaSelect }: NavAreasProps) {
  const { areas, isLoading } = useAreas();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const router = useRouter();

  const handleAreaCreated = (areaId: number) => {
    if (onAreaSelect) {
      onAreaSelect(areaId);
    } else {
      router.push(`/postal-codes?areaId=${areaId}`);
    }
  };

  const handleAreaClick = (area: Area) => {
    if (onAreaSelect) {
      onAreaSelect(area.id);
    } else {
      router.push(`/postal-codes?areaId=${area.id}`);
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <div className="flex items-center justify-between w-full">
            <span>Gebiete</span>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="hover:bg-sidebar-accent rounded p-0.5"
              title="Neues Gebiet erstellen"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {isLoading && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>Lade...</SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isLoading && areas.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setCreateDialogOpen(true)}
                  className="text-muted-foreground"
                >
                  <IconPlus className="h-4 w-4" />
                  <span>Erstes Gebiet erstellen</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isLoading &&
              areas.map((area) => (
                <SidebarMenuItem key={area.id}>
                  <SidebarMenuButton
                    onClick={() => handleAreaClick(area)}
                    isActive={currentAreaId === area.id}
                  >
                    <IconFolder className="h-4 w-4" />
                    <span>{area.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <CreateAreaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAreaCreated={handleAreaCreated}
      />
    </>
  );
}
