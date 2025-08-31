// components/CachePerformanceDisplay.tsx
'use client';

import React from 'react';
import { useCacheMonitoring, type CacheStats, type CachePerformanceMetrics } from '@/lib/hooks/useCacheMonitoring';

interface CachePerformanceDisplayProps {
  className?: string;
  compact?: boolean;
}

/**
 * Development-only component for visualizing cache performance metrics
 * Shows real-time cache hit rates, TTFT tracking, and performance statistics
 */
export function CachePerformanceDisplay({ className = '', compact = false }: CachePerformanceDisplayProps) {
  const {
    stats,
    isEnabled,
    toggleEnabled,
    clearMetrics,
    exportMetrics,
    getPerformanceTrend,
    formatTTFT,
    formatCacheHitRate,
    formatTokenCount
  } = useCacheMonitoring();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const recentTrend = getPerformanceTrend(5); // Last 5 minutes

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-gray-600 ${className}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${isEnabled ? 'bg-green-400' : 'bg-gray-400'}`} />
        <span>Cache: {formatCacheHitRate(stats.cacheHitRate)}</span>
        <span>TTFT: {formatTTFT(stats.averageTTFT)}</span>
        <span>Reqs: {stats.totalRequests}</span>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Cache Performance Monitor</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEnabled}
            className={`px-2 py-1 text-xs rounded ${
              isEnabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={clearMetrics}
            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded"
            disabled={!isEnabled || stats.totalRequests === 0}
          >
            Clear
          </button>
          <button
            onClick={exportMetrics}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
            disabled={!isEnabled || stats.totalRequests === 0}
          >
            Export
          </button>
        </div>
      </div>

      {!isEnabled ? (
        <div className="text-gray-500 text-center py-8">
          Cache monitoring is disabled
        </div>
      ) : (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="Total Requests"
              value={stats.totalRequests.toString()}
              className="text-blue-600"
            />
            <MetricCard
              label="Cache Hit Rate"
              value={formatCacheHitRate(stats.cacheHitRate)}
              className={stats.cacheHitRate > 50 ? 'text-green-600' : 'text-orange-600'}
            />
            <MetricCard
              label="Avg TTFT"
              value={formatTTFT(stats.averageTTFT)}
              className={stats.averageTTFT < 200 ? 'text-green-600' : 'text-orange-600'}
            />
            <MetricCard
              label="Total Tokens"
              value={formatTokenCount(stats.totalTokensUsed)}
              className="text-purple-600"
            />
          </div>

          {/* Recent Trend (Last 5 minutes) */}
          {recentTrend.requestCount > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Recent Trend (5min)</h4>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  label="Recent Requests"
                  value={recentTrend.requestCount.toString()}
                  compact
                />
                <MetricCard
                  label="Recent Cache Rate"
                  value={formatCacheHitRate(recentTrend.cacheHitRate)}
                  compact
                />
                <MetricCard
                  label="Recent Avg TTFT"
                  value={formatTTFT(recentTrend.averageTTFT)}
                  compact
                />
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {stats.recentMetrics.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Recent Activity</h4>
              <div className="bg-white border border-gray-200 rounded max-h-48 overflow-y-auto">
                {stats.recentMetrics.slice(0, 10).map((metric) => (
                  <RequestRow key={metric.requestId} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {stats.totalRequests === 0 && (
            <div className="text-gray-500 text-center py-8">
              No cache metrics yet. Start typing to see performance data.
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
}

function MetricCard({ label, value, className = '', compact = false }: MetricCardProps) {
  return (
    <div className={`${compact ? 'p-2' : 'p-3'} bg-white border border-gray-200 rounded`}>
      <div className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</div>
      <div className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} ${className}`}>
        {value}
      </div>
    </div>
  );
}

interface RequestRowProps {
  metric: CachePerformanceMetrics;
}

function RequestRow({ metric }: RequestRowProps) {
  const timeAgo = new Date(Date.now() - metric.timestamp).toISOString().substr(14, 5);
  
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${metric.cacheHit ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-xs text-gray-500">{timeAgo} ago</span>
        {metric.ttft && (
          <span className={`text-xs px-2 py-1 rounded ${
            metric.ttft < 100 ? 'bg-green-100 text-green-700' :
            metric.ttft < 300 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {metric.ttft}ms
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {metric.contextSize && (
          <span>{Math.round(metric.contextSize / 1000)}k ctx</span>
        )}
        {metric.inputTokens && (
          <span>{metric.inputTokens}t in</span>
        )}
        {metric.outputTokens && (
          <span>{metric.outputTokens}t out</span>
        )}
      </div>
    </div>
  );
}

// Compact version for embedding in other components
export function CachePerformanceCompact({ className }: { className?: string }) {
  return <CachePerformanceDisplay className={className || ''} compact />;
}