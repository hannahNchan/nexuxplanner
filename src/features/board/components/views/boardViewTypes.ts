import type { BoardState, Task } from "../../../../shared/types/board";

export type BoardViewMode = "list" | "board" | "calendar" | "table" | "timeline";

export type BoardViewTask = Task & {
  columnTitle: string;
};

export const getBoardViewTasks = (data: BoardState): BoardViewTask[] =>
  data.columnOrder.flatMap((columnId) => {
    const column = data.columns[columnId];

    return column.taskIds
      .map((taskId) => data.tasks[taskId])
      .filter((task): task is Task => Boolean(task))
      .map((task) => ({
        ...task,
        column_id: task.column_id ?? column.id,
        columnTitle: column.title,
      }));
  });

export const getTaskDateRange = (task: Task) => {
  const fallbackDate = (task.created_at ?? new Date().toISOString()).slice(0, 10);
  const start = task.planned_start_date || fallbackDate;
  const end = task.planned_end_date || start;

  return { start, end };
};

export const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (dateValue: string, days: number) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

export const getInclusiveDaySpan = (start: string, end: string) => {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.round((endTime - startTime) / 86400000);
  return Math.max(0, diff);
};
