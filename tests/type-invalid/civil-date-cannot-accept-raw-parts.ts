// EXPECT_ERROR: '[civilDateBrand]' is missing
//
// CivilDate is branded; only civilDateFromParts / parseCivilDate may construct
// one. A raw calendar-shaped object (including invalid dates like Feb 30) must
// not type-check as CivilDate — encode paths must not accept unvalidated parts.

import type { CivilDate } from '@afenda/time';

const bad: CivilDate = { year: 2026, month: 2, day: 30 };

export { bad };
