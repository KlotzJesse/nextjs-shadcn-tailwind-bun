import { useCallback, useRef } from "react";

/**
 * Creates a stable callback reference that doesn't change between renders
 * Useful for preventing unnecessary re-renders in child components
 * while still allowing the callback to access the latest values
 *
 * This is the standard "useEvent" pattern recommended by React team
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends any[], U>(
    callback: (...args: T) => U,
): (...args: T) => U {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;
    return useCallback((...args: T) => callbackRef.current(...args), []);
}
