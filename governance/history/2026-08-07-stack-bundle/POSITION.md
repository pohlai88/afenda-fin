# AFENDA — POSITION

**v1.0 · market-position record · evidence-gated · non-normative**

**Precedence:** `DOCTRINE.md` governs what must be true. The AFENDA Stack Selection Record governs the approved implementation stack. This document governs **what AFENDA may claim, to whom, and on what evidence**.

This is **not a third technical authority**. It cannot amend the doctrine, relax a control, choose a technology, or create a customer exception. Where this document conflicts with the doctrine or stack record, this document loses.

**Integrity:** record the adopted file’s SHA-256 in repository governance. The file does not embed its own digest.

---

## 0. Purpose and operating rule

AFENDA needs one market position, not a catalogue of technical strengths.

The position is:

> # **The ERP you can customize and still upgrade.**

That is the long-term category claim. It is not automatically the claim AFENDA may publish today.

The current public wording must follow the evidence ladder in §8. Until AFENDA has crossed real version boundaries with real deployments, the permitted language is deliberately narrower.

**Operating rule:**

> **One claim. One proof artifact. Claims advance only when evidence advances.**

Database-enforced financial integrity, open deployment, AI assistance, metadata-driven configuration, self-hosting, and a modern user experience remain important product qualities. They support trust and usability; they do not compete for the headline.

---

## 1. The buyer and the pain

### 1.1 Primary buyer

AFENDA’s initial position is for:

- finance directors and CFOs responsible for reliable books and controlled change;
- CIOs, ERP owners, and operations leaders responsible for custom workflows and upgrades;
- implementation partners who want reusable extension IP and predictable upgrade work;
- multi-company organisations in Malaysia and Southeast Asia that require meaningful customisation but cannot tolerate indefinite upgrade projects.

### 1.2 The problem

Customisation creates business value, but in many ERP ecosystems it also creates uncertainty at the next version boundary.

Official Odoo guidance for customised databases requires the custom codebase to be frozen, updated for the target version, installed and tested against upgraded databases, and checked for renamed or removed methods, fields, views, and XPath targets. Odoo’s guidance also warns that installability alone does not establish runtime compatibility.[^odoo-upgrade] Odoo’s view-extension model formally supports inherited views whose modifications are located through XPath or matching nodes.[^odoo-view]

Frappe formally supports hooks that override or extend core behaviour, resolves conflicting hooks by installation order with “last writer wins” for overrides, and permits complete class and method overrides.[^frappe-hooks] It also supports server-side Python scripts stored and administered as Server Script documents, although they are disabled by default on shared benches for security reasons.[^frappe-scripts]

These facts do **not** prove that Odoo or ERPNext are poor products. They establish the relevant product problem:

> The more custom behaviour depends on inherited structure, override order, internal methods, or runtime scripts, the more upgrade compatibility must be rediscovered through code adaptation and testing.

AFENDA’s position is to make that dependency explicit before the upgrade starts.

---

## 2. The promise—stated precisely

“The ERP you can customize and still upgrade” does **not** mean:

- no AFENDA release will ever contain a breaking change;
- every extension will work forever without migration;
- every migration will be automatic;
- customers never need to test an upgrade;
- AFENDA will support every historical version indefinitely;
- custom business requirements become free to maintain.

It means:

> **Before a target release reaches production, AFENDA evaluates the exact installed deployment and produces a factual result for every extension: compatible, compatible with migration, requires manual action, incompatible, superseded by core, or unknown. Unknown is release-blocking.**

The promise is therefore not “nothing will break.”

The promise is:

> **No upgrade by guesswork. No undisclosed extension dependency. No compatibility result without evidence.**

A successful upgrade may still require work. AFENDA’s obligation is to identify that work, its cause, its migration path, and its support window before production is changed.

---

## 3. The proof artifact

The product expression of the position is:

> # **The AFENDA Upgrade Compatibility Report**

The report is generated for **one actual deployment** against **one target core release**.

### 3.1 Required inputs

The report consumes:

- current and target AFENDA core versions;
- the installed deployment manifest;
- every installed extension ID and version;
- required and supplied capability versions;
- contract-surface diffs;
- extension migrations and dependency order;
- permission and trust-scope changes;
- configuration compatibility;
- supported runtime and database profile;
- applicable behavioural compatibility tests;
- deprecation and supersession records.

### 3.2 Required result classes

Every installed extension receives exactly one result:

