/**
 * 型情報を保持するレジストリ
 */
export class TypeRegistry {
  // 構造体フィールド: "StructName::field_name" → "FieldType"
  private structFields: Map<string, string> = new Map();

  // 関数/メソッド戻り値: "TypeName::method_name" → "ReturnType"
  private returnTypes: Map<string, string> = new Map();

  /**
   * 構造体フィールドを登録
   */
  registerStructField(structName: string, fieldName: string, fieldType: string): void {
    const key = `${structName}::${fieldName}`;
    this.structFields.set(key, fieldType);
  }

  /**
   * 関数/メソッドの戻り値型を登録
   */
  registerReturnType(typeName: string, methodName: string, returnType: string): void {
    const key = `${typeName}::${methodName}`;
    this.returnTypes.set(key, returnType);
  }

  /**
   * 構造体フィールドの型を取得
   */
  getFieldType(structName: string, fieldName: string): string | null {
    const key = `${structName}::${fieldName}`;
    return this.structFields.get(key) ?? null;
  }

  /**
   * 関数/メソッドの戻り値型を取得
   */
  getReturnType(typeName: string, methodName: string): string | null {
    const key = `${typeName}::${methodName}`;
    return this.returnTypes.get(key) ?? null;
  }

  /**
   * デバッグ出力用: 登録済みの型情報を取得
   */
  toDebugObject(): { structFields: Record<string, string>; returnTypes: Record<string, string> } {
    return {
      structFields: Object.fromEntries(this.structFields),
      returnTypes: Object.fromEntries(this.returnTypes),
    };
  }
}
