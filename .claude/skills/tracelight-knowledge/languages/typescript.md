# TypeScript Analysis Patterns

## Extractable Items

| Type | Keyword | Example |
|------|---------|---------|
| function | `function`, `export function` | `export function calculateDamage(...)` |
| class | `class`, `export class` | `export class Unit { ... }` |
| interface | `interface`, `export interface` | `export interface Attackable { ... }` |
| type | `type`, `export type` | `export type BattleState = ...` |
| const | `const`, `export const` | `export const MAX_HP = 100;` |
| arrow function | `const x = () =>` | `const calculate = () => { ... }` |

## Visibility Mapping

| TypeScript | Output |
|------------|--------|
| `export` | `"public"` |
| `public` (class member) | `"public"` |
| `protected` | `"protected"` |
| `private`, `#` | `"private"` |
| (none) | `"private"` |

## Test Detection

```typescript
// Pattern 1: describe/it blocks (Jest, Vitest)
describe('Unit', () => {
  it('should create unit', () => { ... });
  test('calculates damage', () => { ... });
});

// Pattern 2: .test.ts, .spec.ts files
// unit.test.ts -> tests for unit.ts
```

## Call Analysis

### Direct Calls

```typescript
function foo() {
  bar();              // -> calls: ["bar"]
  this.baz();         // -> calls: ["this.baz"]
  Unit.create();      // -> calls: ["Unit.create"]
  new Unit();         // -> calls: ["Unit.constructor"]
}
```

### Method Calls

```typescript
class Unit {
  attack() {
    this.calculateDamage();  // -> calls: ["Unit.calculateDamage"]
  }
}
```

## ID Generation

Format: `{file_path}::{item_name}`

Examples:
- `components/Unit::Unit`
- `components/Unit::Unit.attack`
- `services/battle::calculateDamage`

## Module Structure

```
src/
├── components/
│   └── Unit.tsx     -> components/Unit
├── services/
│   └── battle.ts    -> services/battle
└── types/
    └── index.ts     -> types/index
```

## React/JSX Handling

```typescript
// Component detection
export function UnitCard({ unit }: Props) {
  return <div>...</div>;
}

// -> type: "function", subtype: "component"

// Hook detection
export function useUnit(id: string) {
  const [unit, setUnit] = useState<Unit>();
  return unit;
}

// -> type: "function", subtype: "hook"
```