| Result | Meaning | Upgrade treatment |
|---|---|---|
| **Compatible** | Declared contracts, permissions, migrations, and applicable behaviour checks pass | May proceed |
| **Compatible with automatic migration** | A reviewed deterministic migration is available and its checks pass | May proceed through controlled migration |
| **Compatible with manual action** | Compatibility is achievable, but a named customer or partner decision is required | Block until action is accepted |
| **Incompatible** | A required contract or behaviour cannot be satisfied by the target release | Block |
| **Superseded by core** | The extension capability now exists in core and an approved transition exists | Migrate, then retire the extension |
| **Unknown** | Evidence is missing, contradictory, unexecutable, or outside the supported profile | Block |

“Unknown” may never be silently converted to “compatible.”

### 3.3 Compatibility dimensions

A single green type check is insufficient. The report distinguishes:

1. **Contract compatibility** — required capabilities and signatures still exist.
2. **Data compatibility** — schema and data migrations are ordered, valid, and reversible or explicitly irreversible.
3. **Permission compatibility** — requested authority remains declared and allowed.
4. **Configuration compatibility** — selected policies and settings remain valid.
5. **Behaviour compatibility** — applicable reference and extension tests pass.
6. **Operational compatibility** — supported database, runtime, resource, trust, and deployment requirements remain satisfied.

### 3.4 Example

```text
AFENDA UPGRADE COMPATIBILITY REPORT
Deployment: dlbb-production
Core: 1.4.2 → 1.5.0
Extensions: 14

Compatible                         11
Compatible with automatic migration 2
Blocked                              1
Unknown                              0

BLOCKED
Extension: acme.credit_check
Installed version: 2.4.1
Required contract: policy:tax.resolveRate@2
Target core supplies: policy:tax.resolveRate@3
Affected operations:
  - invoice.approve
  - credit-note.approve
Migration:
  - adapter tax-rate-v2-to-v3 is available
  - extension behavioural suite has not passed against the adapter
Required action:
  - install acme.credit_check 3.x; or
  - qualify and approve the adapter
```

### 3.5 Evidence and integrity

Every report records:

- generation time;
- source and target versions;
- deployment-manifest digest;
- contract-registry digest;
- compatibility-engine version;
- test and migration evidence;
- unresolved findings;
- report digest.

The report is a release artifact, not a sales illustration.

---

## 4. Why AFENDA can make this structural

AFENDA begins with a closed, versioned extension model rather than retrofitting one after a large extension ecosystem exists.

The permitted extension kinds remain governed by the doctrine:

- `hook`;
- `policy`;
- `field-extension`;
- `view-slot`;
- `document-type`;
- `scheduled-operation`.

Every extension declares:

- required and supplied contracts;
- compatible core range;
- lifecycle;
- dependencies;
- permissions;
- data and network scope;
- migrations;
- failure behaviour;
- trust level;
- removal and retention rules.

AFENDA forbids arbitrary method overrides, imports from another module’s internals, unnamed UI injection, and runtime-editable financial logic. Those restrictions are not aesthetic. They are what make the compatibility report possible.

### 4.1 Competitive path dependence—stated defensibly

AFENDA must not claim that an incumbent is technically incapable of introducing contract-based extensions.

The defensible statement is:

> Existing ERP ecosystems built around inheritance, overrides, hooks, structural view modification, and site-specific scripts cannot replace those mechanisms with a contract-native model without carrying a parallel compatibility layer or imposing substantial migration cost on their installed ecosystem.

Their ecosystem is an advantage and a source of path dependence. AFENDA’s opportunity is to begin with the analysable model before it accumulates the same legacy burden.

### 4.2 The moat is not a PDF

Other products and consultancies can produce upgrade assessments or migration scanners.

AFENDA’s distinction must be:

> **The report is derived from native declared contracts, the actual deployment manifest, controlled migrations, and executable compatibility evidence—not only from heuristic source scanning or consultant judgment.**

If AFENDA permits undeclared escape hatches, the position collapses.

---

## 5. Product obligations created by the position

The position is a promise with engineering and operating consequences.

### POS-01 — Complete declaration

Every installed extension has a unique identity, version, owner, contract manifest, lifecycle, trust level, and dependency set.

**Target:** 100%.

### POS-02 — Report before release

Every supported core version boundary generates a compatibility report for:

- the reference extension suite;
- every supported internal deployment;
- every customer deployment scheduled for upgrade.

A release without the required report is incomplete.

### POS-03 — Unknown blocks

Missing or contradictory compatibility evidence produces `Unknown`, and `Unknown` blocks the upgrade.

