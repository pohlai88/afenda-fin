// CivilDate: a calendar date with no time-of-day or timezone component
// (doctrine TIM-01: "document date"/"tax point"/etc. are civil dates, never an
// absolute instant and never collapsed into a generic `date` field).
//
// Deliberately independent of `Instant`: converting a CivilDate to/from an
// absolute instant requires a timezone/business-day policy this package does not
// own (TIM-03's "business zones are retained separately"), so this module
// performs no such conversion and contains no Date-object usage at all — pure
// integer calendar arithmetic only.
//
// Branding (aligned with packages/money): only `civilDateFromParts` /
// `parseCivilDate` attach the brand. A raw `{ year, month, day }` object is not
// a `CivilDate`, so invalid calendar dates cannot type-check into encode paths.

import { err, ok, type Result } from '@afenda/errors';

declare const civilDateBrand: unique symbol;

/** A calendar date: year/month/day, no time-of-day, no timezone. */
export type CivilDate = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly [civilDateBrand]: 'CivilDate';
};

export type CivilDateErrorCode = 'INVALID_YEAR' | 'INVALID_MONTH' | 'INVALID_DAY' | 'MALFORMED_CANONICAL_STRING';

const MIN_YEAR = 0;
const MAX_YEAR = 9999;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Number of days in `month` (1-12) of `year`. `year`/`month` must already be
 * validated by the caller — an out-of-range `month` here indicates a
 * programmer fault in this module, not a user-input failure, so it throws
 * rather than returning a `Result`.
 */
function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      throw new Error(`daysInMonth: internal invariant violated, unvalidated month ${String(month)}`);
  }
}

function brandCivilDate(year: number, month: number, day: number): CivilDate {
  // Single sanctioned brand-attaching cast, immediately after validation.
  return { year, month, day } as CivilDate;
}

function formatCivilDateUnchecked(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Constructs a `CivilDate`, validating year/month/day (including leap years) explicitly. */
export function civilDateFromParts(year: number, month: number, day: number): Result<CivilDate, CivilDateErrorCode> {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return err('INVALID_YEAR', `year must be an integer in [${String(MIN_YEAR)}, ${String(MAX_YEAR)}], got ${String(year)}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return err('INVALID_MONTH', `month must be an integer in [1, 12], got ${String(month)}`);
  }
  const maxDay = daysInMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > maxDay) {
    return err(
      'INVALID_DAY',
      `day must be an integer in [1, ${String(maxDay)}] for ${formatCivilDateUnchecked(year, month, 1).slice(0, 7)}, got ${String(day)}`,
    );
  }
  return ok(brandCivilDate(year, month, day));
}

const CANONICAL_CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Serializes `date` to its canonical `YYYY-MM-DD` form.
 * Re-validates so a forged/`as`-cast CivilDate cannot emit unparseable wire
 * (programmer fault → throw).
 */
export function civilDateToCanonicalString(date: CivilDate): string {
  const checked = civilDateFromParts(date.year, date.month, date.day);
  if (!checked.ok) {
    throw new Error(`civilDateToCanonicalString: invalid CivilDate (${checked.error.code}): ${checked.error.message}`);
  }
  return formatCivilDateUnchecked(checked.value.year, checked.value.month, checked.value.day);
}

/** Parses the canonical `YYYY-MM-DD` form produced by `civilDateToCanonicalString`. */
export function parseCivilDate(canonical: string): Result<CivilDate, CivilDateErrorCode> {
  const match = CANONICAL_CIVIL_DATE_PATTERN.exec(canonical);
  if (match === null) {
    return err('MALFORMED_CANONICAL_STRING', `not a canonical AFENDA civil date string: ${canonical}`);
  }
  const year = match[1];
  const month = match[2];
  const day = match[3];
  if (year === undefined || month === undefined || day === undefined) {
    return err('MALFORMED_CANONICAL_STRING', `not a canonical AFENDA civil date string: ${canonical}`);
  }
  return civilDateFromParts(Number(year), Number(month), Number(day));
}

/** Total order on civil dates: negative if `a` is before `b`, positive if after, zero if equal. */
export function compareCivilDates(a: CivilDate, b: CivilDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Equality via total order. */
export function civilDateEquals(a: CivilDate, b: CivilDate): boolean {
  return compareCivilDates(a, b) === 0;
}
