// EXPECT_ERROR: not assignable to type 'PublicErrorDetailValue'
import type { PublicErrorDetails } from '@afenda/errors';
import type { Money } from '@afenda/money';

declare const domainMoney: Money;
// A generic, non-authoritative diagnostic details field must never accept an
// authoritative Money value directly — Money is structurally not a member of
// `PublicErrorDetailValue` (string | number | boolean | null). An amount that
// legitimately needs to appear in a diagnostic must cross as its canonical
// decimal STRING (see packages/contracts/src/result-transport.ts).
const bad: PublicErrorDetails = { amount: domainMoney };
export { bad };
