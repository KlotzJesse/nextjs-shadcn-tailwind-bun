import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PerformanceStats {
  lastOperationTime: number;
  operationType: string;
  featuresProcessed: number;
  timestamp: Date;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
}

export function PerformanceMonitor({
  enabled = false,
}: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats[]>([]);
  const [frameRate, setFrameRate] = useState<number>(0);

  useEffect(() => {
    if (!enabled) return;

    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();

    const countFrames = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        setFrameRate(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(countFrames);
    };

    requestAnimationFrame(countFrames);

    // Listen for custom performance events
    const handlePerformanceEvent = (event: CustomEvent) => {
      const newStat: PerformanceStats = {
        lastOperationTime: event.detail.duration,
        operationType: event.detail.operation,
        featuresProcessed: event.detail.featuresProcessed || 0,
        timestamp: new Date(),
      };

      setStats((prev) => [newStat, ...prev.slice(0, 9)]); // Keep last 10 operations
    };

    window.addEventListener(
      "performance-metric",
      handlePerformanceEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "performance-metric",
        handlePerformanceEvent as EventListener
      );
    };
  }, [enabled]);

  if (!enabled) return null;

  const averageTime =
    stats.length > 0
      ? stats.reduce((sum, stat) => sum + stat.lastOperationTime, 0) /
        stats.length
      : 0;

  const getStatusColor = (time: number) => {
    if (time < 100) return "bg-green-500";
    if (time < 500) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getFrameRateColor = (fps: number) => {
    if (fps >= 55) return "bg-green-500";
    if (fps >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Performance Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Frame Rate:</span>
          <Badge className={`text-white ${getFrameRateColor(frameRate)}`}>
            {frameRate} FPS
          </Badge>
        </div>

        {stats.length > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Average Time:
              </span>
              <Badge className={`text-white ${getStatusColor(averageTime)}`}>
                {Math.round(averageTime)}ms
              </Badge>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground">
                Recent Operations:
              </div>
              {stats.map((stat, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="truncate">{stat.operationType}</span>
                  <div className="flex gap-1">
                    <span>{stat.featuresProcessed}f</span>
                    <Badge
                      className={`text-white text-xs ${getStatusColor(
                        stat.lastOperationTime
                      )}`}
                    >
                      {Math.round(stat.lastOperationTime)}ms
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Utility function to emit performance events
export function emitPerformanceMetric(
  operation: string,
  duration: number,
  featuresProcessed?: number
) {
  const event = new CustomEvent("performance-metric", {
    detail: { operation, duration, featuresProcessed },
  });
  window.dispatchEvent(event);
}
