// Shared, read-only structural check for governance/control-implementation.json.
// Verifies shape/completeness only (every SCC-01..27 and V01..18 present exactly
// once, states drawn from the fixed enum). It does not and cannot judge whether an
// assigned state is semantically honest — that judgment is recorded by a human/agent
// in governance/CONTROL_PLANE_REPORT.md, not derived mechanically.

/** @type {readonly string[]} */
export const VALID_STATES = ['implemented', 'partial', 'not-yet-built', 'blocked', 'not-applicable-current-tree'];

/**
 * @typedef {{ ok: boolean, failures: string[] }} ControlMapReport
 */

/**
 * @param {number} count
 * @param {string} prefix
 * @param {string} separator
 * @returns {string[]}
 */
function expectedIds(count, prefix, separator) {
  /** @type {string[]} */
  const ids = [];
  for (let i = 1; i <= count; i += 1) {
    ids.push(`${prefix}${separator}${String(i).padStart(2, '0')}`);
  }
  return ids;
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function asString(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * @param {unknown} data
 * @returns {ControlMapReport}
 */
export function checkControlMapCompleteness(data) {
  /** @type {string[]} */
  const failures = [];
  const obj = /** @type {Record<string, unknown>} */ (data ?? {});
  const stackControls = /** @type {Array<Record<string, unknown>>} */ (obj['stack_controls'] ?? []);
  const vControls = /** @type {Array<Record<string, unknown>>} */ (obj['doctrine_verification_controls'] ?? []);

  checkIdSet(stackControls, expectedIds(27, 'SCC', '-'), 'control_id', 'stack_controls', failures);
  checkIdSet(vControls, expectedIds(18, 'V', ''), 'control_id', 'doctrine_verification_controls', failures);
  checkStates(stackControls, 'stack_controls', failures);
  checkStates(vControls, 'doctrine_verification_controls', failures);

  return { ok: failures.length === 0, failures };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string[]} expected
 * @param {string} idKey
 * @param {string} label
 * @param {string[]} failures
 */
function checkIdSet(items, expected, idKey, label, failures) {
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
 * @param {Record<string, unknown>} packageJson
 * @returns {ControlMapReport}
 */
export function checkDependencyPinsAreExact(packageJson) {
  /** @type {string[]} */
  const failures = [];
  for (const field of ['dependencies', 'devDependencies']) {
    const deps = /** @type {Record<string, unknown> | undefined} */ (packageJson[field]);
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

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} label
 * @param {string[]} failures
 */
function checkStates(items, label, failures) {
  for (const item of items) {
    const state = asString(item['state']);
    if (!VALID_STATES.includes(state)) {
      const id = asString(item['control_id']) || '?';
      failures.push(`${label}: ${id} has invalid state "${state}"`);
    }
  }
}
