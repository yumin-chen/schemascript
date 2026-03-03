import { describe, expect, spyOn, test } from "bun:test";
import { runtime } from "./sqlite";

describe("sqlite proxy", () => {
	test("runtime() should call __host_sqlite_call and return results", async () => {
		const mockResult = { rows: [[1, "test"]] };
		(globalThis as unknown as Record<string, unknown>).__host_sqlite_call = (
			payload: string,
		) => {
			const parsed = JSON.parse(payload);
			expect(parsed.sql).toBe("SELECT * FROM test");
			return JSON.stringify(mockResult);
		};

		const db = runtime();
		const result = await (
			db as unknown as {
				session: {
					client: (
						sql: string,
						params: unknown[],
						method: string,
					) => Promise<{ rows: unknown[][] }>;
				};
			}
		).session.client("SELECT * FROM test", [], "all");
		expect(result.rows).toEqual(mockResult.rows);
	});

	test("runtime() should handle errors from __host_sqlite_call", async () => {
		const mockError = { error: "Database error" };
		(globalThis as unknown as Record<string, unknown>).__host_sqlite_call =
			() => JSON.stringify(mockError);

		const db = runtime();
		expect(
			(
				db as unknown as {
					session: {
						client: (
							sql: string,
							params: unknown[],
							method: string,
						) => Promise<{ rows: unknown[][] }>;
					};
				}
			).session.client("SELECT * FROM test", [], "all"),
		).rejects.toThrow("Database error");
	});

	test("runtime() should log and rethrow unexpected errors", async () => {
		const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
		(globalThis as unknown as Record<string, unknown>).__host_sqlite_call =
			() => {
				throw new Error("Unexpected error");
			};

		const db = runtime();
		try {
			await (
				db as unknown as {
					session: {
						client: (
							sql: string,
							params: unknown[],
							method: string,
						) => Promise<{ rows: unknown[][] }>;
					};
				}
			).session.client("SELECT * FROM test", [], "all");
		} catch (e: unknown) {
			expect((e as Error).message).toBe("Unexpected error");
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test("runtime() should handle non-Error unexpected errors", async () => {
		const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
		(globalThis as unknown as Record<string, unknown>).__host_sqlite_call =
			() => {
				throw "String error";
			};

		const db = runtime();
		try {
			await (
				db as unknown as {
					session: {
						client: (
							sql: string,
							params: unknown[],
							method: string,
						) => Promise<{ rows: unknown[][] }>;
					};
				}
			).session.client("SELECT * FROM test", [], "all");
		} catch (e: unknown) {
			expect(e).toBe("String error");
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
