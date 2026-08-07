// Control fixture: this file must compile with ZERO diagnostics. It exists so
// scripts/check-type-invalid.ts can distinguish "the intended fixtures failed
// for the intended reason" from "the tsconfig/program is broken and everything
// fails" — if this file ever produces a diagnostic, the negative-fixture
// harness itself is untrustworthy, not the fixtures.

import type { AsOf, Instant } from '@afenda/time';
import type { Money, MinorUnits } from '@afenda/money';
import type { MoneyWire, AsOfWire } from '@afenda/contracts';

declare const minorUnits: MinorUnits;
declare const currency: Money['currency'];
const goodMoney: Money = { currency, minorUnits };

declare const businessAsOf: Instant;
declare const knowledgeAsOf: Instant;
const goodAsOf: AsOf = { businessAsOf, knowledgeAsOf };

const goodMoneyWire: MoneyWire = { currency: 'MYR', minorUnits: '12345' };
const goodAsOfWire: AsOfWire = { businessAsOf: '2025-01-01T00:00:00.000Z', knowledgeAsOf: '2025-04-01T00:00:00.000Z' };

export { goodMoney, goodAsOf, goodMoneyWire, goodAsOfWire };
