"use client";

import {
  IconDashboard,
  IconFolder,
  IconInnerShadowTop,
} from "@tabler/icons-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
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
  /*documents: [
    {
      name: "Gebiets-Daten",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Berichte",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Export-Werkzeuge",
      url: "#",
      icon: IconFileWord,
    },
  ],*/
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        {/* <NavDocuments items={data.documents} />*/}
      </SidebarContent>
    </Sidebar>
  );
}
