# SchemaScript

**SchemaScript** is a JavaScript-based Domain Specific Language (DSL) designed for defining database schemas with maximum type safety and developer experience. It serves as a high-level abstraction over Drizzle ORM, providing a fluent and declarative API within a secure, sandboxed Rust execution environment.

---

## Design Philosophy

1. **Purest Type Lattice (Secure by Default)**: All fields are required (non-nullable) by default, unless explicitly modified as `.optional()`. This ensures the most restrictive and safest type set from the start.

2. **Declarative**: Describe *what* the data looks like, not *how* to create it.

3. **Fluent**: Use method chaining for a natural, readable syntax.

4. **Type-Safe**: Leverage TypeScript's powerful type system to provide autocomplete and catch errors at compile-time.

5. **Inferred Metadata**: Automatically infer column names from object keys while allowing explicit overrides.

---

## Core API

### Schemas

Schemas are defined using the `Schema` function. It takes a name and a schema definition.

```typescript
import { Schema, value } from "schemascript";

const Users = Schema("users", (prop) => ({
  id: prop.integer().identifier(),
  username: prop.text().unique(),
  email: prop.text().optional(),
  createdAt: prop.integer().default(value.now()),
}));
```

---

### Data Types

SchemaScript provides 4 core primitive data types:

- `integer` - For integer values and timestamps
- `text` - For textual string data
- `real` - For floating-point numbers
- `blob` - For binary data (stored as `Uint8Array`)

---

### Modifiers

All properties support the following modifiers through method chaining:

- `.identifier()`: Marks the column as a primary key
- `.optional()`: Allows the column to be null (escape hatch from the pure type lattice)
- `.unique()`: Adds a unique constraint
- `.default(value)`: Sets a default value for the column

**Note**: All fields are **required** (non-nullable) by default. Use `.optional()` to allow null values.

---

### Relations

Define foreign key relationships using a fluent API.

```typescript
const Posts = Table("posts", (prop) => ({
  id: prop.integer().identifier(),
  authorId: prop.integer().references(() => Users.id),
}));
```

---

### Enums

First-class support for enums.

```typescript
const Profile = Schema("profiles", (prop) => ({
  role: prop.enum("role", { options: ["admin", "user", "guest"] }).default("guest"),
}));
```

---

### Custom Types

Easily extend SchemaScript with custom database types.

```typescript
const Custom = Schema("custom", (prop) => ({
  data: prop.custom<MyType>("my_custom_type"),
}));
```

---

## Integration with Artefact Core

SchemaScript is built directly on top of the Artefact `Property` and `Schema` abstractions. It acts as a convenient entry point that bundles the various builders into a single, cohesive interface.

### Architecture Layer Overview

**1. Property Layer** (`property.ts`)

- Immutable builder pattern for defining field properties
- Type-safe modifiers (`.optional()`, `.default()`, `.unique()`)
- Each modifier returns a new instance, ensuring immutability

**2. Field Builder Layer** (`field.ts`)

- Provides the factory methods for creating typed properties
- Maps high-level field types to Property instances with correct metadata

**3. Table Layer** (`table.ts`)

- Converts schema definitions into Drizzle ORM table structures
- Handles the translation from Property objects to Drizzle column builders
- Applies all modifiers (primary key, not null, unique, default) correctly

---

## Architecture

The project is architected in three main domains, ensuring a hard boundary between high-level definition and low-level execution.

### 1. SchemaScript DSL (JavaScript)

A type-safe, fluent API for defining database schemas with SQLite primitives (`integer`, `real`, `text`, `blob`).

- **Immutability**: Every property modifier (`.optional()`, `.default()`, `.unique()`) returns a new instance
- **Secure by Default**: All fields are non-nullable unless explicitly marked `.optional()`
- **Drizzle Integration**: Definitions are automatically translated into `drizzle-orm` compatible column builders
- **Inferred Metadata**: Column names are automatically inferred from object keys

### 2. High-Performance Runtime (Rust Host)

A secure execution environment leveraging **WasmEdge** and **smol** for ultra-fast, lightweight sandboxing.

