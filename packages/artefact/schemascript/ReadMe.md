# SchemaScript

**SchemaScript** is a JavaScript-based Data Schema Domain Specific Language (DSL) and Object-Relational Mapping (ORM) library for defining database schemas delaratively with maximum type safety, constraint enforcement and developer experience. It serves as a high-level abstraction over various backends, such as Drizzle ORM, providing a fluent and higher-level declarative API within a secure, sandboxed Rust runtime execution environment.

---

## Design Philosophy

1. **Secure by Default**: All fields are required (non-nullable) by default, unless explicitly modified as `.optional()`. This ensures the most restrictive and safest type set *(purest type lattice)* from the start.

2. **Declarative**: Describe *what* the data looks like, not *how* to create it.

3. **Fluent**: Use method chaining for a natural, readable syntax.

4. **Type-Safe**: Leverage TypeScript's powerful type system to provide autocomplete and catch errors at compile-time.

5. **Inferred Naming**: Column names are strictly inferred from object keys, reducing redundancy and ensuring a single source of truth for schema structure.

---

## Core API

### Schemas and Tables

Schemas are defined using the `Schema` function. It takes a name and a schema definition.

Tables are generated from schema definitions via the `Table` function. It takes the same SchemaBuilder and returns a Drizzle ORM table instance directly.

```typescript
import type { SchemaBuilder } from "@artefact/schemascript";
import { Schema, Table, value } from "@artefact/schemascript";

const User: SchemaBuilder = (prop) => ({
  id: prop.integer().identifier(),
  username: prop.text().unique(),
  email: prop.text().optional(),
  created_at: prop.timestamp().default(value.now),
})
const UserSchema = Schema("User", User);
const UserTable = Table("User", User);

export { User, UserSchema, UserTable }
```

---

### Data Types

SchemaScript provides 8 core primitive data types:

| SchemaScript Type | Description / Usage | JS Type | SQLite Type |
| :--- | :--- | :--- | :--- |
| `integer` | Whole number integer values | `bigint` | `INTEGER` |
| `real` | Floating-point real numbers | `number` | `REAL` |
| `text` | Textual string data | `string` | `TEXT` |
| `boolean` | True or false values | `boolean` | `INTEGER` (0 or 1) |
| `blob` | Binary data | `Uint8Array` | `BLOB` |
| `timestamp` | Dates and times | `Date` | `INTEGER` |
| `node` | Structured objects and documents | `object` | `BLOB` (JSON) |
| `enum` | Performant, type-safe enumerations | `string` (union) | `INTEGER` |

---

### Modifiers

All properties support the following modifiers through method chaining:

- `.identifier()`: Marks the column as a primary key.
- `.optional()`: Allows the column to be null.
- `.unique()`: Adds a unique constraint (mapped to a unique index in SQLite).
- `.default(value)`: Sets a default value. Supports literals and SQL expressions like `value.now`.
- `.references(ref, actions?)`: Creates a foreign key constraint.

**Note**: All fields are **required** (non-nullable) by default. Use `.optional()` to allow null values.

---

### Relations

SchemaScript allows you to define database relationships between tables using the `.references()` modifier.

#### One-to-Many Relationship

```typescript
import { Schema, Table } from "@artefact/schemascript";

const User = Table("users", (prop) => ({
  id: prop.integer().identifier(),
}));

const Post = Table("posts", (prop) => ({
  id: prop.integer().identifier(),
  author_id: prop.integer().references(() => User.id, { onDelete: 'cascade' }),
  title: prop.text(),
}));
```

---

### Enums

First-class support for enums. Enums are defined using an object mapping keys to values or an array of strings. Column names are inferred from the object key.

```typescript
const Profile = Schema("profiles", (prop) => ({
  role: prop.enum({ options: ["admin", "user", "guest"] }).default("guest"),
  status: prop.enum({ options: { ACTIVE: 1, INACTIVE: 0 } }).default("ACTIVE"),
}));
```

---

### TypeScript Generation

SchemaScript can generate standard TypeScript interfaces from your schema definitions.

```typescript
const userInterface = UserSchema.toTypeScriptInterface();
/*
interface User {
  id: bigint;
  username: string;
  email: string | null;
  created_at: Date;
}
*/
```

---

## Architecture

The project is architected in three main domains, ensuring a hard boundary between high-level definition and low-level execution.

### 1. SchemaScript DSL (JavaScript)

A type-safe, fluent API for defining database schemas with SQLite-optimised primitives.

- **Immutability**: Every property modifier returns a new instance.
- **Strict Naming**: Column names are automatically and strictly inferred from object keys.
- **Drizzle Integration**: Definitions are translated into `drizzle-orm` compatible column builders.

### 2. High-Performance Runtime (Rust Host)

A secure execution environment leveraging **WasmEdge** and **smol** for ultra-fast, lightweight sandboxing.

### 3. The SYSCALL Bridge

Uses `drizzle-orm/sqlite-proxy` to capture SQL queries across the Host-Guest boundary.
