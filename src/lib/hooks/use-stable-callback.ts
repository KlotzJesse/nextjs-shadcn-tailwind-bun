import { useCallback, useRef } from "react";

/**
 * Creates a stable callback reference that doesn't change between renders
 * Useful for preventing unnecessary re-renders in child components
 * while still allowing the callback to access the latest values
 *
 * This is the standard "useEvent" pattern recommended by React team
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef<T | undefined>(undefined);
  callbackRef.current = callback;

  // Return a stable callback that always calls the latest version
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current!(...args)) as T,
    []
  );
}
