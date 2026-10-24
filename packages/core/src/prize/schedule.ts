import {
  type CampaignWindowInput,
  type OpeningHours,
  parseTimeOfDayMinutes,
  type WeeklyOpeningWindow,
} from './schemas';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_DAY = 1440;
const OFFSET_BUCKET_MS = 900_000; // 15 minutes (all IANA TZ transitions occur on >=15m boundaries)
const MAX_OFFSET_CACHE_SIZE = 8192;

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetCache = new Map<string, number>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Computes the timezone offset (`localWallClockAsUtcMs - utcEpochMs`) at `epochMs`
 * using only standard `Intl.DateTimeFormat` APIs.
 */
export function getTimezoneOffsetMs(timeZone: string, epochMs: number): number {
  const bucket = Math.floor(epochMs / OFFSET_BUCKET_MS);
  const cacheKey = `${timeZone}:${bucket}`;
  const cached = offsetCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const formatter = getFormatter(timeZone);
  const bucketStartMs = bucket * OFFSET_BUCKET_MS;
  const parts = formatter.formatToParts(new Date(bucketStartMs));

  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = Number(part.value);
        break;
      case 'month':
        month = Number(part.value);
        break;
      case 'day':
        day = Number(part.value);
        break;
      case 'hour':
        hour = Number(part.value);
        if (hour === 24) hour = 0;
        break;
      case 'minute':
        minute = Number(part.value);
        break;
      case 'second':
        second = Number(part.value);
        break;
    }
  }

  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const truncatedUtcMs = Math.floor(bucketStartMs / 1000) * 1000;
  const offsetMs = localAsUtcMs - truncatedUtcMs;

  if (offsetCache.size >= MAX_OFFSET_CACHE_SIZE) {
    offsetCache.clear();
  }
  offsetCache.set(cacheKey, offsetMs);
  return offsetMs;
}

export interface LocalWallTime {
  /** Local day index since 1970-01-01 in the target timezone. */
  localDayIndex: number;
  /** Day of week in the target timezone (`0` = Sunday .. `6` = Saturday). */
  dayOfWeek: number;
  /** Fractional minutes elapsed since local midnight (`0 <= minutesOfDay < 1440`). */
  minutesOfDay: number;
  /** Shifted local timestamp (`epochMs + tzOffsetMs`). */
  localEpochMs: number;
}

