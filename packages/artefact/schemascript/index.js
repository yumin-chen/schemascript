// ../core/src/utils/freeze.ts
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

// core/property.ts
class Property {
  _type;
  options;
  constructor(_type, options = {
    isOptional: false
  }) {
    this._type = _type;
    this.options = options;
  }
  getOptions() {
    return { ...this.options };
  }
  setOptions(updates) {
    return new Property(this._type, { ...this.options, ...updates });
  }
  init() {
    return this;
  }
  finalise(name) {
    const finalised = this.setOptions({ name });
    return deepFreeze(finalised);
  }
  enumOptions(enumOptions) {
    return this.setOptions({ enumOptions });
  }
  optional() {
    if (this.isOptional)
      return this;
    return this.setOptions({ isOptional: true });
  }
  unique() {
    if (this.isUnique)
      return this;
    return this.setOptions({ isUnique: true });
  }
  array() {
    if (this.isArray)
      return this;
    if (this.isIdentifier) {
      throw new Error("Identifiers cannot be arrays.");
    }
    return this.setOptions({ isArray: true });
  }
  default(value) {
    return this.setOptions({ defaultValue: value });
  }
  identifier(config) {
    if (this.isIdentifier)
      return this;
    if (this._type === "enum") {
      throw new Error("Enums cannot be identifiers.");
    }
    if (this.isArray) {
      throw new Error("Arrays cannot be identifiers.");
    }
    if (config?.autoIncrement && this._type !== "integer") {
      throw new Error("autoIncrement can only be used with integer fields.");
    }
    return this.setOptions({
      isIdentifier: true,
      autoIncrement: config?.autoIncrement
    });
  }
  references(ref, actions) {
    return this.setOptions({
      references: {
        ref,
        actions
      }
    });
  }
  get type() {
    return this._type;
  }
  get name() {
    return this.options.name;
  }
  get enumConfigs() {
    return this.options.enumOptions;
  }
  get isOptional() {
    return this.options.isOptional;
  }
  get isUnique() {
    return !!this.options.isUnique;
  }
  get isArray() {
    return !!this.options.isArray;
  }
  get isIdentifier() {
    return !!this.options.isIdentifier;
  }
  get isAutoIncrement() {
    return !!this.options.autoIncrement;
  }
  get reference() {
    return this.options.references;
  }
  get hasDefault() {
    return this.options.defaultValue !== undefined;
  }
  get defaultValue() {
    return this.options.defaultValue;
  }
  toString() {
    const name = this.name ?? "unnamed";
    const optional = this.isOptional ? ".optional()" : "";
    const unique = this.isUnique ? ".unique()" : "";
    const array = this.isArray ? ".array()" : "";
    const identifier = this.isIdentifier ? this.isAutoIncrement ? ".identifier({ autoIncrement: true })" : ".identifier()" : "";
    let references = "";
    if (this.reference) {
      const actions = this.reference.actions;
      const actionParts = [];
      if (actions?.onUpdate)
        actionParts.push(`onUpdate: '${actions.onUpdate}'`);
      if (actions?.onDelete)
        actionParts.push(`onDelete: '${actions.onDelete}'`);
      const actionStr = actionParts.length > 0 ? `, { ${actionParts.join(", ")} }` : "";
      references = `.references(...${actionStr})`;
    }
    const defaultVal = this.hasDefault ? `.default(${typeof this.defaultValue === "bigint" ? this.defaultValue.toString() : JSON.stringify(this.defaultValue)})` : "";
    if (this._type === "enum") {
      const config = this.enumConfigs;
      const options = config?.options;
      if (options) {
        if (Array.isArray(options)) {
          const values = options.map((v) => `"${v}"`).join(", ");
          return `enum("${name}",
    {   options:
			[${values}]
	}
   )${optional}${unique}${array}${identifier}${references}${defaultVal}`;
        }
        if (typeof options === "object") {
          const values = Object.entries(options).map(([k, v]) => `				${k}: ${v},`).join(`
`);
          return `enum("${name}",
    {   options:
			{
${values}
			}
		}
   )${optional}${unique}${array}${identifier}${references}${defaultVal}`;
        }
      }
    }
    return `${this._type}("${name}")${optional}${unique}${array}${identifier}${references}${defaultVal}`;
  }
  toTypeScriptType() {
    let typeStr;
    switch (this._type) {
      case "integer":
        typeStr = "bigint";
        break;
      case "real":
        typeStr = "number";
        break;
      case "text":
        typeStr = "string";
        break;
      case "boolean":
        typeStr = "boolean";
        break;
      case "blob":
        typeStr = "Uint8Array";
        break;
      case "timestamp":
        typeStr = "Date";
        break;
      case "node":
        typeStr = "object";
        break;
      case "enum": {
        const config = this.enumConfigs;
        const options = config?.options;
        if (options) {
          if (Array.isArray(options)) {
            typeStr = options.map((v) => `"${v}"`).join(" | ");
          } else {
            typeStr = Object.keys(options).map((v) => `"${v}"`).join(" | ");
          }
        } else {
          typeStr = "string | number";
        }
        if (this.isArray) {
          typeStr = `(${typeStr})`;
        }
        break;
      }
      default:
        typeStr = "unknown";
    }
    if (this.isArray) {
      typeStr = `${typeStr}[]`;
    }
    if (this.isOptional) {
      typeStr = `${typeStr} | null`;
    }
    return typeStr;
  }
  toJSON() {
    return {
      type: this._type,
      ...this.options,
      hasDefault: this.hasDefault
    };
  }
}

