import { FeatureErrorBoundary } from "@/components/ui/error-boundaries";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AppSidebar = dynamic(
  () =>
    import("@/components/app-sidebar").then((m) => ({ default: m.AppSidebar })),
  {
    loading: () => <Skeleton className="w-72 h-full" />,
  }
);

const SiteHeader = dynamic(
  () =>
    import("@/components/site-header").then((m) => ({ default: m.SiteHeader })),
  {
    loading: () => <Skeleton className="w-full h-12" />,
  }
);

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
        <Suspense fallback={<Skeleton className="w-72 h-full" />}>
          <AppSidebar variant="inset" />
        </Suspense>
        <SidebarInset>
          <Suspense fallback={<Skeleton className="w-full h-12" />}>
            <SiteHeader />
          </Suspense>
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 h-full">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-full">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </FeatureErrorBoundary>
  );
}
