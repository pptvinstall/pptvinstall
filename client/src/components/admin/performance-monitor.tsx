import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, Cpu, Database, HardDrive, Timer, 
  TrendingUp, TrendingDown, Zap 
} from 'lucide-react';

interface PerformanceData {
  metrics: Record<string, {
    avg: number;
    min: number;
    max: number;
    count: number;
  }>;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    percentage: number;
  };
  timestamp: string;
}

export function PerformanceMonitor() {
  const [adminPassword] = useState(() => 
    sessionStorage.getItem('admin-password') || ''
  );

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/admin/performance'],
    queryFn: async (): Promise<PerformanceData> => {
      const response = await fetch(`/api/admin/performance?password=${adminPassword}`);
      if (!response.ok) throw new Error('Failed to fetch performance data');
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!adminPassword,
  });

  const formatDuration = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getMemoryStatus = (percentage: number) => {
    if (percentage < 60) return { color: 'text-green-600', status: 'Good' };
    if (percentage < 80) return { color: 'text-yellow-600', status: 'Warning' };
    return { color: 'text-red-600', status: 'Critical' };
  };

  const getResponseTimeStatus = (avg: number) => {
    if (avg < 100) return { color: 'text-green-600', icon: TrendingUp };
    if (avg < 500) return { color: 'text-yellow-600', icon: Activity };
    return { color: 'text-red-600', icon: TrendingDown };
  };

  if (isLoading || !performanceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const memoryStatus = getMemoryStatus(performanceData.memory.percentage);

  return (
    <div className="space-y-6">
      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Memory Usage
            </div>
            <Badge 
              variant={memoryStatus.status === 'Good' ? 'default' : 'destructive'}
              className={memoryStatus.color}
            >
              {memoryStatus.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {performanceData.memory.heapUsed}MB</span>
              <span>Total: {performanceData.memory.heapTotal}MB</span>
            </div>
            <Progress 
              value={performanceData.memory.percentage} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              {performanceData.memory.percentage.toFixed(1)}% used
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">RSS</div>
              <div className="text-muted-foreground">{performanceData.memory.rss}MB</div>
            </div>
            <div>
              <div className="font-medium">External</div>
              <div className="text-muted-foreground">{performanceData.memory.external}MB</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(performanceData.metrics).map(([operation, stats]) => {
              const responseStatus = getResponseTimeStatus(stats.avg);
              const IconComponent = responseStatus.icon;
              
              return (
                <div key={operation} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-4 w-4 ${responseStatus.color}`} />
                    <div>
                      <div className="font-medium text-sm">{operation}</div>
                      <div className="text-xs text-muted-foreground">
                        {stats.count} requests
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {formatDuration(stats.avg)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(stats.min)} - {formatDuration(stats.max)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {Object.keys(performanceData.metrics).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No performance data available yet. 
              Make some API requests to see metrics.
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="font-medium">Database</div>
              <Badge variant="default" className="text-green-600">Connected</Badge>
            </div>
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="font-medium">Server</div>
              <Badge variant="default" className="text-green-600">Running</Badge>
            </div>
            <div className="text-center">
              <Timer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="font-medium">Uptime</div>
              <div className="text-sm text-muted-foreground">
                {new Date(performanceData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}