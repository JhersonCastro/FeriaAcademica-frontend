import { STAGE_LABELS } from '../models/labels';
import { localDateTimeToIso } from './event-rules';
import { EventStageDto, StageSchedule, StageType } from './events.service';

/**
 * T-15 (acta 08): the stages of a fair are planned as a checklist. The super admin marks the
 * stages the fair will have, puts them in order and gives each a start and an end (by hand or
 * calculated from a first start, a duration and an interval between stages).
 *
 * `start` and `end` hold the value of a `datetime-local` input (local time, `''` when empty).
 */
export interface StageRow {
  type: StageType;
  selected: boolean;
  start: string;
  end: string;
}

/** How the dates are calculated: each stage lasts `durationDays` and the next one starts `gapDays` later. */
export interface AutoSchedule {
  firstStart: string;
  durationDays: number;
  gapDays: number;
}

/** What has to be sent to the backend to leave the timeline as planned. */
export interface StagePlanChanges {
  schedule: { type: StageType; schedule: StageSchedule }[];
  remove: StageType[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `2026-11-20T08:00` for a date, in local time (what a `datetime-local` input shows). */
export function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** The value for a `datetime-local` input from an ISO instant of the API (`''` if there is none). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : toLocalInput(date);
}

/**
 * The checklist as it starts: the stages already in the timeline first, marked and in date order,
 * then the rest in their usual order, unmarked and without dates.
 */
export function initialRows(
  saved: readonly EventStageDto[],
  allTypes: readonly StageType[],
): StageRow[] {
  const savedRows: StageRow[] = saved.map((stage) => ({
    type: stage.type,
    selected: true,
    start: isoToLocalInput(stage.startDate),
    end: isoToLocalInput(stage.endDate),
  }));
  const savedTypes = new Set(saved.map((stage) => stage.type));
  const otherRows: StageRow[] = allTypes
    .filter((type) => !savedTypes.has(type))
    .map((type) => ({ type, selected: false, start: '', end: '' }));
  return [...savedRows, ...otherRows];
}

/**
 * The marked stages go first, in the order the person gave them; the unmarked ones follow in their
 * usual order.
 */
export function arrange(rows: readonly StageRow[], allTypes: readonly StageType[]): StageRow[] {
  const selected = rows.filter((row) => row.selected);
  const others = allTypes
    .map((type) => rows.find((row) => row.type === type))
    .filter((row): row is StageRow => !!row && !row.selected);
  return [...selected, ...others];
}

/** Marks or unmarks a stage. A stage that is marked goes to the end of the marked ones. */
export function toggleRow(
  rows: readonly StageRow[],
  type: StageType,
  selected: boolean,
  allTypes: readonly StageType[],
): StageRow[] {
  const target = rows.find((row) => row.type === type);
  if (!target) {
    return [...rows];
  }
  const rest = rows.filter((row) => row.type !== type);
  const updated = { ...target, selected };
  return arrange(
    selected
      ? [...rest.filter((row) => row.selected), updated, ...rest.filter((row) => !row.selected)]
      : [...rest, updated],
    allTypes,
  );
}

/** Moves a marked stage one place up (`-1`) or down (`+1`) among the marked ones. */
export function moveRow(
  rows: readonly StageRow[],
  type: StageType,
  step: -1 | 1,
  allTypes: readonly StageType[],
): StageRow[] {
  const selected = rows.filter((row) => row.selected);
  const index = selected.findIndex((row) => row.type === type);
  const target = index + step;
  if (index < 0 || target < 0 || target >= selected.length) {
    return arrange(rows, allTypes);
  }
  [selected[index], selected[target]] = [selected[target], selected[index]];
  return arrange([...selected, ...rows.filter((row) => !row.selected)], allTypes);
}

/**
 * Fills the dates of the marked stages, in their order: the first starts at `firstStart`, each one
 * lasts `durationDays` and the next starts `gapDays` after the previous one ends. Unmarked rows are
 * left as they are. Returns `null` when the first start is not a date.
 */
export function fillDates(rows: readonly StageRow[], auto: AutoSchedule): StageRow[] | null {
  const first = new Date(auto.firstStart);
  if (!auto.firstStart || Number.isNaN(first.getTime())) {
    return null;
  }
  const duration = Math.max(0, auto.durationDays) * MS_PER_DAY;
  const gap = Math.max(0, auto.gapDays) * MS_PER_DAY;
  let cursor = first.getTime();
  return rows.map((row) => {
    if (!row.selected) {
      return { ...row };
    }
    const start = new Date(cursor);
    const end = new Date(cursor + duration);
    cursor = end.getTime() + gap;
    return { ...row, start: toLocalInput(start), end: toLocalInput(end) };
  });
}

/** Problems that keep the plan from being saved, one per stage (or for the whole plan). */
export function planErrors(rows: readonly StageRow[]): string[] {
  const selected = rows.filter((row) => row.selected);
  if (!selected.length) {
    return ['Marca al menos una etapa.'];
  }
  const errors: string[] = [];
  for (const row of selected) {
    const label = STAGE_LABELS[row.type];
    const start = localDateTimeToIso(row.start);
    const end = localDateTimeToIso(row.end);
    if (!start || !end) {
      errors.push(`Indica el inicio y el fin de ${label}.`);
    } else if (new Date(end) <= new Date(start)) {
      errors.push(`${label} debe terminar después de empezar.`);
    }
  }
  return errors;
}

/**
 * Warnings that do not keep the plan from being saved: a stage that starts before the previous
 * one (in the chosen order) ends. The backend accepts overlaps; the person decides.
 */
export function planWarnings(rows: readonly StageRow[]): string[] {
  const selected = rows.filter((row) => row.selected);
  const warnings: string[] = [];
  for (let i = 1; i < selected.length; i++) {
    const previous = selected[i - 1];
    const current = selected[i];
    const previousEnd = localDateTimeToIso(previous.end);
    const currentStart = localDateTimeToIso(current.start);
    if (previousEnd && currentStart && new Date(currentStart) < new Date(previousEnd)) {
      warnings.push(
        `${STAGE_LABELS[current.type]} empieza antes de que termine ${STAGE_LABELS[previous.type]}.`,
      );
    }
  }
  return warnings;
}

/**
 * The calls that turn the saved timeline into the plan: schedule the marked stages that are new or
 * whose dates changed, and remove the saved stages that were unmarked.
 */
export function planChanges(
  saved: readonly EventStageDto[],
  rows: readonly StageRow[],
): StagePlanChanges {
  const savedByType = new Map(saved.map((stage) => [stage.type, stage]));
  const schedule: StagePlanChanges['schedule'] = [];
  for (const row of rows) {
    if (!row.selected) {
      continue;
    }
    const startDate = localDateTimeToIso(row.start);
    const endDate = localDateTimeToIso(row.end);
    if (!startDate || !endDate) {
      continue;
    }
    const before = savedByType.get(row.type);
    const unchanged =
      before?.startDate &&
      before.endDate &&
      new Date(before.startDate).getTime() === new Date(startDate).getTime() &&
      new Date(before.endDate).getTime() === new Date(endDate).getTime();
    if (!unchanged) {
      schedule.push({ type: row.type, schedule: { startDate, endDate } });
    }
  }
  const selectedTypes = new Set(rows.filter((row) => row.selected).map((row) => row.type));
  const remove = saved.map((stage) => stage.type).filter((type) => !selectedTypes.has(type));
  return { schedule, remove };
}