### POS-04 — Breaking changes are named

Every breaking contract change records:

- affected contract;
- reason;
- classification;
- migration path;
- compatibility window;
- required customer or partner action;
- applicable tests.

### POS-05 — Capability is preserved where legitimate

Deprecation should migrate the mechanism without casually removing the legitimate business capability.

Example:

```text
Old need:
Add a customer-specific field.

Old mechanism:
Ad-hoc field or runtime modification.

New mechanism:
Generated field-extension declaration with equivalent field,
permissions, migration, and compatibility visibility.
```

Where equivalent capability cannot yet be preserved, the migration is not complete.

### POS-06 — Support window is published

Before the first public release, AFENDA publishes:

- supported core-version count;
- minimum support duration;
- security-only tail period;
- extension compatibility-window policy;
- end-of-support behaviour.

The values belong in the release and support policy, not as an invented promise in this position record.

### POS-07 — Evidence survives the release

Compatibility reports, contract diffs, migration results, and reference-suite outcomes remain publicly inspectable for every released version boundary.

---

## 6. Proving the claim before the market can prove it for us

The position is initially invisible because one release cannot demonstrate upgrade behaviour.

AFENDA must manufacture legitimate evidence from the first version boundary.

### 6.1 Reference extension suite

Maintain representative extensions covering every allowed kind:

```text
reference-hook
reference-policy
reference-field-extension
reference-view-slot
reference-document-type
reference-scheduled-operation
```

The suite must contain:

- compatible changes;
- intentionally incompatible changes;
- automatic migrations;
- manual-decision migrations;
- permission changes;
- data-shape changes;
- deprecations;
- supersession by core;
- dependency-order changes;
- unsupported and unknown cases.

### 6.2 Public version-boundary record

For every boundary beginning with `0.1 → 0.2`, publish:

```text
extensions evaluated
compatible
automatic migration
manual action
incompatible
unknown
false-compatible findings after release
migration failures
```

The objective is not to claim that contracts never change.

The objective is:

> Every change is classified before production, and the public record shows whether the classification was correct.

### 6.3 Compatibility mutants

The compatibility engine must demonstrate that it can turn red when faults are injected.

Minimum mutants include:

- remove a required capability;
- change a policy signature;
- remove a view slot;
- change a field type;
- omit a migration;
- reorder migration dependencies;
- widen a permission;
- conceal an internal import;
- permit an undeclared dependency;
- mark a failed behavioural test as compatible;
- replace `Unknown` with `Compatible`.

A surviving critical compatibility mutant blocks release.

---

## 7. Evidence ladder and permitted market language

The long-term position is fixed. The wording AFENDA may publish advances with evidence.

| Grade | Required evidence | Permitted public wording |
|---|---|---|
| **E0 — Hypothesis** | Architecture and market thesis only | **Built for upgrade-safe customization** |
| **E1 — Specified** | Contract model, result classes, report schema, and gates defined | **Every customization has a declared upgrade contract** |
| **E2 — Tested** | Reference extensions cross at least one real version boundary and reports are generated | **Know what will break before you upgrade** |
| **E3 — Mutation-sensitive** | Relevant compatibility faults make the actual gate fail | **Compatibility checks that demonstrably turn red** |
| **E4 — Independently verified** | External extension authors successfully cross version boundaries | **Upgrade compatibility verified beyond AFENDA’s own extensions** |
| **E5 — Customer-qualified** | Real customer deployments complete controlled production upgrades with no false-compatible result | **The ERP you can customize and still upgrade** |
| **E6 — Operationally proven** | Repeated customer upgrades across multiple releases, with published outcomes and incident-derived regressions | **A published record of upgrade-safe customization** |

### Current honest grade at adoption

| Item | Grade |
|---|---|
| Market demand and willingness to choose AFENDA for this position | **E0** |
| Positioning mechanism and proof-artifact specification | **E1** |
| Compatibility-report implementation | **E0 until executable** |
| Reference-suite version-boundary evidence | **E0** |
| Customer upgrade safety | **E0** |
| Partner-margin proposition | **E0** |

Marketing may never outrun this table.

---

## 8. Falsifiable measures

The following metrics directly test the position.

| Metric | Target |
|---|---:|
| Installed extensions with complete declared contracts | **100%** |
| Supported upgrades evaluated before production | **100%** |
| Upgrade reports with `Unknown` at production approval | **0** |
| False-compatible results discovered after upgrade | **0** |
| Breaking contract changes with named migration/action | **100%** |
| Required compatibility reports missing at release | **0** |
| Reference extension kinds covered by version-boundary tests | **100%** |
| Critical compatibility mutants surviving | **0** |
| Deprecations without preserved capability or documented exception | **0** |
| Customer/partner upgrade effort measured | **100% of qualified upgrades** |

