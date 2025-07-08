'use client'
import { ErrorMessage } from "@/components/ui/error-message";

export default function Error() {
  return <ErrorMessage message="Failed to load postal codes map for this granularity." />;
}
