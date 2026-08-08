// Root public API of @afenda/time. Consumers must import from the package root
// ("@afenda/time"), never from a src/* subpath — enforced by .dependency-cruiser.cjs's
// no-cross-package-src-import rule (SCC-05).

export type { Instant, EpochMillis, InstantErrorCode } from './instant.ts';
export {
  MIN_EPOCH_MILLIS,
  MAX_EPOCH_MILLIS,
  toEpochMillis,
  makeInstant,
  instantFromEpochMillis,
  instantToCanonicalString,
  parseInstant,
  compareInstants,
  instantEquals,
} from './instant.ts';

export type { CivilDate, CivilDateErrorCode } from './civil-date.ts';
export {
  civilDateFromParts,
  civilDateToCanonicalString,
  parseCivilDate,
  compareCivilDates,
  civilDateEquals,
} from './civil-date.ts';

export type { AsOf } from './as-of.ts';
export { makeAsOf } from './as-of.ts';

export type { Clock } from './clock.ts';
export { fixedClock } from './clock.ts';

export { systemClock } from './system-clock.ts';
