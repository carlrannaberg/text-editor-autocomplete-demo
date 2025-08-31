'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAccessibility } from '@/lib/hooks/useAccessibility';

interface AccessibleKeywordsInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  maxKeywords?: number;
  maxLength?: number;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Fully accessible keywords input component with WCAG 2.1 AA compliance
 * Features:
 * - Full keyboard navigation (Arrow keys, Home, End, Delete)
 * - Screen reader announcements for all actions
 * - ARIA labels and descriptions
 * - Focus management and visual indicators
 * - High contrast mode support
 * - Minimum 44px target size for touch accessibility
 */
export const AccessibleKeywordsInput: React.FC<AccessibleKeywordsInputProps> = ({
  keywords,
  onChange,
  maxKeywords = 10,
  maxLength = 32,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}) => {
  const [inputValue, setInputValue] = useState('');
  const [focusedKeywordIndex, setFocusedKeywordIndex] = useState<number>(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const keywordRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusTimeoutRef = useRef<NodeJS.Timeout>();
  const blurTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { 
    announceStatus, 
    announceAlert,
    generateUniqueId,
    preferences,
    getHighContrastStyles,
    enhanceTargetSize
  } = useAccessibility();
  
  // Generate unique IDs for accessibility
  const inputId = useRef(generateUniqueId('keywords-input')).current;
  const helpId = useRef(generateUniqueId('keywords-help')).current;
  const statusId = useRef(generateUniqueId('keywords-status')).current;
  
  // Enhance target sizes for touch accessibility
  useEffect(() => {
    keywordRefs.current.forEach(ref => {
      if (ref) {
        enhanceTargetSize(ref);
      }
    });
  }, [keywords, enhanceTargetSize]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const addKeyword = useCallback(() => {
    const keyword = inputValue.trim();
    if (!keyword) return;
    
    if (keyword.length > maxLength) {
      announceAlert(`Keyword too long. Maximum ${maxLength} characters allowed.`);
      return;
    }
    
    if (keywords.length >= maxKeywords) {
      announceAlert(`Maximum ${maxKeywords} keywords allowed.`);
      return;
    }
    
    if (keywords.includes(keyword)) {
      announceAlert(`Keyword "${keyword}" already exists.`);
      return;
    }
    
    const newKeywords = [...keywords, keyword];
    onChange(newKeywords);
    setInputValue('');
    announceStatus(`Added keyword "${keyword}". ${newKeywords.length} of ${maxKeywords} keywords.`);
  }, [inputValue, keywords, maxKeywords, maxLength, onChange, announceAlert, announceStatus]);

  const removeKeyword = useCallback((index: number) => {
    if (index < 0 || index >= keywords.length) return;
    
    const removedKeyword = keywords[index];
    const newKeywords = keywords.filter((_, i) => i !== index);
    onChange(newKeywords);
    
    announceStatus(`Removed keyword "${removedKeyword}". ${newKeywords.length} of ${maxKeywords} keywords remaining.`);
    
    // Focus management after removal
    if (focusedKeywordIndex >= newKeywords.length) {
      setFocusedKeywordIndex(Math.max(0, newKeywords.length - 1));
    }
    
    // Focus next available keyword or input
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      const nextIndex = Math.min(index, newKeywords.length - 1);
      if (nextIndex >= 0 && keywordRefs.current[nextIndex]) {
        keywordRefs.current[nextIndex]?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 50);
  }, [keywords, onChange, maxKeywords, focusedKeywordIndex, announceStatus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
      case ',':
      case ' ':
        e.preventDefault();
        addKeyword();
        break;
        
      case 'Backspace':
        if (!inputValue && keywords.length > 0) {
          e.preventDefault();
          removeKeyword(keywords.length - 1);
        }
        break;
        
      case 'ArrowLeft':
        if (!inputValue && keywords.length > 0) {
          e.preventDefault();
          const lastIndex = keywords.length - 1;
          setFocusedKeywordIndex(lastIndex);
          keywordRefs.current[lastIndex]?.focus();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        inputRef.current?.blur();
        break;
    }
  }, [inputValue, keywords.length, addKeyword, removeKeyword]);

  const handleKeywordKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        removeKeyword(index);
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        if (index < keywords.length - 1) {
          const nextIndex = index + 1;
          setFocusedKeywordIndex(nextIndex);
          keywordRefs.current[nextIndex]?.focus();
        } else {
          setFocusedKeywordIndex(-1);
          inputRef.current?.focus();
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          const prevIndex = index - 1;
          setFocusedKeywordIndex(prevIndex);
          keywordRefs.current[prevIndex]?.focus();
        }
        break;
        
      case 'Home':
        e.preventDefault();
        if (keywords.length > 0) {
          setFocusedKeywordIndex(0);
          keywordRefs.current[0]?.focus();
        }
        break;
        
      case 'End':
        e.preventDefault();
        setFocusedKeywordIndex(-1);
        inputRef.current?.focus();
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        removeKeyword(index);
        break;
    }
  }, [keywords.length, removeKeyword]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    setFocusedKeywordIndex(-1);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    // Add keyword on blur if there's content
    if (inputValue.trim()) {
      addKeyword();
    }
  }, [inputValue, addKeyword]);

  const handleKeywordFocus = useCallback((index: number) => {
    setFocusedKeywordIndex(index);
    setIsInputFocused(false);
  }, []);

  const handleKeywordBlur = useCallback(() => {
    // Small delay to allow focus to move to another keyword
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setFocusedKeywordIndex(-1);
      }
    }, 50);
  }, []);

  // High contrast styles
  const highContrastStyles = getHighContrastStyles();
  const canAddMore = keywords.length < maxKeywords;
  
  return (
    <div>
      <label 
        htmlFor={inputId} 
        className="block text-sm font-medium text-gray-700 mb-2"
        id={`${inputId}-label`}
      >
        Keywords ({keywords.length}/{maxKeywords})
        {keywords.length >= maxKeywords && (
          <span className="text-red-600 ml-1" aria-label="Maximum keywords reached">
            (Maximum reached)
          </span>
        )}
      </label>
      
      {/* Screen reader status */}
      <div 
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {keywords.length} of {maxKeywords} keywords. 
        {canAddMore ? 'You can add more keywords.' : 'Maximum keywords reached.'}
      </div>
      
      <div 
        ref={containerRef}
        className={`
          flex flex-wrap gap-2 p-3 border-2 rounded-md min-h-[3rem] transition-all
          ${isInputFocused || focusedKeywordIndex >= 0 
            ? 'border-blue-500 ring-2 ring-blue-500/20' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}
        `}
        style={highContrastStyles}
        role="group"
        aria-labelledby={`${inputId}-label`}
        aria-describedby={`${helpId} ${statusId} ${ariaDescribedby || ''}`.trim()}
      >
        {keywords.map((keyword, index) => (
          <button
            key={`keyword-${index}-${keyword}`}
            ref={el => { keywordRefs.current[index] = el; }}
            onClick={() => removeKeyword(index)}
            onKeyDown={(e) => handleKeywordKeyDown(e, index)}
            onFocus={() => handleKeywordFocus(index)}
            onBlur={handleKeywordBlur}
            disabled={disabled}
            className={`
              inline-flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-800 
              text-sm rounded-md transition-all min-h-[44px] min-w-[44px]
              hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
              focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed
              ${focusedKeywordIndex === index ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
            `}
            style={highContrastStyles}
            aria-label={`Remove keyword: ${keyword}. Press Delete, Backspace, Enter, or Space to remove. Use arrow keys to navigate.`}
            aria-describedby={helpId}
            type="button"
          >
            <span aria-hidden="true">{keyword}</span>
            <span 
              className="text-blue-600 hover:text-blue-800 text-base leading-none"
              aria-hidden="true"
            >
              ×
            </span>
          </button>
        ))}
        
        {canAddMore && !disabled && (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={keywords.length === 0 ? "Enter keywords..." : ""}
            maxLength={maxLength}
            disabled={disabled}
            className={`
              flex-1 min-w-[120px] outline-none bg-transparent text-sm py-2 px-1
              placeholder:text-gray-400 disabled:cursor-not-allowed
            `}
            style={highContrastStyles}
            aria-label={ariaLabel || `Add keywords. ${keywords.length} of ${maxKeywords} keywords added.`}
            aria-describedby={`${helpId} ${statusId} ${ariaDescribedby || ''}`.trim()}
            aria-invalid={inputValue.length > maxLength}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        )}
      </div>
      
      {/* Help text */}
      <div id={helpId} className="text-xs text-gray-500 mt-2">
        <span className="block">
          Press Enter, comma, or space to add keywords (max {maxLength} chars each).
        </span>
        <span className="block mt-1">
          Use arrow keys to navigate between keywords. Press Delete, Backspace, Enter, or Space to remove keywords.
        </span>
        {!canAddMore && (
          <span className="block mt-1 text-amber-600">
            Maximum number of keywords reached ({maxKeywords}).
          </span>
        )}
      </div>
      
      {/* Reduced motion support */}
      {preferences.prefersReducedMotion && (
        <style jsx>{`
          .transition-all {
            transition: none !important;
          }
        `}</style>
      )}
    </div>
  );
};