A false-compatible result is the direct falsifier:

> AFENDA said an extension was compatible, the upgrade proceeded, and the extension failed because of an incompatibility the report should have detected.

When that occurs:

1. downgrade the applicable evidence grade immediately;
2. publish the finding;
3. add a permanent regression and mutant;
4. correct the report engine;
5. do not defend the claim through wording.

---

## 9. Partner position

The customer promise and partner proposition use the same mechanism.

### Customer value

- know the affected extension before production;
- see the exact dependency and migration;
- schedule work around close, audit, and peak periods;
- avoid discovering compatibility only through runtime failure;
- retain the freedom to postpone while understanding the consequence.

### Partner value hypothesis

> **Build customer value once; do not rediscover the same upgrade breakage every year.**

AFENDA should help partners:

- reuse extensions across customers;
- declare supported core ranges;
- estimate upgrade work before quoting;
- package migrations;
- certify extensions;
- reduce emergency rework;
- spend more effort on new customer value.

This remains E0 until partner interviews and delivery data validate it.

Measure:

- partner hours spent on upgrade diagnosis;
- percentage of extension IP reused;
- forecast versus actual upgrade effort;
- gross margin on upgrade projects;
- emergency defects after upgrade.

Not every partner will prefer this model. Some businesses profit from bespoke rework. AFENDA’s initial partners are those seeking reusable IP, predictable delivery, and stronger customer trust.

---

## 10. Secondary fleet-learning flywheel

Fleet learning is not the launch position and must not compete with the upgrade claim.

It becomes a future advantage only when AFENDA has a fleet and customer permission.

### 10.1 Permitted collection

Only explicit opt-in structural telemetry may be collected:

- extension kind;
- target public operation or contract;
- declaration shape;
- extension and core versions;
- compatibility result;
- use frequency expressed in approved aggregate categories.

Prohibited:

- field values;
- transaction or business data;
- free text;
- source code;
- customer identity in the analytical dataset;
- pricing logic, formulas, yield models, or process details capable of identifying a customer.

Every participating customer receives a visible record of what was collected.

### 10.2 Pattern use

A repeated pattern is a signal to investigate, not a specification to copy.

Core absorption requires:

- multiple independent deployments;
- a coherent generalisation written before code;
- evidence that the capability is generic rather than vertical;
- permanent owner;
- migration and supersession path;
- domain tests and mutants;
- explicit rejections where the pattern is not absorbed.

The numerical threshold is a measured default, not a constitutional truth.

### 10.3 Partner boundary

Default ecosystem rule:

- generic and infrastructural capabilities may be candidates for core;
- vertical and industry-specific capabilities normally remain partner territory.

Exceptions require a written ecosystem-impact assessment.

---

## 11. Deprecation and customer trust

### 11.1 Classes

Every deprecation is classified as:

| Class | Required basis | Forced migration |
|---|---|---|
| **Security** | Specific vulnerability or exploitable condition | Yes, under emergency policy |
| **Correctness** | Demonstrably wrong financial, statutory, privacy, or security outcome | Yes, through a controlled window |
| **Structurally incompatible** | Unanalysable, unmigratable, or invisible to the compatibility system | Yes, after a supported migration path |
| **Preference** | Cleaner or more desirable implementation without loss of compatibility | No forced migration solely for preference |

“Security” may not be used as a label for ordinary cleanup.

### 11.2 Honest migration test

Before forcing an architectural migration, answer:

> **What legitimate need did the old mechanism serve that the new mechanism does not?**

If a legitimate need remains uncovered, the replacement is incomplete.

### 11.3 Notice

The compatibility report is the **authoritative per-deployment compatibility record**, but it is not the only communication channel.

Depending on severity and contract, notice may also be delivered through:

- release notes;
- administrator dashboard;
- email;
- partner portal;
- security advisory;
- customer success or implementation process.

A security notice must never depend on a customer opening an upgrade report.

### 11.4 Refusal and timing

A customer may reasonably postpone an upgrade because of:

- period close;
- audit;
- peak trading or production;
- regulatory validation;
- an unmodelled business requirement;
- insufficient people remaining who understand the extension.

The report makes the consequence known. It does not erase the customer’s right to choose timing within the published support window.

---

## 12. What AFENDA does not claim

