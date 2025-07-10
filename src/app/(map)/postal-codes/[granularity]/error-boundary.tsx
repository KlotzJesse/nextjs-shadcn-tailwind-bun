import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ErrorMessage } from "@/components/ui/error-message";

export function MapErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ErrorMessage message="Failed to load map data." />}
    >
      {children}
    </ErrorBoundary>
  );
}
