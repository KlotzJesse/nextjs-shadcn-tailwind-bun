import { Suspense } from 'react';
import { Metadata } from "next"
import { StatesView } from '@/components/states/states-view';
import { getStatesDataServer } from "@/lib/utils/states-data"
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: "KRAUSS Territory Management - German States",
  description: "Interactive territory management for German states and federal regions",
  openGraph: {
    title: "KRAUSS Territory Management - German States",
    description: "Interactive territory management for German states and federal regions",
    type: 'website',
  },
}

export default async function StatesPage() {
  const statesData = await getStatesDataServer()

  if (!statesData) {
    notFound()
  }

  return (
    <div className="h-full px-4 lg:px-6">
      <Suspense fallback={<StatesLoading />}>
        <StatesView data={statesData} />
      </Suspense>
    </div>
  )
}

function StatesLoading() {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 @container/main:h-full h-full">
      <div className="col-span-3 space-y-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="col-span-9">
        <div className="h-full bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  )
} 