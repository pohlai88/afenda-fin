// Shared, read-only structural check for governance/control-implementation.json.
// Verifies shape/completeness only (every SCC-01..27 and V01..18 present exactly
// once, states drawn from the fixed enum). It does not and cannot judge whether an
// assigned state is semantically honest — that judgment is recorded by a human/agent
// in governance/CONTROL_PLANE_REPORT.md, not derived mechanically.

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
 * Rejects unapproved dependency ranges (^ or ~) in package.json. The npm alias
 * syntax "npm:pkg@1.2.3" is exact and explicitly allowed; a leading ^ or ~ inside
 * the version portion is not.
 */
export function checkDependencyPinsAreExact(packageJson: Record<string, unknown>): ControlMapReport {
  const failures: string[] = [];
  for (const field of ['dependencies', 'devDependencies']) {
    const deps = packageJson[field] as Record<string, unknown> | undefined;
    if (deps === undefined) continue;
    for (const [name, rawSpec] of Object.entries(deps)) {
      const spec = typeof rawSpec === 'string' ? rawSpec : '';
      const versionPart = spec.startsWith('npm:') ? spec.slice(spec.lastIndexOf('@')) : spec;
      if (versionPart.startsWith('^') || versionPart.startsWith('~') || spec === 'latest') {
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
