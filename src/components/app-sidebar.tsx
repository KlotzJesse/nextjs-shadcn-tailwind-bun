"use client";

"use client";

import {
  IconDashboard,
  IconFolder,
  IconMapPin2,
  IconInnerShadowTop,
} from "@tabler/icons-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavAreas } from "@/components/areas/nav-areas";
import { CreateAreaDialog } from "@/components/areas/create-area-dialog";
import { type Area } from "@/lib/hooks/use-areas";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";

const data = {
  navMain: [
    {
      title: "Übersicht",
      url: "/",
      icon: IconDashboard,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  areas?: Area[];
  currentAreaId?: number | null;
  onAreaSelect?: (areaId: number) => void;
}

export function AppSidebar({
  areas = [],
  currentAreaId,
  onAreaSelect,
  ...props
}: AppSidebarProps) {
  const router = useRouter();
  const [createAreaDialogOpen, setCreateAreaDialogOpen] = React.useState(false);

  const handleCreateArea = () => {
    setCreateAreaDialogOpen(true);
  };

  const handleAreaCreated = (areaId: number) => {
    // Navigate to the newly created area
    router.push(`/postal-codes?areaId=${areaId}`);
    if (onAreaSelect) {
      onAreaSelect(areaId);
    }
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <a href="#">
                  <IconMapPin2 className="!size-5" />
                  <span className="text-base font-semibold">
                    KRAUSS Gebietsmanagement
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} onCreateArea={handleCreateArea} />
          <NavAreas
            areas={areas}
            currentAreaId={currentAreaId}
            onAreaSelect={onAreaSelect}
          />
        </SidebarContent>
      </Sidebar>
      <CreateAreaDialog
        open={createAreaDialogOpen}
        onOpenChange={setCreateAreaDialogOpen}
        onAreaCreated={handleAreaCreated}
      />
    </>
  );
}
