import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Map Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="h-10 bg-muted animate-pulse rounded-md" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded-md w-1/3" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-9">
        <Card className="h-full">
          <CardContent className="p-0">
            <div className="relative w-full h-[600px]">
              <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 