import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarSkeleton } from "@/components/ui/loading-skeleton";
import { FeatureErrorBoundary } from "@/components/ui/error-boundaries";
import { Suspense } from "react";

export const experimental_ppr = true;

export default async function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureErrorBoundary fallbackMessage="Fehler beim Laden der Anwendung">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        {/* Sidebar with Suspense boundary */}
        <Suspense fallback={<SidebarSkeleton />}>
          <AppSidebar variant="inset" />
        </Suspense>
        <SidebarInset>
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 h-full">
              <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6 h-full">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </FeatureErrorBoundary>
  );
}
