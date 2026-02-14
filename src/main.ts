import { sql } from "drizzle-orm";
import { cacheDb, storeDb } from "./data";

const query = sql`
    select "Hello World!" as text
`;
const cacheSql = cacheDb();
const storageSql = storeDb();
const resultCache = cacheSql.get<{ text: string }>(query);
const resultStore = storageSql.get<{ text: string }>(query);
console.log(resultCache, resultStore);
