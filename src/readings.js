function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildCalendarCells(visibleMonth) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalDays = lastDay.getDate();
  const cells = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `leading-${index}`, inMonth: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      key: formatLocalDate(date),
      day,
      inMonth: true,
      isoDate: formatLocalDate(date),
    });
  }

  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ key: `trailing-${cells.length}`, inMonth: false });
  }

  return cells;
}

export function parseStoredRecords(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sortRecordsByDateDesc(records) {
  return [...records].sort((left, right) => {
    return new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime();
  });
}

export function getRecordForDate(records, openedDate) {
  return records.find((record) => record.openedDate === openedDate) ?? null;
}

export function validateSummaryPool(pool) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return false;
  }

  return pool.every((entry) => {
    return (
      entry &&
      typeof entry.id === "string" &&
      entry.id.trim() &&
      typeof entry.bookTitle === "string" &&
      entry.bookTitle.trim() &&
      typeof entry.title === "string" &&
      entry.title.trim() &&
      typeof entry.summary === "string" &&
      entry.summary.trim()
    );
  });
}

export function chooseRandomSummary(pool, records, randomFn = Math.random) {
  if (!validateSummaryPool(pool)) {
    throw new Error("Summary pool is empty");
  }

  const mostRecent = records[0]?.entryId ?? null;
  const candidates =
    pool.length > 1 ? pool.filter((entry) => entry.id !== mostRecent) : pool;

  return candidates[Math.floor(randomFn() * candidates.length)];
}

export function openToday(records, pool, currentDate, randomFn = Math.random) {
  const today = formatLocalDate(currentDate);
  const existingRecord = getRecordForDate(records, today);

  if (existingRecord) {
    return {
      created: false,
      record: existingRecord,
      records,
    };
  }

  const entry = chooseRandomSummary(pool, records, randomFn);
  const record = {
    id: `${entry.id}-${currentDate.getTime()}`,
    entryId: entry.id,
    bookTitle: entry.bookTitle,
    title: entry.title,
    summary: entry.summary,
    openedAt: currentDate.toISOString(),
    openedDate: today,
  };

  return {
    created: true,
    record,
    records: sortRecordsByDateDesc([record, ...records]),
  };
}
