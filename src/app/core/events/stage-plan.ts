import { STAGE_LABELS, STAGE_TYPES } from '../models/labels';
import { EventStageDto, StageStatus, StageType } from './events.service';

/**
 * HU-006: the timeline of a fair. The super admin picks a stage from the visible list, gives it a
 * start and an end (date and time) and saves it; the timeline shows the saved stages in date order.
 *
 * Dates are shown and typed in Colombia's time zone (UTC−5, no daylight saving time) whatever the
 * zone of the browser, because that is the zone the screen announces.
 */
export const STAGE_TIME_ZONE_LABEL = 'America/Bogotá · UTC−5';

const UTC_OFFSET = '-05:00';
const OFFSET_MS = 5 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** The values of the `date` and `time` inputs of a stage (`''` when empty). */
export interface StageDraft {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export function emptyDraft(): StageDraft {
  return { startDate: '', startTime: '', endDate: '', endTime: '' };
}

/** Date (`2026-11-20`) and time (`08:00`) of an ISO instant, in Colombia's time zone. */
export function isoToZone(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() - OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** The ISO instant of a date and a time typed in Colombia's time zone, or `null` if either is missing or invalid. */
export function zoneToIso(date: string, time: string): string | null {
  if (!date || !time) {
    return null;
  }
  const instant = new Date(`${date}T${time.slice(0, 5)}:00${UTC_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** What the inputs show for a saved stage; empty when the stage has no dates (or there is no stage). */
export function draftFromStage(
  stage: Pick<EventStageDto, 'startDate' | 'endDate'> | null,
): StageDraft {
  if (!stage?.startDate || !stage.endDate) {
    return emptyDraft();
  }
  const start = isoToZone(stage.startDate);
  const end = isoToZone(stage.endDate);
  return { startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time };
}

/** The start and the end of a draft as ISO instants, or `null` while either is incomplete. */
export function draftRange(draft: StageDraft): { startDate: string; endDate: string } | null {
  const startDate = zoneToIso(draft.startDate, draft.startTime);
  const endDate = zoneToIso(draft.endDate, draft.endTime);
  return startDate && endDate ? { startDate, endDate } : null;
}

function clock(iso: string): string {
  const { time } = isoToZone(iso);
  const hours = Number(time.slice(0, 2));
  return `${hours % 12 || 12}:${time.slice(3, 5)} ${hours < 12 ? 'a. m.' : 'p. m.'}`;
}

/** `1 oct 2026 · 8:00 a. m.` (without the year when `withYear` is false). */
export function formatStageDate(iso: string, withYear = true): string {
  const [year, month, day] = isoToZone(iso).date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}${withYear ? ` ${year}` : ''} · ${clock(iso)}`;
}

/** `20/11/2026 · 11:59 p. m.` */
export function formatStageDateNumeric(iso: string): string {
  const [year, month, day] = isoToZone(iso).date.split('-');
  return `${day}/${month}/${year} · ${clock(iso)}`;
}

/** `19 días y 15 h 59 min` for the time between two instants (`null` if it is not positive). */
export function formatDuration(startIso: string, endIso: string): string | null {
  const minutes = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / MINUTE_MS,
  );
  if (!(minutes > 0)) {
    return null;
  }
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const clockPart = [hours ? `${hours} h` : '', rest ? `${rest} min` : '']
    .filter(Boolean)
    .join(' ');
  const dayPart = days ? `${days} ${days === 1 ? 'día' : 'días'}` : '';
  return dayPart && clockPart ? `${dayPart} y ${clockPart}` : dayPart || clockPart;
}

/** The saved stages in the order they happen: by start date, the ones without dates last. */
export function sortStages(stages: readonly EventStageDto[]): EventStageDto[] {
  const time = (stage: EventStageDto) =>
    stage.startDate ? new Date(stage.startDate).getTime() : Number.POSITIVE_INFINITY;
  return [...stages].sort(
    (a, b) => time(a) - time(b) || STAGE_TYPES.indexOf(a.type) - STAGE_TYPES.indexOf(b.type),
  );
}

/**
 * Where a stage is right now. The backend only ever sends `Scheduled`, so the state comes from the
 * dates: before the start it is pending, between start and end it is open, after the end it is
 * closed. A stage without dates stays as the backend says. When the backend starts sending `Open`
 * or `Closed` itself, that wins.
 */
export function stageStatusAt(
  stage: Pick<EventStageDto, 'status' | 'startDate' | 'endDate'>,
  now: number,
): StageStatus {
  if (stage.status !== 'Scheduled' || !stage.startDate || !stage.endDate) {
    return stage.status;
  }
  if (now >= new Date(stage.endDate).getTime()) {
    return 'Closed';
  }
  return now >= new Date(stage.startDate).getTime() ? 'Open' : 'Scheduled';
}

/** A stage that starts before the stage that comes before it in the life of a fair ends. */
export interface StageConflict {
  previous: StageType;
  previousEnd: string;
  start: string;
}

type Dated = Pick<EventStageDto, 'type' | 'startDate' | 'endDate'>;

/** The stage that precedes `type` in the usual order of the stages and is in the timeline, with an end. */
function previousStage(type: StageType, stages: readonly Dated[]): Dated | null {
  const index = STAGE_TYPES.indexOf(type);
  let found: Dated | null = null;
  for (const stage of stages) {
    const position = STAGE_TYPES.indexOf(stage.type);
    if (
      stage.type !== type &&
      stage.endDate &&
      position < index &&
      (!found || position > STAGE_TYPES.indexOf(found.type))
    ) {
      found = stage;
    }
  }
  return found;
}

/** The stage that `type` overlaps with, if it starts at `startIso` and the others are as given. */
export function conflictOf(
  type: StageType,
  startIso: string,
  stages: readonly Dated[],
): StageConflict | null {
  const previous = previousStage(type, stages);
  if (previous?.endDate && new Date(startIso) < new Date(previous.endDate)) {
    return { previous: previous.type, previousEnd: previous.endDate, start: startIso };
  }
  return null;
}

/** The stage that follows `type` in the usual order of the stages and is in the timeline, with a start. */
function nextStage(type: StageType, stages: readonly Dated[]): Dated | null {
  const index = STAGE_TYPES.indexOf(type);
  let found: Dated | null = null;
  for (const stage of stages) {
    const position = STAGE_TYPES.indexOf(stage.type);
    if (
      stage.type !== type &&
      stage.startDate &&
      position > index &&
      (!found || position < STAGE_TYPES.indexOf(found.type))
    ) {
      found = stage;
    }
  }
  return found;
}

/**
 * What is wrong when a stage starts before the one that precedes it ends: the order the stages
 * should follow and the dates that break it.
 */
export function orderConflictText(type: StageType, conflict: StageConflict): string {
  const previous = STAGE_LABELS[conflict.previous];
  // Spanish says «e» instead of «y» before a word that starts with «i».
  const and = /^h?i/i.test(previous) ? 'e' : 'y';
  return (
    `${STAGE_LABELS[type]} debe empezar después de que termine ${previous}. ` +
    `Hoy ${STAGE_LABELS[type]} empieza el ${formatStageDate(conflict.start)} ` +
    `${and} ${previous} termina el ${formatStageDate(conflict.previousEnd)}`
  );
}

/** Every stage of the timeline that starts before the one that precedes it ends. */
export function findConflicts(stages: readonly Dated[]): Map<StageType, StageConflict> {
  const conflicts = new Map<StageType, StageConflict>();
  for (const stage of stages) {
    const conflict = stage.startDate ? conflictOf(stage.type, stage.startDate, stages) : null;
    if (conflict) {
      conflicts.set(stage.type, conflict);
    }
  }
  return conflicts;
}

/** The timeline as it would be if `type` had the dates of the draft (what the conflicts are computed on). */
export function withDraft(
  stages: readonly EventStageDto[],
  type: StageType | null,
  draft: StageDraft,
): Dated[] {
  const range = type ? draftRange(draft) : null;
  if (!type || !range) {
    return [...stages];
  }
  return [...stages.filter((stage) => stage.type !== type), { type, ...range }];
}

/**
 * The conflicts the timeline shows. The dates typed in the form count only for a stage that is
 * already in the timeline; a stage that is not saved yet reports its problems in the form alone.
 */
export function timelineConflicts(
  saved: readonly EventStageDto[],
  type: StageType | null,
  draft: StageDraft,
): Map<StageType, StageConflict> {
  const editing = !!type && saved.some((stage) => stage.type === type);
  return findConflicts(editing ? withDraft(saved, type, draft) : saved);
}

/** The message under each input of the stage being edited. */
export interface StageIssues {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export interface StageValidation {
  issues: StageIssues;
  /** All four values are filled in. */
  complete: boolean;
  /** Complete and with nothing to correct: it can be saved. */
  valid: boolean;
  conflict: StageConflict | null;
}

/**
 * Checks the draft of a stage: its end must be after its start and it cannot start before the
 * stage that precedes it ends. Missing values are not an error, they only keep it from saving.
 */
export function validateDraft(
  type: StageType,
  draft: StageDraft,
  stages: readonly EventStageDto[],
): StageValidation {
  const issues: StageIssues = {};
  const start = zoneToIso(draft.startDate, draft.startTime);
  const end = zoneToIso(draft.endDate, draft.endTime);
  const complete = !!start && !!end;

  const conflict = start ? conflictOf(type, start, stages) : null;
  if (conflict) {
    issues.startDate =
      `Empieza antes de que termine «${STAGE_LABELS[conflict.previous]}» ` +
      `(${formatStageDateNumeric(conflict.previousEnd)}). ` +
      `${STAGE_LABELS[type]} debe empezar después de ${STAGE_LABELS[conflict.previous]}.`;
  }
  if (start && end && new Date(end) <= new Date(start)) {
    const message = `El fin debe ser posterior al inicio (${formatStageDateNumeric(start)}).`;
    if (draft.endDate < draft.startDate) {
      issues.endDate = message;
    } else {
      issues.endTime = message;
    }
  }

  // The same rule seen from the stage that comes next: this one cannot end after it starts.
  const next = nextStage(type, stages);
  if (end && next?.startDate && new Date(end) > new Date(next.startDate)) {
    const field = isoToZone(next.startDate).date === draft.endDate ? 'endTime' : 'endDate';
    issues[field] ??=
      `Termina después de que empiece «${STAGE_LABELS[next.type]}» ` +
      `(${formatStageDateNumeric(next.startDate)}). ` +
      `${STAGE_LABELS[type]} debe terminar antes de que empiece ${STAGE_LABELS[next.type]}.`;
  }
  return { issues, complete, valid: complete && !Object.keys(issues).length, conflict };
}
