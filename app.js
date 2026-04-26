import { sampleSummaries } from "../data/sampleSummaries.js";
import {
  buildCalendarCells,
  formatLocalDate,
  getRecordForDate,
  openToday,
  parseStoredRecords,
  sortRecordsByDateDesc,
  validateSummaryPool,
} from "./readings.js";

const RECORDS_KEY = "daily-reading-records-v2";
const SUMMARY_POOL_KEY = "daily-reading-summary-pool";

const state = {
  summaryPool: sampleSummaries.map((entry) => ({ ...entry })),
  records: [],
  visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: formatLocalDate(new Date()),
};

function loadRecords() {
  state.records = sortRecordsByDateDesc(
    parseStoredRecords(window.localStorage.getItem(RECORDS_KEY))
  );
}

function loadSummaryPool() {
  const stored = parseStoredRecords(window.localStorage.getItem(SUMMARY_POOL_KEY));
  state.summaryPool = validateSummaryPool(stored)
    ? stored
    : sampleSummaries.map((entry) => ({ ...entry }));
}

function saveRecords() {
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
}

function saveSummaryPool() {
  window.localStorage.setItem(SUMMARY_POOL_KEY, JSON.stringify(state.summaryPool));
}

function shiftVisibleMonth(offset) {
  state.visibleMonth = new Date(
    state.visibleMonth.getFullYear(),
    state.visibleMonth.getMonth() + offset,
    1
  );
  render();
}

