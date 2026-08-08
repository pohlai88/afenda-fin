// Shared, read-only structural checks for governance/control-implementation.json
// and package.json dependency pin policy.
//
// Control-map: shape/completeness only (every SCC-01..27 and V01..18 present
// exactly once, states drawn from the fixed enum, implemented ⇒ non-empty gate +
// evidence). It does not and cannot judge whether an assigned state is
// semantically honest — that judgment is recorded by a human/agent in
// governance/CONTROL_PLANE_REPORT.md, not derived mechanically.

export const VALID_STATES = ['implemented', 'partial', 'not-yet-built', 'blocked', 'not-applicable-current-tree'] as const;
export type ControlState = (typeof VALID_STATES)[number];

export interface ControlMapReport {
  ok: boolean;
  failures: string[];
}

function expectedIds(count: number, prefix: string, separator: string): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    ids.push(`${prefix}${separator}${String(i).padStart(2, '0')}`);
  }
  return ids;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function checkControlMapCompleteness(data: unknown): ControlMapReport {
  const failures: string[] = [];
  const obj = (data ?? {}) as Record<string, unknown>;
  const stackControls = (obj['stack_controls'] ?? []) as Record<string, unknown>[];
  const vControls = (obj['doctrine_verification_controls'] ?? []) as Record<string, unknown>[];

  checkIdSet(stackControls, expectedIds(27, 'SCC', '-'), 'control_id', 'stack_controls', failures);
  checkIdSet(vControls, expectedIds(18, 'V', ''), 'control_id', 'doctrine_verification_controls', failures);
  checkStates(stackControls, 'stack_controls', failures);
  checkStates(vControls, 'doctrine_verification_controls', failures);
  // "NOT-YET-BUILT is not PASS": implemented requires a named gate and at least
  // one evidence string. This does not prove the gate is honest — only that
  // "implemented" cannot be a bare label with nothing behind it.
  checkImplementedHasGateAndEvidence(stackControls, 'stack_controls', failures);
  checkImplementedHasGateAndEvidence(vControls, 'doctrine_verification_controls', failures);

  return { ok: failures.length === 0, failures };
}

function checkIdSet(
  items: Record<string, unknown>[],
  expected: string[],
  idKey: string,
  label: string,
  failures: string[],
): void {
  const seen = items.map((it) => asString(it[idKey]));
  const seenSet = new Set(seen);
  if (seenSet.size !== seen.length) {
    failures.push(`${label}: duplicate ${idKey} values present`);
  }
  const missing = expected.filter((id) => !seenSet.has(id));
  const unexpected = seen.filter((id) => !expected.includes(id));
  if (missing.length > 0) failures.push(`${label}: missing ${missing.join(', ')}`);
  if (unexpected.length > 0) failures.push(`${label}: unexpected id(s) ${unexpected.join(', ')}`);
}

/**
 * Version portion of a package.json dependency spec.
 * Handles plain "1.2.3", "npm:pkg@1.2.3", and "npm:@scope/pkg@1.2.3".
 * Returns the empty string when an npm: alias has no version segment.
 */
export function dependencySpecVersion(spec: string): string {
  if (!spec.startsWith('npm:')) {
    return spec;
  }
  const body = spec.slice('npm:'.length);
  if (body.startsWith('@')) {
    const slash = body.indexOf('/');
    if (slash === -1) return '';
    const at = body.indexOf('@', slash + 1);
    if (at === -1) return '';
    return body.slice(at + 1);
  }
  const at = body.lastIndexOf('@');
  if (at === -1) return '';
  return body.slice(at + 1);
}

/**
 * Rejects unapproved dependency ranges (^ or ~) and floating tags (`latest`)
 * in package.json. Exact npm aliases (`npm:pkg@1.2.3`) are allowed; ranges or
 * `latest` inside the version portion are not.
 */
export function checkDependencyPinsAreExact(packageJson: Record<string, unknown>): ControlMapReport {
  const failures: string[] = [];
  for (const field of ['dependencies', 'devDependencies']) {
    const deps = packageJson[field] as Record<string, unknown> | undefined;
    if (deps === undefined) continue;
    for (const [name, rawSpec] of Object.entries(deps)) {
      const spec = typeof rawSpec === 'string' ? rawSpec : '';
      const version = dependencySpecVersion(spec);
      if (version.startsWith('^') || version.startsWith('~') || version === 'latest' || spec === 'latest') {
        failures.push(`${field}.${name}: unapproved range/floating spec "${spec}"`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function checkStates(items: Record<string, unknown>[], label: string, failures: string[]): void {
  for (const item of items) {
    const state = asString(item['state']);
    if (!(VALID_STATES as readonly string[]).includes(state)) {
      const id = asString(item['control_id']) || '?';
      failures.push(`${label}: ${id} has invalid state "${state}"`);
    }
  }
}

function checkImplementedHasGateAndEvidence(
  items: Record<string, unknown>[],
  label: string,
  failures: string[],
): void {
  for (const item of items) {
    if (asString(item['state']) !== 'implemented') continue;
    const id = asString(item['control_id']) || '?';
    const gate = item['gate'];
    if (typeof gate !== 'string' || gate.trim().length === 0) {
      failures.push(`${label}: ${id} is implemented but gate is missing/empty (NOT-YET-BUILT is not PASS)`);
    }
    const evidence = item['evidence'];
    if (!Array.isArray(evidence) || evidence.length === 0 || evidence.some((e) => typeof e !== 'string' || e.trim().length === 0)) {
      failures.push(`${label}: ${id} is implemented but evidence is missing/empty (NOT-YET-BUILT is not PASS)`);
    }
  }
}
