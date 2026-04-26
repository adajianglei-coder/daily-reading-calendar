import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCalendarCells,
  chooseRandomSummary,
  formatLocalDate,
  getRecordForDate,
  openToday,
  parseStoredRecords,
  sortRecordsByDateDesc,
  validateSummaryPool,
} from "../src/readings.js";

function localTime(year, month, day, hour = 8) {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

const summaryPool = [
  {
    id: "summary-1",
    bookTitle: "Atomic Habits",
    title: "Tiny gains compound",
    summary: "Small improvements become meaningful when you repeat them consistently.",
  },
  {
    id: "summary-2",
    bookTitle: "Deep Work",
    title: "Protect focus",
    summary: "Long stretches of distraction-free focus create work that is hard to replace.",
  },
];

test("validates a usable summary pool", () => {
  assert.equal(validateSummaryPool(summaryPool), true);
});

test("rejects an empty or malformed summary pool", () => {
  assert.equal(validateSummaryPool([]), false);
  assert.equal(validateSummaryPool([{ id: "x" }]), false);
});

test("opens today by creating a record from the summary pool", () => {
  const result = openToday([], summaryPool, localTime(2026, 4, 26, 8), () => 0);

  assert.equal(result.created, true);
  assert.equal(result.record.bookTitle, "Atomic Habits");
  assert.equal(result.record.title, "Tiny gains compound");
  assert.equal(result.record.summary, "Small improvements become meaningful when you repeat them consistently.");
  assert.equal(result.record.openedDate, "2026-04-26");
});

test("opening today twice returns the existing record", () => {
  const first = openToday([], summaryPool, localTime(2026, 4, 26, 8), () => 0);
  const second = openToday(first.records, summaryPool, localTime(2026, 4, 26, 18), () => 0.8);

  assert.equal(second.created, false);
  assert.equal(second.record.id, first.record.id);
  assert.equal(second.records.length, 1);
});

test("random choice avoids repeating the most recent summary when alternatives exist", () => {
  const recentRecords = [
    {
      id: "r1",
      entryId: "summary-1",
      bookTitle: "Atomic Habits",
      title: "Tiny gains compound",
      summary: "Small improvements become meaningful when you repeat them consistently.",
      openedAt: localTime(2026, 4, 25, 8).toISOString(),
      openedDate: "2026-04-25",
    },
  ];

  const selected = chooseRandomSummary(summaryPool, recentRecords, () => 0);
  assert.equal(selected.id, "summary-2");
});

test("returns the matching reading record for a given date", () => {
  const records = [
    {
      id: "r1",
      entryId: "summary-1",
      bookTitle: "Atomic Habits",
      title: "Tiny gains compound",
      summary: "Small improvements become meaningful when you repeat them consistently.",
      openedAt: localTime(2026, 4, 26, 8).toISOString(),
      openedDate: "2026-04-26",
    },
  ];

  assert.equal(getRecordForDate(records, "2026-04-26").bookTitle, "Atomic Habits");
});

test("falls back to an empty array when stored JSON is invalid", () => {
  assert.deepEqual(parseStoredRecords("{invalid-json"), []);
});

test("sorts reading records from newest to oldest", () => {
  const sorted = sortRecordsByDateDesc([
    { openedAt: localTime(2026, 4, 24, 8).toISOString() },
    { openedAt: localTime(2026, 4, 26, 8).toISOString() },
  ]);

  assert.equal(sorted[0].openedAt, localTime(2026, 4, 26, 8).toISOString());
});

test("formats local dates for daily record keys", () => {
  assert.equal(formatLocalDate(localTime(2026, 4, 26, 8)), "2026-04-26");
});

test("builds a month grid including leading empty cells", () => {
  const cells = buildCalendarCells(localTime(2026, 4, 1, 8));

  assert.equal(cells.length >= 35, true);
  assert.equal(cells.filter((cell) => cell.inMonth).length, 30);
});