// core/primitive.ts
var integer = new Property("integer");
var real = new Property("real");
var text = new Property("text");
var blob = new Property("blob");
var timestamp = new Property("timestamp");
var boolean = new Property("boolean");
var node = new Property("node");
var enumeration = new Property("enum");
// core/_field.ts
var integerField = () => integer.init();
var realField = () => real.init();
var textField = () => text.init();
var blobField = () => blob.init();
var timestampField = () => timestamp.init();
var booleanField = () => boolean.init();
var nodeField = () => node.init();
function enumField(config) {
  return enumeration.init().enumOptions(config);
}
var Field = () => ({
  integer: integerField,
  real: realField,
  text: textField,
  blob: blobField,
  timestamp: timestampField,
  boolean: booleanField,
  node: nodeField,
  enum: enumField
});
var field = Field();

// core/schema.ts
function Schema(name, schemaBuilder) {
  const rawFields = schemaBuilder(field);
  const fields = Object.fromEntries(Object.entries(rawFields).map(([key, prop]) => [key, prop.finalise(key)]));
  const schema = {
    _name: name,
    fields,
    toString() {
      const fieldDescriptions = Object.entries(fields).map(([_key, prop]) => `   ${prop.toString()}`).join(`,
`);
      return `Schema: ${name}
{
${fieldDescriptions}
}`;
    },
    toTypeScriptInterface() {
      const interfaceName = name.charAt(0).toUpperCase() + name.slice(1);
      const fieldDefinitions = Object.entries(fields).map(([key, prop]) => {
        const type = prop.toTypeScriptType();
        return `  ${key}: ${type};`;
      }).join(`
`);
      return `interface ${interfaceName} {
${fieldDefinitions}
}`;
    },
    toJSON() {
      return {
        name,
        fields: Object.fromEntries(Object.entries(fields).map(([key, prop]) => [key, prop.toJSON()]))
      };
    }
  };
  return schema;
}
// ../core/src/data/proxies/sqlite.ts
import { sql } from "drizzle-orm";
import {
  blob as blob2,
  customType,
  integer as integer2,
  real as real2,
  sqliteTable,
  text as text2
} from "drizzle-orm/sqlite-core";
import { drizzle as ordb } from "drizzle-orm/sqlite-proxy";

// core/table.ts
function Table(name, schemaBuilder) {
  const rawFields = schemaBuilder(field);
  const fields = Object.fromEntries(Object.entries(rawFields).map(([key, prop]) => [key, prop.finalise(key)]));
  const sqliteColumns = {};
  for (const [key, prop] of Object.entries(fields)) {
    const columnName = prop.name ?? key;
    let builder;
    if (prop.isArray) {
      const base = blob2(columnName, { mode: "json" });
      switch (prop.type) {
        case "integer":
          builder = base.$type();
          break;
        case "real":
          builder = base.$type();
          break;
        case "text":
          builder = base.$type();
          break;
        case "boolean":
          builder = base.$type();
          break;
        case "blob":
          builder = base.$type();
          break;
        case "timestamp":
          builder = base.$type();
          break;
        case "node":
          builder = base.$type();
          break;
        case "enum":
          builder = base.$type();
          break;
        default:
          throw new Error(`Unsupported type: ${prop.type}`);
      }
    } else {
      switch (prop.type) {
        case "integer":
          builder = integer2(columnName);
          break;
        case "real":
          builder = real2(columnName);
          break;
        case "text":
          builder = text2(columnName);
          break;
        case "boolean":
          builder = integer2(columnName, { mode: "boolean" });
          break;
        case "blob":
          builder = blob2(columnName, { mode: "buffer" });
          break;
        case "timestamp":
          builder = integer2(columnName, { mode: "timestamp" });
          break;
        case "node":
          builder = blob2(columnName, { mode: "json" }).$type();
          break;
        case "enum": {
          const config = prop.enumConfigs;
          if (config?.options) {
            let mapping;
            const reverseMapping = {};
            if (Array.isArray(config.options)) {
              const options = config.options;
              mapping = {};
              for (let i = 0;i < options.length; i++) {
                mapping[options[i]] = i;
                reverseMapping[i] = options[i];
              }
            } else {
              mapping = config.options;
              for (const [k, v] of Object.entries(mapping)) {
                reverseMapping[v] = k;
              }
            }
            const EnumType = customType({
              dataType() {
                return "integer";
              },
              fromDriver(value) {
                return reverseMapping[value];
              },
              toDriver(value) {
                return mapping[value];
              }
            });
            builder = EnumType(columnName);
          } else {
            builder = integer2(columnName);
          }
          break;
        }
        default:
          throw new Error(`Unsupported type: ${prop.type}`);
      }
    }
    if (prop.isIdentifier) {
      builder = builder.primaryKey({
        autoIncrement: prop.isAutoIncrement
      });
    }
    if (!prop.isOptional) {
      builder = builder.notNull();
    }
    if (prop.isUnique) {
      builder = builder.unique();
    }
    if (prop.hasDefault) {
      builder = builder.default(prop.defaultValue);
    }
    if (prop.reference) {
      builder = builder.references(prop.reference.ref, prop.reference.actions);
    }
    sqliteColumns[key] = builder;
  }
  return sqliteTable(name, sqliteColumns);
}
// core/value.ts
var macroValue = {
  now: "now",
  emptyArray: "[]"
};
var value = {
  now: typeof macroValue.now === "string" ? macroValue.now : sql.raw(macroValue.now.value),
  emptyArray: typeof macroValue.emptyArray === "string" ? macroValue.emptyArray : sql.raw(macroValue.emptyArray.value)
};
export {
  value,
  timestamp,
  text,
  real,
  node,
  integer,
  enumeration as enum,
  boolean,
  blob,
  Table,
  Schema,
  Property
};
