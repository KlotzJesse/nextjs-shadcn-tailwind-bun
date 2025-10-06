"use client";

import {
  IconDashboard,
  IconFolder,
  IconInnerShadowTop,
} from "@tabler/icons-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavAreas } from "@/components/areas/nav-areas";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Übersicht",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Postleitzahlen",
      url: "/postal-codes",
      icon: IconFolder,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentAreaId?: number | null;
  onAreaSelect?: (areaId: number) => void;
}

export function AppSidebar({
  currentAreaId,
  onAreaSelect,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">
                  KRAUSS Gebietsmanagement
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavAreas currentAreaId={currentAreaId} onAreaSelect={onAreaSelect} />
      </SidebarContent>
    </Sidebar>
  );
}
