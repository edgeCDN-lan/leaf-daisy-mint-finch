import assert from "node:assert/strict";
import { describe, it } from "node:test";

const STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
type Status = (typeof STATUSES)[number];

function normalizeTask(input: { title?: string; status?: string; priority?: string }) {
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("Title is required");
  const status = (STATUSES as readonly string[]).includes(input.status ?? "todo")
    ? (input.status as Status) ?? "todo"
    : "todo";
  const priority = ["low", "medium", "high", "urgent"].includes(input.priority ?? "medium")
    ? input.priority ?? "medium"
    : "medium";
  return { title, status, priority };
}

describe("task CRUD validation", () => {
  it("requires a title", () => {
    assert.throws(() => normalizeTask({ title: "  " }), /Title is required/);
  });

  it("trims titles and defaults status", () => {
    assert.deepEqual(normalizeTask({ title: "  Ship invoice  " }), {
      title: "Ship invoice",
      status: "todo",
      priority: "medium",
    });
  });

  it("accepts kanban statuses", () => {
    for (const status of STATUSES) {
      assert.equal(normalizeTask({ title: "A", status }).status, status);
    }
  });

  it("falls back on unknown status", () => {
    assert.equal(normalizeTask({ title: "A", status: "nope" }).status, "todo");
  });
});
