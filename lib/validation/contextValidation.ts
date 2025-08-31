// lib/validation/contextValidation.ts

import React from 'react';
import { CompletionContextState, DocumentType, Language, Tone } from '@/lib/types';
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
    contextText: { minLength: 0 }, // No character limit - using token-based validation instead
    audience: { maxLength: 64, minLength: 0 },
    keywords: { maxCount: 10, maxLength: 32 }
  };

  private static readonly VALID_DOCUMENT_TYPES: DocumentType[] = ['email', 'article', 'note', 'other'];
  private static readonly VALID_LANGUAGES: Language[] = ['en', 'es', 'fr', 'de'];
  private static readonly VALID_TONES: Tone[] = ['neutral', 'formal', 'casual', 'persuasive'];

  /**
   * Validate entire context state
   */
  static validateContext(context: CompletionContextState): ValidationResult {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];
    const info: ValidationRule[] = [];

    // Validate individual fields
    errors.push(...this.validateContextText(context.contextText));
    errors.push(...this.validateDocumentType(context.documentType));
    errors.push(...this.validateLanguage(context.language));
    errors.push(...this.validateTone(context.tone));
    errors.push(...this.validateAudience(context.audience));
    errors.push(...this.validateKeywords(context.keywords));

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
   * Validate document type field
   */
  private static validateDocumentType(documentType?: DocumentType): ValidationRule[] {
    if (!documentType) return [];

    const errors: ValidationRule[] = [];

    if (!this.VALID_DOCUMENT_TYPES.includes(documentType)) {
      errors.push({
        field: 'documentType',
        rule: 'invalid_value',
        message: `Document type must be one of: ${this.VALID_DOCUMENT_TYPES.join(', ')}`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate language field
   */
  private static validateLanguage(language?: Language): ValidationRule[] {
    if (!language) return [];

    const errors: ValidationRule[] = [];

    if (!this.VALID_LANGUAGES.includes(language)) {
      errors.push({
        field: 'language',
        rule: 'invalid_value',
        message: `Language must be one of: ${this.VALID_LANGUAGES.join(', ')}`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate tone field
   */
  private static validateTone(tone?: Tone): ValidationRule[] {
    if (!tone) return [];

    const errors: ValidationRule[] = [];

    if (!this.VALID_TONES.includes(tone)) {
      errors.push({
        field: 'tone',
        rule: 'invalid_value',
        message: `Tone must be one of: ${this.VALID_TONES.join(', ')}`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate audience field
   */
  private static validateAudience(audience?: string): ValidationRule[] {
    if (!audience) return [];

    return this.validateField('audience', audience, {
      maxLength: this.FIELD_LIMITS.audience.maxLength
    });
  }

  /**
   * Validate keywords field
   */
  private static validateKeywords(keywords?: string[]): ValidationRule[] {
    if (!keywords || keywords.length === 0) return [];

    const errors: ValidationRule[] = [];

    // Check array length
    if (keywords.length > this.FIELD_LIMITS.keywords.maxCount) {
      errors.push({
        field: 'keywords',
        rule: 'max_count',
        message: `Maximum ${this.FIELD_LIMITS.keywords.maxCount} keywords allowed`,
        severity: 'error'
      });
    }

    // Check individual keyword length
    keywords.forEach((keyword, index) => {
      if (keyword.length > this.FIELD_LIMITS.keywords.maxLength) {
        errors.push({
          field: 'keywords',
          rule: 'keyword_too_long',
          message: `Keyword ${index + 1} exceeds ${this.FIELD_LIMITS.keywords.maxLength} characters`,
          severity: 'error'
        });
      }

      if (keyword.trim() === '') {
        errors.push({
          field: 'keywords',
          rule: 'empty_keyword',
          message: `Keyword ${index + 1} cannot be empty`,
          severity: 'error'
        });
      }
    });

    return errors;
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

    if (context.audience) {
      checkContent(context.audience, 'audience');
    }

    if (context.keywords) {
      context.keywords.forEach(keyword => {
        checkContent(keyword, 'keywords');
      });
    }

    return { errors, warnings };
  }

  /**
   * Duplicate detection
   */
  private static validateDuplicates(context: CompletionContextState) {
    const warnings: ValidationRule[] = [];

    if (context.keywords && context.keywords.length > 1) {
      const duplicates = context.keywords.filter((keyword, index) => 
        context.keywords?.indexOf(keyword) !== index
      );

      if (duplicates.length > 0) {
        warnings.push({
          field: 'keywords',
          rule: 'duplicate_keywords',
          message: `Duplicate keywords found: ${duplicates.join(', ')}`,
          severity: 'warning'
        });
      }
    }

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