export function getLocalWallTime(epochMs: number, timeZone = 'Asia/Ho_Chi_Minh'): LocalWallTime {
  const offsetMs = getTimezoneOffsetMs(timeZone, epochMs);
  const localEpochMs = epochMs + offsetMs;
  const localDayIndex = Math.floor(localEpochMs / MS_PER_DAY);
  // 1970-01-01 was a Thursday (dayOfWeek = 4)
  const dayOfWeek = (((localDayIndex + 4) % 7) + 7) % 7;
  const msOfDay = ((localEpochMs % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  const minutesOfDay = msOfDay / MS_PER_MINUTE;
  return { localDayIndex, dayOfWeek, minutesOfDay, localEpochMs };
}

export interface MinuteInterval {
  readonly startMin: number;
  readonly endMin: number;
}

export interface CompiledOpeningHours {
  readonly unrestricted: boolean;
  /** Merged disjoint intervals `[startMin, endMin]` per day of week (`0..6`). */
  readonly byDay: readonly (readonly MinuteInterval[])[];
  /** Total open minutes for each day of week (`0..6`). */
  readonly dailyMinutes: readonly number[];
  /** Sum of open minutes across an entire 7-day week. */
  readonly weeklyMinutes: number;
}

const UNRESTRICTED_OPENING_HOURS: CompiledOpeningHours = {
  unrestricted: true,
  byDay: Array.from({ length: 7 }, () => [{ startMin: 0, endMin: MINUTES_PER_DAY }]),
  dailyMinutes: [1440, 1440, 1440, 1440, 1440, 1440, 1440],
  weeklyMinutes: 7 * MINUTES_PER_DAY,
};

const compiledOpeningHoursCache = new WeakMap<
  readonly WeeklyOpeningWindow[],
  CompiledOpeningHours
>();

export function compileOpeningHours(
  openingHours: readonly WeeklyOpeningWindow[] | undefined | null,
): CompiledOpeningHours {
  if (!openingHours || openingHours.length === 0) {
    return UNRESTRICTED_OPENING_HOURS;
  }

  const cached = compiledOpeningHoursCache.get(openingHours);
  if (cached) return cached;

  const rawByDay: MinuteInterval[][] = Array.from({ length: 7 }, () => []);

  for (const entry of openingHours) {
    const startMin = parseTimeOfDayMinutes(entry.start);
    const endMin = parseTimeOfDayMinutes(entry.end);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
      continue;
    }
    const clampedStart = Math.max(0, Math.min(MINUTES_PER_DAY, startMin));
    const clampedEnd = Math.max(0, Math.min(MINUTES_PER_DAY, endMin));
    if (clampedEnd <= clampedStart) continue;

    const targetDays: readonly number[] =
      entry.days && entry.days.length > 0 ? entry.days : [0, 1, 2, 3, 4, 5, 6];

    for (const day of targetDays) {
      if (day >= 0 && day <= 6) {
        rawByDay[day]?.push({ startMin: clampedStart, endMin: clampedEnd });
      }
    }
  }

  const mergedByDay: MinuteInterval[][] = [];
  const dailyMinutes: number[] = [];
  let weeklyMinutes = 0;

  for (let d = 0; d < 7; d++) {
    const intervals = rawByDay[d] ?? [];
    if (intervals.length === 0) {
      mergedByDay.push([]);
      dailyMinutes.push(0);
      continue;
    }
    intervals.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const merged: MinuteInterval[] = [];
    for (const iv of intervals) {
      const last = merged[merged.length - 1];
      if (!last || iv.startMin > last.endMin) {
        merged.push({ startMin: iv.startMin, endMin: iv.endMin });
      } else if (iv.endMin > last.endMin) {
        merged[merged.length - 1] = { startMin: last.startMin, endMin: iv.endMin };
      }
    }
    let daySum = 0;
    for (const iv of merged) {
      daySum += iv.endMin - iv.startMin;
    }
    mergedByDay.push(merged);
    dailyMinutes.push(daySum);
    weeklyMinutes += daySum;
  }

  const compiled: CompiledOpeningHours = {
    unrestricted: false,
    byDay: mergedByDay,
    dailyMinutes,
    weeklyMinutes,
  };
  compiledOpeningHoursCache.set(openingHours, compiled);
  return compiled;
}

function toTimestampMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

function overlapMinutesForDay(
  intervals: readonly MinuteInterval[],
  fromMin: number,
  toMin: number,
): number {
  if (toMin <= fromMin || intervals.length === 0) return 0;
  let total = 0;
  for (const iv of intervals) {
    if (iv.endMin <= fromMin) continue;
    if (iv.startMin >= toMin) break;
    const start = Math.max(fromMin, iv.startMin);
    const end = Math.min(toMin, iv.endMin);
    if (end > start) {
      total += end - start;
    }
  }
  return total;
}

/**
 * Computes exact open minutes within `[startMs, endMs]` for the given timezone and opening hours.
 * Runs in O(1) time regardless of how many days or weeks the interval spans.
 */
export function openMinutesBetween(
  startMs: number,
  endMs: number,
  timeZone: string,
  compiled: CompiledOpeningHours,
): number {
  if (endMs <= startMs) return 0;
  if (compiled.unrestricted) {
    return (endMs - startMs) / MS_PER_MINUTE;
  }
  if (compiled.weeklyMinutes <= 0) {
    return 0;
  }

  const startLocal = getLocalWallTime(startMs, timeZone);
  const endLocal = getLocalWallTime(endMs, timeZone);

  if (startLocal.localDayIndex === endLocal.localDayIndex) {
    const intervals = compiled.byDay[startLocal.dayOfWeek] ?? [];
    return overlapMinutesForDay(intervals, startLocal.minutesOfDay, endLocal.minutesOfDay);
  }

  let totalMinutes = 0;

  // 1. Partial first day
  const startDayIntervals = compiled.byDay[startLocal.dayOfWeek] ?? [];
  totalMinutes += overlapMinutesForDay(startDayIntervals, startLocal.minutesOfDay, MINUTES_PER_DAY);

  // 2. Full intermediate days (O(1) via full weeks + at most 6 remainder days)
  const firstFullDay = startLocal.localDayIndex + 1;
  const lastFullDay = endLocal.localDayIndex - 1;
  if (lastFullDay >= firstFullDay) {
    const fullDaysCount = lastFullDay - firstFullDay + 1;
    const fullWeeks = Math.floor(fullDaysCount / 7);
    const remainderDays = fullDaysCount % 7;
    totalMinutes += fullWeeks * compiled.weeklyMinutes;
    for (let i = 0; i < remainderDays; i++) {
      const dow = (((firstFullDay + i + 4) % 7) + 7) % 7;
      totalMinutes += compiled.dailyMinutes[dow] ?? 0;
    }
  }

  // 3. Partial last day
  if (endLocal.minutesOfDay > 0) {
    const endDayIntervals = compiled.byDay[endLocal.dayOfWeek] ?? [];
    totalMinutes += overlapMinutesForDay(endDayIntervals, 0, endLocal.minutesOfDay);
  }

  return totalMinutes;
}

export interface IsOpenAtObjectInput {
  window: CampaignWindowInput;
  openingHours?: OpeningHours | undefined;
  now: Date;
}

/**
 * Checks whether `now` falls within the campaign `[startsAt, endsAt]` window
 * AND within one of the configured `openingHours` windows in the campaign timezone.
 */
export function isOpenAt(
  windowOrInput:
    | (CampaignWindowInput & { openingHours?: OpeningHours | undefined })
    | IsOpenAtObjectInput,
  openingHoursOrNow?: OpeningHours | Date | undefined,
  maybeNow?: Date,
): boolean {
  let window: CampaignWindowInput;
  let openingHours: OpeningHours | undefined;
  let now: Date;

  if ('window' in windowOrInput && 'now' in windowOrInput) {
    window = windowOrInput.window;
    openingHours = windowOrInput.openingHours;
    now = windowOrInput.now;
  } else if (openingHoursOrNow instanceof Date) {
    window = windowOrInput;
    openingHours = windowOrInput.openingHours;
    now = openingHoursOrNow;
  } else {
    window = windowOrInput;
    openingHours = openingHoursOrNow ?? windowOrInput.openingHours;
    now = maybeNow as Date;
  }

  const nowMs = now.getTime();
  const startsAtMs = toTimestampMs(window.startsAt);
  const endsAtMs = toTimestampMs(window.endsAt);

  if (!Number.isFinite(nowMs) || !Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs)) {
    return false;
  }
  if (endsAtMs <= startsAtMs) {
    return false;
  }
  if (nowMs < startsAtMs || nowMs > endsAtMs) {
    return false;
  }

  const compiled = compileOpeningHours(openingHours);
  if (compiled.unrestricted) {
    return true;
  }

  const timeZone = window.timezone ?? 'Asia/Ho_Chi_Minh';
  const local = getLocalWallTime(nowMs, timeZone);
  const intervals = compiled.byDay[local.dayOfWeek] ?? [];

  for (const iv of intervals) {
    // Inclusive start, exclusive end; allow exact 24:00 (1440) end boundary
    if (
      local.minutesOfDay >= iv.startMin &&
      (local.minutesOfDay < iv.endMin ||
        (iv.endMin === MINUTES_PER_DAY && local.minutesOfDay <= MINUTES_PER_DAY))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the elapsed fraction `0..1` of the total OPEN campaign duration up to `now`.
 * Time outside `openingHours` does not advance the numerator or count toward the denominator.
 */
export function openFraction(
  window: CampaignWindowInput & { openingHours?: OpeningHours | undefined },
  openingHoursOrNow: OpeningHours | Date | undefined,
  maybeNow?: Date,
): number {
  let openingHours: OpeningHours | undefined;
  let now: Date;

  if (openingHoursOrNow instanceof Date) {
    openingHours = window.openingHours;
    now = openingHoursOrNow;
  } else {
    openingHours = openingHoursOrNow ?? window.openingHours;
    now = maybeNow as Date;
  }

  const nowMs = now.getTime();
  const startsAtMs = toTimestampMs(window.startsAt);
  const endsAtMs = toTimestampMs(window.endsAt);

  if (!Number.isFinite(nowMs) || !Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs)) {
    return 0;
  }
  if (endsAtMs <= startsAtMs || nowMs <= startsAtMs) {
    return 0;
  }

  const timeZone = window.timezone ?? 'Asia/Ho_Chi_Minh';
  const compiled = compileOpeningHours(openingHours);

  if (compiled.unrestricted) {
    if (nowMs >= endsAtMs) return 1;
    return Math.min(1, Math.max(0, (nowMs - startsAtMs) / (endsAtMs - startsAtMs)));
  }

  const totalOpenMinutes = openMinutesBetween(startsAtMs, endsAtMs, timeZone, compiled);
  if (totalOpenMinutes <= 0) {
    return 0;
  }
  if (nowMs >= endsAtMs) {
    return 1;
  }

  const elapsedOpenMinutes = openMinutesBetween(startsAtMs, nowMs, timeZone, compiled);
  return Math.min(1, Math.max(0, elapsedOpenMinutes / totalOpenMinutes));
}
