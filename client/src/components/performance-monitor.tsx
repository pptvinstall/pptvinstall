
import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  fid: number | null;
}

// Only show in development
const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'production') return;

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const fcp = entries[0];
        setMetrics(prev => ({ ...prev, fcp: fcp.startTime }));
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }));
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      setMetrics(prev => ({ ...prev, fid: (firstInput as any).processingStart - (firstInput as any).startTime }));
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cleanup
    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      fidObserver.disconnect();
    };
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setVisible(!visible)}
        className="bg-gray-800 text-white p-2 rounded-md"
      >
        {visible ? 'Hide Metrics' : 'Show Metrics'}
      </button>
      
      {visible && (
        <div className="mt-2 p-4 bg-white shadow-lg rounded-md border border-gray-200 w-64">
          <h3 className="font-semibold text-gray-800 mb-2">Performance Metrics</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm">FCP:</span>
              <span className="text-sm font-mono">{metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'Measuring...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">LCP:</span>
              <span className="text-sm font-mono">{metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'Measuring...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">CLS:</span>
              <span className="text-sm font-mono">{metrics.cls !== null ? metrics.cls.toFixed(3) : 'Measuring...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">FID:</span>
              <span className="text-sm font-mono">{metrics.fid ? `${metrics.fid.toFixed(1)}ms` : 'Waiting...'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
