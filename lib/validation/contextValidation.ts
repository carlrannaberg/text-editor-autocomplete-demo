// lib/validation/contextValidation.ts

import React from 'react';
import { CompletionContextState } from '@/lib/types';
import { getContextTokenCount, MAX_TOKEN_LIMIT } from '@/lib/tokenizer';

/**
 * Validation rule interface
 */
export interface ValidationRule {
  field: keyof CompletionContextState;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationRule[];
  warnings: ValidationRule[];
  info: ValidationRule[];
}

/**
 * Field-specific validation options
 */
export interface FieldValidationOptions {
  /** Maximum length for text fields */
  maxLength?: number;
  /** Minimum length for text fields */
  minLength?: number;
  /** Required field */
  required?: boolean;
  /** Custom validation function */
  customValidator?: (value: unknown) => boolean;
  /** Custom error message */
  customMessage?: string;
}

/**
 * Comprehensive context validation system
 */
class ContextValidator {
  private static readonly FIELD_LIMITS = {
    contextText: { minLength: 0 } // No character limit - using token-based validation instead
  };

  /**
   * Validate entire context state
   */
  static validateContext(context: CompletionContextState): ValidationResult {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];
    const info: ValidationRule[] = [];

    // Validate individual fields
    errors.push(...this.validateContextText(context.contextText));

    // Validate token limits
    const tokenValidation = this.validateTokenLimits(context);
    errors.push(...tokenValidation.errors);
    warnings.push(...tokenValidation.warnings);
    info.push(...tokenValidation.info);

    // Content safety checks
    const safetyValidation = this.validateContentSafety(context);
    errors.push(...safetyValidation.errors);
    warnings.push(...safetyValidation.warnings);

    // Duplicate detection
    const duplicateValidation = this.validateDuplicates(context);
    warnings.push(...duplicateValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Validate specific field
   */
  static validateField(
    field: keyof CompletionContextState,
    value: unknown,
    options: FieldValidationOptions = {}
  ): ValidationRule[] {
    const errors: ValidationRule[] = [];

    // Required field validation
    if (options.required && !value) {
      errors.push({
        field,
        rule: 'required',
        message: options.customMessage || `${field} is required`,
        severity: 'error'
      });
      return errors; // Early return for required fields
    }

    // Skip validation for empty optional fields
    if (!value && !options.required) {
      return errors;
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (options.maxLength && value.length > options.maxLength) {
        errors.push({
          field,
          rule: 'maxLength',
          message: `${field} must not exceed ${options.maxLength} characters`,
          severity: 'error'
        });
      }

      if (options.minLength && value.length < options.minLength) {
        errors.push({
          field,
          rule: 'minLength',
          message: `${field} must be at least ${options.minLength} characters`,
          severity: 'error'
        });
      }
    }

    // Custom validation
    if (options.customValidator && !options.customValidator(value)) {
      errors.push({
        field,
        rule: 'custom',
        message: options.customMessage || `${field} validation failed`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Check if context can be submitted (no errors, token limit OK)
   */
  static canSubmitContext(context: CompletionContextState): boolean {
    const validation = this.validateContext(context);
    const tokenCount = getContextTokenCount(context);
    
    return validation.isValid && tokenCount <= MAX_TOKEN_LIMIT;
  }

  /**
   * Get validation summary for display
   */
  static getValidationSummary(validation: ValidationResult): string {
    if (validation.isValid && validation.warnings.length === 0) {
      return 'All fields are valid';
    }

    const parts: string[] = [];
    
    if (validation.errors.length > 0) {
      parts.push(`${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}`);
    }
    
    if (validation.warnings.length > 0) {
      parts.push(`${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  /**
   * Validate context text field
   */
  private static validateContextText(contextText?: string): ValidationRule[] {
    if (!contextText) return [];

    return [];
  }


  /**
   * Validate token limits with progressive warnings
   */
  private static validateTokenLimits(context: CompletionContextState) {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];
    const info: ValidationRule[] = [];

    const tokenCount = getContextTokenCount(context);

    if (tokenCount > MAX_TOKEN_LIMIT) {
      errors.push({
        field: 'contextText',
        rule: 'token_limit_exceeded',
        message: `Context exceeds token limit (${tokenCount.toLocaleString()} / ${MAX_TOKEN_LIMIT.toLocaleString()} tokens)`,
        severity: 'error'
      });
    } else if (tokenCount > MAX_TOKEN_LIMIT * 0.9) { // 90% of limit
      warnings.push({
        field: 'contextText',
        rule: 'token_limit_warning',
        message: `Approaching token limit (${tokenCount.toLocaleString()} / ${MAX_TOKEN_LIMIT.toLocaleString()} tokens)`,
        severity: 'warning'
      });
    } else if (tokenCount > MAX_TOKEN_LIMIT * 0.75) { // 75% of limit
      info.push({
        field: 'contextText',
        rule: 'token_limit_info',
        message: `Using ${Math.round((tokenCount / MAX_TOKEN_LIMIT) * 100)}% of token limit`,
        severity: 'info'
      });
    }

    return { errors, warnings, info };
  }

  /**
   * Content safety validation
   */
  private static validateContentSafety(context: CompletionContextState) {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];

    // Check for potentially problematic content patterns
    const sensitivePatterns = [
      /\b(password|secret|token|key)\b/i,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card-like patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email patterns
    ];

    const checkContent = (text: string, field: keyof CompletionContextState) => {
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(text)) {
          warnings.push({
            field,
            rule: 'sensitive_content',
            message: `${field} may contain sensitive information`,
            severity: 'warning'
          });
        }
      });
    };

    if (context.contextText) {
      checkContent(context.contextText, 'contextText');
    }

    return { errors, warnings };
  }

  /**
   * Duplicate detection
   */
  private static validateDuplicates(context: CompletionContextState) {
    const warnings: ValidationRule[] = [];
    return { warnings };
  }
}

/**
 * Real-time validation hook for form fields
 */
export function useFieldValidation<T>(
  value: T,
  field: keyof CompletionContextState,
  options: FieldValidationOptions = {}
) {
  const errors = ContextValidator.validateField(field, value, options);
  const hasErrors = errors.length > 0;
  const errorMessage = errors.length > 0 ? errors[0]?.message || null : null;

  return {
    hasErrors,
    errors,
    errorMessage,
    isValid: !hasErrors
  };
}

/**
 * Debounced validation hook
 */
export function useDebouncedValidation(
  context: CompletionContextState,
  debounceMs: number = 300
) {
  const [validation, setValidation] = React.useState<ValidationResult>(() =>
    ContextValidator.validateContext(context)
  );
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    setIsValidating(true);
    const timer = setTimeout(() => {
      const result = ContextValidator.validateContext(context);
      setValidation(result);
      setIsValidating(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [context, debounceMs]);

  return {
    validation,
    isValidating,
    canSubmit: ContextValidator.canSubmitContext(context)
  };
}

export { ContextValidator };