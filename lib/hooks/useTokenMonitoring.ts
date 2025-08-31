// lib/hooks/useTokenMonitoring.ts

import { useEffect, useRef } from 'react';
import { 
  TokenWarningLevel, 
  getTokenWarningLevel, 
  getTokenWarningMessage 
} from '@/lib/tokenizer';

/**
 * Hook for monitoring token usage and providing screen reader announcements
 * @param tokenCount - Current token count
 * @param enabled - Whether to enable announcements (default: true)
 */
export function useTokenMonitoring(tokenCount: number, enabled: boolean = true) {
  const previousWarningLevel = useRef<TokenWarningLevel>('safe');
  const lastAnnouncementRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    const currentWarningLevel = getTokenWarningLevel(tokenCount);
    const warningMessage = getTokenWarningMessage(tokenCount, currentWarningLevel);

    // Only announce if warning level has changed to a more severe level
    // or if we're in an error state and the message has changed
    const shouldAnnounce = 
      (currentWarningLevel !== previousWarningLevel.current && 
       (currentWarningLevel === 'warning' || currentWarningLevel === 'danger' || currentWarningLevel === 'error')) ||
      (currentWarningLevel === 'error' && warningMessage !== lastAnnouncementRef.current);

    if (shouldAnnounce && warningMessage) {
      // Create a live region element for screen reader announcements
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Token usage warning: ${warningMessage}`;

      document.body.appendChild(announcement);

      // Remove the element after announcement
      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);

      lastAnnouncementRef.current = warningMessage;
    }

    previousWarningLevel.current = currentWarningLevel;
  }, [tokenCount, enabled]);

  return {
    currentWarningLevel: getTokenWarningLevel(tokenCount),
    warningMessage: getTokenWarningMessage(tokenCount, getTokenWarningLevel(tokenCount)),
  };
}