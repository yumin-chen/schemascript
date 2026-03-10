# SchemaScript

**SchemaScript** is a data-centric ORM for declaratively defining database schemas with maximum type safety and constraint enforcement. Built as an abstraction over backends like Drizzle ORM, it offers a fluent API running securely within a sandboxed Rust runtime.

---

## Features

- TypeScript (interface) `.ts` code generation.
- JSON schema `.json` code generation.
- JavaScript runtime validator `.js` code generation.
- SQL table creation & migration `.sql` code generation.

---

## Core API

### Schema Definition & Table Generation

Schemas are defined using the `Schema` function, which creates a type-safe schema definition that can be used for type generation and validation:

Tables are created using the `Table` function, which converts your schema definition into your targeted ORM table instance ready for database operations:

```typescript
import type { SchemaBuilder } from "@artefacto/schemascript";
import { Schema, Table, value } from "@artefacto/schemascript";

const User: SchemaBuilder = (prop) => ({
	id: prop.integer().identifier(),
	username: prop.text().unique(),
	email: prop.text().optional(),
	created_at: prop.datetime().default(value.now),
});
const UserSchema = Schema("User", User);
const UserTable = Table("users", User);

export { User, UserSchema, UserTable };
```

---

### Data Types

SchemaScript provides 8 core primitive data types:

| SchemaScript Type | Description / Usage                | JS Type          | SQLite Type        |
| :---------------- | :--------------------------------- | :--------------- | :----------------- |
| `integer`         | Whole number integer values        | `bigint`         | `INTEGER`          |
| `real`            | Floating-point real numbers        | `number`         | `REAL`             |
| `text`            | Textual string data                | `string`         | `TEXT`             |
| `boolean`         | True or false values               | `boolean`        | `INTEGER` (0 or 1) |
| `blob`            | Binary data                        | `Uint8Array`     | `BLOB`             |
| `datetime`        | Dates and times                    | `Date`           | `INTEGER`          |
| `node`            | Structured objects and documents   | `object`         | `BLOB` (JSON)      |
| `enum`            | Performant, type-safe enumerations | `string` (union) | `INTEGER`          |

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
import type { SchemaBuilder } from "@artefacto/schemascript";
import { Schema, Table } from "@artefacto/schemascript";
import { UserTable } from "./user";

const Post: SchemaBuilder = (prop) => ({
	id: prop.integer().identifier(),
	author_id: prop
		.integer()
		.references(() => UserTable.id, { onDelete: "cascade" }),
	title: prop.text(),
});

const PostSchema = Schema("Post", Post);
const PostTable = Table("posts", Post);

export { Post, PostSchema, PostTable };
```

---

### Enums

First-class support for enums. Enums are defined using an object mapping keys to values or an array of strings. Column names are inferred from the object key.

```typescript
const Profile = Schema("Profile", (prop) => ({
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

---

# License

This project is dedicated to the public domain under the [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) Universal license.

---
