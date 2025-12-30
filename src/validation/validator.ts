/**
 * tracelight 検証レイヤー
 */
import type { CodeItem } from '../types/schema';

/** 検証結果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'schema' | 'uniqueness' | 'reference';
  itemId?: string;
  message: string;
  details?: unknown;
}

export interface ValidationWarning {
  type: 'orphan' | 'circular' | 'missing_test';
  itemId?: string;
  message: string;
}

/**
 * ItemId のフォーマットを検証
 */
export function validateItemId(id: string): boolean {
  // フォーマット: "path/to/file.rs::ItemName::type"
  const pattern = /^.+::.+::(struct|enum|trait|fn|impl|mod|const|type|method)$/;
  return pattern.test(id);
}

/**
 * CodeItem のスキーマを検証
 */
export function validateCodeItem(item: unknown): item is CodeItem {
  if (typeof item !== 'object' || item === null) return false;

  const obj = item as Record<string, unknown>;

  // 必須フィールドの検証
  if (typeof obj.id !== 'string' || !validateItemId(obj.id)) return false;
  if (typeof obj.type !== 'string') return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.line_start !== 'number') return false;
  if (typeof obj.signature !== 'string') return false;
  // summary, responsibility はセマンティック情報でオプショナル

  // オプションフィールドの検証
  if (obj.line_end !== undefined && typeof obj.line_end !== 'number') return false;
  if (obj.summary !== undefined && typeof obj.summary !== 'string') return false;
  if (obj.responsibility !== undefined && typeof obj.responsibility !== 'string') return false;
  if (obj.visibility !== undefined) {
    const validVisibilities = ['pub', 'pub(crate)', 'pub(super)', 'private'];
    if (!validVisibilities.includes(obj.visibility as string)) return false;
  }
  if (obj.tested_by !== undefined && !Array.isArray(obj.tested_by)) return false;
  if (obj.depends_on !== undefined && !Array.isArray(obj.depends_on)) return false;

  return true;
}

/**
 * ID の一意性を検証
 */
export function validateUniqueness(items: CodeItem[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      errors.push({
        type: 'uniqueness',
        itemId: item.id,
        message: `Duplicate item ID found: ${item.id}`,
      });
    }
    seenIds.add(item.id);
  }

  return errors;
}

/**
 * 参照整合性を検証
 */
export function validateReferences(
  items: CodeItem[],
  allKnownIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const item of items) {
    // tested_by の参照チェック
    if (item.tested_by) {
      for (const testId of item.tested_by) {
        if (!allKnownIds.has(testId)) {
          errors.push({
            type: 'reference',
            itemId: item.id,
            message: `Referenced test not found: ${testId}`,
          });
        }
      }
    }

    // depends_on の参照チェック
    if (item.depends_on) {
      for (const depId of item.depends_on) {
        if (!allKnownIds.has(depId)) {
          errors.push({
            type: 'reference',
            itemId: item.id,
            message: `Referenced dependency not found: ${depId}`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * SplitFile 全体を検証
 */
export function validateSplitFile(splitFile: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof splitFile !== 'object' || splitFile === null) {
    errors.push({
      type: 'schema',
      message: 'SplitFile must be an object',
    });
    return { valid: false, errors, warnings };
  }

  const obj = splitFile as Record<string, unknown>;

  // 必須フィールドの検証
  if (typeof obj.source_dir !== 'string') {
    errors.push({ type: 'schema', message: 'source_dir is required' });
  }
  if (typeof obj.generated_at !== 'string') {
    errors.push({ type: 'schema', message: 'generated_at is required' });
  }
  if (!Array.isArray(obj.files)) {
    errors.push({ type: 'schema', message: 'files must be an array' });
    return { valid: false, errors, warnings };
  }

  // 各ファイル内のアイテムを検証
  const allItems: CodeItem[] = [];
  for (const file of obj.files as Array<Record<string, unknown>>) {
    if (!Array.isArray(file.items)) continue;

    for (const item of file.items) {
      if (!validateCodeItem(item)) {
        errors.push({
          type: 'schema',
          itemId: (item as Record<string, unknown>).id as string,
          message: 'Invalid CodeItem schema',
          details: item,
        });
      } else {
        allItems.push(item as CodeItem);
      }
    }
  }

  // 一意性チェック
  errors.push(...validateUniqueness(allItems));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * IndexFile を検証
 */
export function validateIndexFile(indexFile: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof indexFile !== 'object' || indexFile === null) {
    errors.push({
      type: 'schema',
      message: 'IndexFile must be an object',
    });
    return { valid: false, errors, warnings };
  }

  const obj = indexFile as Record<string, unknown>;

  // 必須フィールドの検証
  const requiredFields = ['schema_version', 'min_reader_version', 'generated_at', 'generator_version', 'root_path', 'config', 'files', 'statistics'];
  for (const field of requiredFields) {
    if (obj[field] === undefined) {
      errors.push({ type: 'schema', message: `${field} is required` });
    }
  }

  // バージョン形式の検証
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (typeof obj.schema_version === 'string' && !versionPattern.test(obj.schema_version)) {
    errors.push({ type: 'schema', message: 'schema_version must be in format X.Y.Z' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
