/**
 * @deprecated This hook has been replaced with server actions for Next.js 15 compliance
 * Use drivingRadiusSearchAction() from @/app/actions/area-actions.ts instead
 *
 * Data should be fetched in server components and passed down as props.
 * Mutations should use server actions with useTransition for loading states.
 */

interface UseDrivingRadiusSearchOptions {
  onRadiusComplete?: (postalCodes: string[]) => void;
}

/**
 * @deprecated Use drivingRadiusSearchAction() from server actions instead
 */
export function useDrivingRadiusSearch(
  _options: UseDrivingRadiusSearchOptions
) {
  throw new Error(
    "useDrivingRadiusSearch is deprecated. Use drivingRadiusSearchAction() from server actions instead."
  );
}
