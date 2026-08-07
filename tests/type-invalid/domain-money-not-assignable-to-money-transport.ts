// EXPECT_ERROR: not assignable to type 'CanonicalMoney'
import type { MoneyWire } from '@afenda/contracts';
import type { Money } from '@afenda/money';

declare const domainMoney: Money;
// Domain Money (branded MinorUnits bigint) must never be usable directly as
// the JSON transport shape (string minorUnits) — transport/domain separation
// (phase brief §4/§10) is a real, compiler-enforced type distinction, not
// just documentation.
const bad: MoneyWire = domainMoney;
export { bad };
