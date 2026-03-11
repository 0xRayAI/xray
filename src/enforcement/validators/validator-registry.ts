/**
 * Validator Registry
 *
 * Central registry for all validator instances. Provides lookup by rule ID
 * and category filtering capabilities.
 *
 * @module validators/validator-registry
 * @version 1.0.0
 */

import {
  IValidator,
  IValidatorRegistry,
  RuleCategory,
} from "../types.js";

/**
 * Implementation of the validator registry.
 * Manages validator instances in a Map for O(1) lookup by rule ID.
 *
 * @example
 * ```typescript
 * const registry = new ValidatorRegistry();
 * registry.register(new NoDuplicateCodeValidator());
 * const validator = registry.getValidator('no-duplicate-code');
 * if (validator) {
 *   const result = await validator.validate(context);
 * }
 * ```
 */
export class ValidatorRegistry implements IValidatorRegistry {
  /** Internal map storing validators by rule ID */
  private validators: Map<string, IValidator> = new Map();

  /**
   * Register a validator instance.
   * The validator is keyed by its ruleId property.
   *
   * @param validator - The validator instance to register
   * @throws Error if a validator for this ruleId already exists
   */
  register(validator: IValidator): void {
    if (this.validators.has(validator.ruleId)) {
      throw new Error(
        `Validator for rule '${validator.ruleId}' is already registered`,
      );
    }
    this.validators.set(validator.ruleId, validator);
  }

  /**
   * Get a validator by rule ID.
   *
   * @param ruleId - The rule ID to look up
   * @returns The validator instance or undefined if not found
   */
  getValidator(ruleId: string): IValidator | undefined {
    return this.validators.get(ruleId);
  }

  /**
   * Get all validators for a specific category.
   *
   * @param category - The category to filter by
   * @returns Array of validators in that category
   */
  getValidatorsByCategory(category: RuleCategory): IValidator[] {
    return Array.from(this.validators.values()).filter(
      (validator) => validator.category === category,
    );
  }

  /**
   * Get all registered validators.
   *
   * @returns Array of all registered validators
   */
  getAllValidators(): IValidator[] {
    return Array.from(this.validators.values());
  }

  /**
   * Check if a validator exists for a rule ID.
   *
   * @param ruleId - The rule ID to check
   * @returns True if a validator exists, false otherwise
   */
  hasValidator(ruleId: string): boolean {
    return this.validators.has(ruleId);
  }

  /**
   * Remove a validator from the registry.
   *
   * @param ruleId - The rule ID of the validator to remove
   * @returns True if a validator was removed, false if not found
   */
  unregister(ruleId: string): boolean {
    return this.validators.delete(ruleId);
  }

  /**
   * Clear all validators from the registry.
   */
  clear(): void {
    this.validators.clear();
  }

  /**
   * Get the count of registered validators.
   *
   * @returns Number of registered validators
   */
  getCount(): number {
    return this.validators.size;
  }
}

/**
 * Singleton instance of the validator registry.
 * Use this for global validator management.
 */
export const globalValidatorRegistry = new ValidatorRegistry();