- **Sandbox**: Powered by **WasmEdge** (v0.13), optimised for edge computing cold-starts.
- **Async Strategy**: Uses the **smol** runtime for a minimal binary footprint and high concurrency.
- **Guest Engine**: Embedded **rquickjs** (QuickJS) provides a familiar JavaScript execution environment inside the WASM sandbox.
- **Native Backend**: **Rusqlite** handles queries with native hardware acceleration and WAL-mode optimisations.

### 3. The SYSCALL Bridge

Uses `drizzle-orm/sqlite-proxy` to capture SQL queries and serialise them across the Host-Guest boundary.

---

## 🛰️ System Architecture

```mermaid
graph TB
    subgraph "TypeScript Layer (Guest)"
        A[Application Code] --> B[Schema Builder DSL]
        B --> C[Drizzle ORM]
        C --> D[SQLite Proxy Driver]
    end
    
    subgraph "Host-Guest Boundary"
        D -->|JSON Payload| E[__host_sqlite_call]
        E -->|SYSCALL| F[Rust Host Environment]
    end
    
    subgraph "Rust Host (WasmEdge + smol)"
        F --> G[Database Wrapper]
        G --> H[Statement Cache]
        H --> I[Rusqlite Engine]
        I --> J[(SQLite DB)]
    end
```

## Host-Guest Communication Protocol

Communication follows a strict serialisation protocol to ensure safety and type fidelity across the Wasm boundary.

```mermaid
sequenceDiagram
    participant JS as JavaScript Guest
    participant Bridge as Runtime Driver
    participant Host as Rust Host (WasmEdge)
    participant DB as SQLite
    
    JS->>Bridge: db.select().from(users)
    Bridge->>Bridge: Serialise {sql, params, method}
    Bridge->>Host: host_db_query(ptr, len)
    Host->>Host: Read Guest Memory
    Host->>DB: Execute Native SQL
    DB-->>Host: Result Set
    Host->>Host: Serialise Result (JSON)
    Host-->>Bridge: return result_len
    Bridge->>Host: host_copy_result(ptr, max)
    Host->>Bridge: Write Result to Guest Memory
    Bridge-->>JS: Typed Rows
```

---

## Tech Stack

- **Runtime**: [WasmEdge](https://wasmedge.org/) (High-performance WASM)
- **Executor**: [smol](https://github.com/smol-rs/smol) (Lightweight async)
- **JS Engine**: [rquickjs](https://github.com/DelSkayn/rquickjs) (Rust bindings for QuickJS)
- **Database**: [Rusqlite](https://github.com/rusqlite/rusqlite) (Native SQLite)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (TypeScript Type-Safety)

---

## Prerequisites

To build and run the native host, you must have the **WasmEdge** development libraries installed on your system.

**macOS**:

```bash
brew install wasmedge
```

**Linux**:

```bash
curl -sSf https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh | bash
```

---

## Getting Started

### 1. Define Your Schema

Use the fluent API to define type-safe database tables:

```typescript
import { Schema, type SchemaBuilder, Table } from './data/core';

const users: SchemaBuilder = (prop) => ({
  id: prop.integer('id').identifier(),
  name: prop.text('name'),
  avatar: prop.blob('avatar').optional(),
});

const usersSchema = Schema('users', users);
const usersTable = Table('users', users);
```

**Key Points**:

- All fields are **required** (non-nullable) by default
- Use `.optional()` to allow null values
- Column names are automatically inferred from object keys
- `.identifier()` marks a field as the primary key

### 2. Build the Runtime

```bash
cd runtime
cargo build --release
```

### 3. Run the Secure Host

The host provides a secure environment where user logic is isolated from the file system, only accessing data via designated SYSCALLs.

---

## Security & Performance

- **Memory Isolation**: Guest code cannot access host memory directly.
- **Resource Constraints**: WasmEdge allow us to limit CPU and Memory usage per context.
- **Native SQL**: Prepared statements are cached natively in Rust, avoiding repeated parsing overhead.
- **WAL Mode**: Enabled by default for high-concurrency write workloads.