function renderTodayPanel() {
  const now = new Date();
  const today = formatLocalDate(now);
  const todayRecord = getRecordForDate(state.records, today);
  const button = document.getElementById("open-today-button");
  const feedback = document.getElementById("today-feedback");
  const display = document.getElementById("today-display");
  const dateLine = `${now.getFullYear()} - ${String(now.getMonth() + 1).padStart(2, "0")} - ${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const dayNumber = String(now.getDate()).padStart(2, "0");
  const weekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.getDay()];

  if (!validateSummaryPool(state.summaryPool)) {
    display.innerHTML = `
      <article class="daily-card empty">
        <p class="daily-date-line">${dateLine}</p>
        <div class="daily-date-block">
          <span class="daily-date-number">${dayNumber}</span>
          <span class="daily-weekday">${weekday}</span>
        </div>
        <p>还没有可用书摘，请先导入 Excel。</p>
      </article>
    `;
    feedback.textContent = "导入书摘后才能开启今天。";
    button.disabled = true;
    return;
  }

  if (!todayRecord) {
    display.innerHTML = `
      <article class="daily-card placeholder">
        <p class="daily-date-line">${dateLine}</p>
        <div class="daily-date-block">
          <span class="daily-date-number">${dayNumber}</span>
          <span class="daily-weekday">${weekday}</span>
        </div>
        <p class="daily-label">Today is still unopened</p>
        <p>点击左侧按钮，为今天留下一则阅读记录。</p>
      </article>
    `;
    feedback.textContent = "今天还没有记录，点击“开启今天”就会随机收到一则书摘。";
    button.textContent = "开启今天";
    button.disabled = false;
    return;
  }

  display.innerHTML = `
    <article class="daily-card result">
      <p class="daily-date-line">${dateLine}</p>
      <div class="daily-date-block">
        <span class="daily-date-number">${dayNumber}</span>
        <span class="daily-weekday">${weekday}</span>
      </div>
      <p class="daily-label">${todayRecord.bookTitle}</p>
      <h3>${todayRecord.title}</h3>
      <p>${todayRecord.summary}</p>
    </article>
  `;
  feedback.textContent = "今天已经开启过了，日历里已经为今天保留记录。";
  button.textContent = "Enjoy today";
  button.disabled = true;
}

function renderOverviewPanel() {
  const status = document.getElementById("overview-summary");
  const openedCount = state.records.length;
  const poolCount = state.summaryPool.length;
  const today = formatLocalDate(new Date());
  const todayOpened = Boolean(getRecordForDate(state.records, today));

  status.innerHTML = `
    <dl class="status-list">
      <div><dt>今日状态</dt><dd>${todayOpened ? "已开启" : "未开启"}</dd></div>
      <div><dt>书摘池</dt><dd>${poolCount}</dd></div>
      <div><dt>累计记录</dt><dd>${openedCount}</dd></div>
    </dl>
  `;
}

function renderCalendar() {
  const title = document.getElementById("calendar-title");
  const grid = document.getElementById("calendar-grid");
  const detail = document.getElementById("reading-detail");
  const grouped = Object.fromEntries(state.records.map((record) => [record.openedDate, record]));
  const cells = buildCalendarCells(state.visibleMonth);

  title.textContent = `${state.visibleMonth.getFullYear()} 年 ${state.visibleMonth.getMonth() + 1} 月`;
  grid.innerHTML = `
    <div class="weekday">一</div>
    <div class="weekday">二</div>
    <div class="weekday">三</div>
    <div class="weekday">四</div>
    <div class="weekday">五</div>
    <div class="weekday">六</div>
    <div class="weekday">日</div>
    ${cells
      .map((cell) => {
        if (!cell.inMonth) {
          return `<div class="calendar-cell empty" aria-hidden="true"></div>`;
        }

        const record = grouped[cell.isoDate] ?? null;
        const activeClass = cell.isoDate === state.selectedDate ? "active" : "";
        const hasRecordClass = record ? "has-record" : "";
        const todayClass = cell.isoDate === formatLocalDate(new Date()) ? "today" : "";

        return `
          <button class="calendar-cell ${activeClass} ${hasRecordClass} ${todayClass}" data-date="${cell.isoDate}" type="button">
            <span class="calendar-day">${cell.day}</span>
            <small class="calendar-note">${record ? record.bookTitle : ""}</small>
          </button>
        `;
      })
      .join("")}
  `;

  const selectedRecord = grouped[state.selectedDate] ?? null;
  detail.innerHTML = selectedRecord
    ? `
      <div class="memo-card">
        <p class="memo-date">${selectedRecord.openedDate}</p>
        <h3>${selectedRecord.bookTitle}</h3>
        <p class="memo-title">${selectedRecord.title}</p>
        <p>${selectedRecord.summary}</p>
      </div>
    `
    : `
      <div class="memo-card empty">
        <p>这一天还没有书摘记录。</p>
      </div>
    `;
}

function renderImportPanel() {
  const info = document.getElementById("import-summary");
  info.textContent = `当前共有 ${state.summaryPool.length} 条可用书摘。Excel 表头请使用：书名、标题、摘要。`;
}

function render() {
  renderTodayPanel();
  renderOverviewPanel();
  renderCalendar();
  renderImportPanel();
}

function handleOpenToday() {
  const result = openToday(state.records, state.summaryPool, new Date());
  state.records = result.records;
  state.selectedDate = result.record.openedDate;
  state.visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  saveRecords();
  render();
}

async function handleImportExcel(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  const feedback = document.getElementById("import-feedback");

  try {
    const response = await fetch("/api/import-summaries-excel", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (!validateSummaryPool(payload.entries)) {
      throw new Error("invalid-pool");
    }

    state.summaryPool = payload.entries;
    saveSummaryPool();
    feedback.textContent = `已导入 ${payload.entries.length} 条书摘。`;
    render();
  } catch {
    feedback.textContent = "导入失败，请确认 Excel 包含表头：书名、标题、摘要。";
  } finally {
    event.target.value = "";
  }
}

function bindEvents() {
  document.getElementById("open-today-button").addEventListener("click", handleOpenToday);
  document.getElementById("prev-month").addEventListener("click", () => shiftVisibleMonth(-1));
  document.getElementById("next-month").addEventListener("click", () => shiftVisibleMonth(1));
  document.getElementById("import-excel-input").addEventListener("change", handleImportExcel);
  document.getElementById("calendar-grid").addEventListener("click", (event) => {
    const target = event.target.closest("[data-date]");
    if (!target) {
      return;
    }

    state.selectedDate = target.dataset.date;
    render();
  });
}

loadRecords();
loadSummaryPool();
bindEvents();
render();
