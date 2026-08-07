// Root public API of @afenda/contracts. Consumers must import from the package
// root ("@afenda/contracts"), never from a src/* subpath — enforced by
// .dependency-cruiser.cjs's no-cross-package-internal-import rule (SCC-05).

export type { MoneyWire, MoneyTransportErrorCode } from './money-transport.ts';
export { MoneyWireSchema, decodeMoneyTransport, encodeMoneyTransport } from './money-transport.ts';

export type { InstantWire, InstantTransportErrorCode } from './instant-transport.ts';
export { InstantWireSchema, decodeInstantTransport, encodeInstantTransport } from './instant-transport.ts';

export type { CivilDateWire, CivilDateTransportErrorCode } from './civil-date-transport.ts';
export { CivilDateWireSchema, decodeCivilDateTransport, encodeCivilDateTransport } from './civil-date-transport.ts';

export type { AsOfWire, AsOfTransportErrorCode } from './as-of-transport.ts';
export { AsOfWireSchema, decodeAsOfTransport, encodeAsOfTransport } from './as-of-transport.ts';

export type { PublicFailureWire } from './result-transport.ts';
export { PublicErrorDetailValueSchema, PublicFailureWireSchema, encodeFailureTransport, decodeFailureTransportShape } from './result-transport.ts';
