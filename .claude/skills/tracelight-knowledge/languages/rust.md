# Rust Analysis Patterns

## Extractable Items

| Type | Keyword | Example |
|------|---------|---------|
| function | `fn`, `pub fn` | `pub fn calculate_damage(...)` |
| struct | `struct`, `pub struct` | `pub struct Unit { ... }` |
| enum | `enum`, `pub enum` | `pub enum BattleState { ... }` |
| trait | `trait`, `pub trait` | `pub trait Attackable { ... }` |
| impl | `impl` | `impl Unit { ... }` |
| const | `const`, `pub const` | `pub const MAX_HP: i32 = 100;` |

## Visibility Mapping

| Rust | Output |
|------|--------|
| `pub` | `"public"` |
| `pub(crate)` | `"crate"` |
| `pub(super)` | `"super"` |
| (none) | `"private"` |

## Test Detection

```rust
// Pattern 1: #[test] attribute
#[test]
fn test_unit_creation() { ... }

// Pattern 2: #[cfg(test)] module
#[cfg(test)]
mod tests {
    #[test]
    fn test_example() { ... }
}
```

## Call Analysis

### Direct Calls

```rust
fn foo() {
    bar();           // -> calls: ["bar"]
    self.baz();      // -> calls: ["Self::baz"]
    Unit::new();     // -> calls: ["Unit::new"]
}
```

### Trait Method Calls

```rust
fn process(unit: &impl Attackable) {
    unit.attack();   // -> calls: ["Attackable::attack"]
}
```

## ID Generation

Format: `{module_path}::{item_name}`

Examples:
- `domain::entity::unit::Unit`
- `domain::entity::unit::Unit::new`
- `domain::service::battle::calculate_damage`

## Module Structure

```
src/lib/domain/
├── mod.rs           -> domain
├── entity/
│   ├── mod.rs       -> domain::entity
│   └── unit.rs      -> domain::entity::unit
└── service/
    └── battle.rs    -> domain::service::battle
```
