/**
 * @deprecated This hook has been replaced with server actions for Next.js 15 compliance
 * Use radiusSearchAction() from @/app/actions/area-actions.ts instead
 *
 * Data should be fetched in server components and passed down as props.
 * Mutations should use server actions with useTransition for loading states.
 */

interface UseRadiusSearchOptions {
  onRadiusComplete?: (postalCodes: string[]) => void;
}

/**
 * @deprecated Use radiusSearchAction() from server actions instead
 */
export function useRadiusSearch(_options: UseRadiusSearchOptions) {
  throw new Error(
    "useRadiusSearch is deprecated. Use radiusSearchAction() from server actions instead."
  );
}
