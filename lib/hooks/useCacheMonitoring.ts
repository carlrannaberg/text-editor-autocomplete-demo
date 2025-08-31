// lib/hooks/useCacheMonitoring.ts
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Cache metrics interface matching the API route
export interface CacheMetrics {
  cacheHit?: boolean;
  cacheCreated?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  ttft?: number; // Time to First Token in ms
}

// Extended metrics for monitoring over time
export interface CachePerformanceMetrics extends CacheMetrics {
  timestamp: number;
  requestId: string;
  contextSize?: number;
  totalTime?: number;
}

// Aggregated statistics for display
export interface CacheStats {
  totalRequests: number;
  cacheHitRate: number; // Percentage
  averageTTFT: number; // Average Time to First Token
  averageContextSize: number;
  totalTokensUsed: number;
  averageTotalTime: number;
  recentMetrics: CachePerformanceMetrics[]; // Last 50 requests
}

// Hook configuration options
export interface CacheMonitoringOptions {
  enabled?: boolean;
  maxHistorySize?: number;
  autoReset?: boolean;
  resetInterval?: number; // minutes
}

/**
 * Hook for monitoring cache performance metrics over time
 * Provides real-time cache hit rates, TTFT tracking, and performance statistics
 */
export function useCacheMonitoring(options: CacheMonitoringOptions = {}) {
  const {
    enabled = process.env.NODE_ENV === 'development',
    maxHistorySize = 50,
    autoReset = true,
    resetInterval = 30 // 30 minutes
  } = options;

  const [metrics, setMetrics] = useState<CachePerformanceMetrics[]>([]);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const resetTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-reset functionality
  useEffect(() => {
    if (!autoReset || !isEnabled) return;

    const resetData = () => {
      console.log('🔄 Cache monitoring: Auto-resetting metrics data');
      setMetrics([]);
    };

    resetTimeoutRef.current = setTimeout(resetData, resetInterval * 60 * 1000);

    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [autoReset, resetInterval, isEnabled]);

  // Record new cache metrics
  const recordMetrics = useCallback((newMetrics: CacheMetrics, contextSize?: number, totalTime?: number) => {
    if (!isEnabled) return;

    const performanceMetrics: CachePerformanceMetrics = {
      ...newMetrics,
      timestamp: Date.now(),
      requestId: `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...(contextSize !== undefined && { contextSize }),
      ...(totalTime !== undefined && { totalTime })
    };

    setMetrics(prev => {
      const updated = [performanceMetrics, ...prev];
      // Keep only the most recent metrics
      return updated.slice(0, maxHistorySize);
    });
  }, [isEnabled, maxHistorySize]);

  // Calculate aggregated statistics
  const stats: CacheStats = useMemo(() => ({
    totalRequests: metrics.length,
    cacheHitRate: metrics.length > 0 
      ? (metrics.filter(m => m.cacheHit).length / metrics.length) * 100 
      : 0,
    averageTTFT: metrics.length > 0 
      ? metrics.filter(m => m.ttft).reduce((sum, m) => sum + (m.ttft || 0), 0) / metrics.filter(m => m.ttft).length 
      : 0,
    averageContextSize: metrics.length > 0 
      ? metrics.filter(m => m.contextSize).reduce((sum, m) => sum + (m.contextSize || 0), 0) / metrics.filter(m => m.contextSize).length 
      : 0,
    totalTokensUsed: metrics.reduce((sum, m) => sum + (m.inputTokens || 0) + (m.outputTokens || 0), 0),
    averageTotalTime: metrics.length > 0 
      ? metrics.filter(m => m.totalTime).reduce((sum, m) => sum + (m.totalTime || 0), 0) / metrics.filter(m => m.totalTime).length 
      : 0,
    recentMetrics: metrics
  }), [metrics]);

  // Manual controls
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    console.log('🗑️ Cache monitoring: Metrics cleared');
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
    console.log(`📊 Cache monitoring: ${!isEnabled ? 'Enabled' : 'Disabled'}`);
  }, [isEnabled]);

  // Export data for analysis
  const exportMetrics = useCallback(() => {
    const data = {
      exportTime: new Date().toISOString(),
      stats,
      rawMetrics: metrics
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `cache-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    console.log('📄 Cache metrics exported');
  }, [metrics, stats]);

  // Get recent performance trend
  const getPerformanceTrend = useCallback((minutes: number = 5) => {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
    
    return {
      requestCount: recentMetrics.length,
      cacheHitRate: recentMetrics.length > 0 
        ? (recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length) * 100 
        : 0,
      averageTTFT: recentMetrics.length > 0 
        ? recentMetrics.filter(m => m.ttft).reduce((sum, m) => sum + (m.ttft || 0), 0) / recentMetrics.filter(m => m.ttft).length 
        : 0
    };
  }, [metrics]);

  return {
    // Data
    metrics,
    stats,
    isEnabled,
    
    // Actions
    recordMetrics,
    clearMetrics,
    toggleEnabled,
    exportMetrics,
    
    // Analysis
    getPerformanceTrend,
    
    // Utilities
    formatTTFT: (ttft?: number) => ttft ? `${ttft.toFixed(0)}ms` : 'N/A',
    formatCacheHitRate: (rate: number) => `${rate.toFixed(1)}%`,
    formatTokenCount: (count: number) => count.toLocaleString()
  };
}

// Helper function to extract debug metrics from API responses
export function extractDebugMetrics(response: { debug?: unknown }): CacheMetrics | null {
  if (!response.debug || typeof response.debug !== 'object' || response.debug === null) {
    return null;
  }
  
  const debug = response.debug as Record<string, unknown>;
  if (!debug.cacheMetrics || typeof debug.cacheMetrics !== 'object' || debug.cacheMetrics === null) {
    return null;
  }
  
  const cacheMetrics = debug.cacheMetrics as Record<string, unknown>;
  
  const result: CacheMetrics = {};
  
  if (typeof cacheMetrics.cacheHit === 'boolean') {
    result.cacheHit = cacheMetrics.cacheHit;
  }
  if (typeof cacheMetrics.cacheCreated === 'boolean') {
    result.cacheCreated = cacheMetrics.cacheCreated;
  }
  if (typeof cacheMetrics.inputTokens === 'number') {
    result.inputTokens = cacheMetrics.inputTokens;
  }
  if (typeof cacheMetrics.outputTokens === 'number') {
    result.outputTokens = cacheMetrics.outputTokens;
  }
  if (typeof cacheMetrics.ttft === 'number') {
    result.ttft = cacheMetrics.ttft;
  }
  
  return result;
}