AFENDA does not initially claim:

- the broadest ERP module catalogue;
- the largest extension marketplace;
- every country localisation;
- the largest implementation-partner network;
- the longest operating history;
- zero-effort upgrades;
- fully autonomous accounting;
- that open source, AI, metadata, or a modern UI are unique.

Buyers who require hundreds of mature modules, a large existing marketplace, extensive global localisation, or a deep established implementation network may be better served by Odoo or ERPNext today.

Saying this plainly strengthens the position. AFENDA is competing first on upgrade visibility and controlled extensibility—not installed breadth.

---

## 13. Approved messaging

### 13.1 E0 launch-era wording

**Headline**

> **Built for upgrade-safe customization**

**Subhead**

> AFENDA gives every extension a declared contract, so customization can be evaluated rather than rediscovered at upgrade time.

### 13.2 E2 wording

**Headline**

> **Know what will break before you upgrade**

**Subhead**

> AFENDA checks your exact deployment against the target release and identifies compatible extensions, required migrations, manual actions, and blockers before production changes.

**Proof CTA**

> View the Upgrade Compatibility Report

### 13.3 E5 category position

**Headline**

> **The ERP you can customize and still upgrade**

**Subhead**

> Every AFENDA extension depends on a versioned public contract. Before an upgrade, AFENDA shows what remains compatible, what needs migration, and the exact reason for every blocker.

### 13.4 Internal one-sentence position

> AFENDA turns ERP upgrade compatibility from a consulting discovery exercise into a versioned, deployment-specific, machine-checkable product capability.

---

## 14. Revisit triggers

Review this position when evidence shows any of the following:

1. buyer interviews do not rank customisation-driven upgrade risk among the highest-value problems;
2. customers value module breadth materially more than upgrade visibility in the chosen segment;
3. the compatibility report does not change purchase, upgrade, or partner decisions;
4. false-compatible results persist despite corrective controls;
5. the closed extension model prevents legitimate customer value that cannot be represented safely;
6. partners do not achieve better reuse or delivery economics;
7. a competitor offers materially equivalent contract-native, deployment-specific compatibility evidence;
8. market or jurisdiction changes make another pain more urgent.

Competitive fashion, adjacent funding announcements, and stylistic preference are not evidence.

A contradicted claim is downgraded immediately. It is not defended through softer wording.

---

## 15. Adoption status and open decisions

### Adopted

- one long-term position;
- one proof artifact;
- staged public language;
- unknown compatibility blocks;
- public version-boundary evidence;
- reference extension suite;
- contract-native report rather than heuristic-only scanning;
- partner proposition as a measured hypothesis;
- explicit limitations.

### Must be decided before first public release

1. supported core-version count;
2. minimum support duration;
3. security-only tail period;
4. minimum extension compatibility window;
5. report signing and retention policy;
6. customer and partner upgrade-notice obligations;
7. initial reference extension suite;
8. compatibility-engine ownership and incident process.

These decisions belong in support, release, and operational policy. They do not require another positioning rewrite.

---

## 16. Source basis

Verified **7 August 2026**.

[^odoo-upgrade]: Odoo 19 documentation, **Upgrade a customized database**. Odoo describes the need to freeze custom development, update custom modules, address moved/removed XPath targets and methods, and test customisation thoroughly, including runtime behaviour.  
    <https://www.odoo.com/documentation/19.0/developer/howtos/upgrade_custom_db.html>

[^odoo-view]: Odoo 19 documentation, **View records — Inheritance**. Odoo documents inherited views whose modifications use XPath or other node locators and are applied through view-resolution order.  
    <https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_records.html>

[^frappe-hooks]: Frappe Framework documentation, **Hooks**. Frappe documents hooks that override or extend behaviour, installation-order resolution, “last writer wins” for overrides, class overrides, method overrides, and extension mixins.  
    <https://docs.frappe.io/framework/user/en/python-api/hooks>

[^frappe-scripts]: Frappe Framework documentation, **Server Script**. Frappe documents server-side Python scripts defined through Server Script records and notes that they are disabled by default on shared benches from version 15 for security.  
    <https://docs.frappe.io/framework/user/en/desk/scripting/server-script>

---

## 17. Final rule

> **Do not market architecture. Market the customer pain the architecture uniquely makes measurable.**

AFENDA’s technical strengths earn trust. The upgrade compatibility report earns the position.

The position is not proven when the document is adopted.

It is proven one version boundary, one extension, one customer, and one accurately predicted upgrade at a time.
