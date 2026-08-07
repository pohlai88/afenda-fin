// Control fixture: this file must compile with ZERO diagnostics. It exists so
// scripts/check-type-invalid.ts can distinguish "the intended fixtures failed
// for the intended reason" from "the tsconfig/program is broken and everything
// fails" — if this file ever produces a diagnostic, the negative-fixture
// harness itself is untrustworthy, not the fixtures.

import type { AsOf, Instant } from '@afenda/time';
import type { Money, MinorUnits } from '@afenda/money';

declare const minorUnits: MinorUnits;
declare const currency: Money['currency'];
const goodMoney: Money = { currency, minorUnits };

declare const businessAsOf: Instant;
declare const knowledgeAsOf: Instant;
const goodAsOf: AsOf = { businessAsOf, knowledgeAsOf };

export { goodMoney, goodAsOf };
