# AFENDA — EVIDENCE-BACKED FINANCIAL SYSTEMS DOCTRINE

**Version 1.0 · single authority · source-backed · falsifiable · designed to turn red**

**Status:** Final normative baseline for adoption.  
**Evidence date:** 6 August 2026.  
**Supersedes as doctrine authority:** prior AFENDA-VIBE Charter, Articles, Annexes, and v5 doctrine drafts. Those files may remain only as implementation evidence or amendment history; they are not authority after this document is adopted.

---

## 0. The promise—and the limit

This doctrine is designed to eliminate two dangerous substitutions:

1. **Opinion substituted for a requirement.**
2. **A citation or green test substituted for proof.**

Every binding rule below has:

- a permanent identifier;
- an authority class;
- one or more external sources;
- an explanation of why the method is justified;
- a required implementation method;
- a required fault that must make the system turn red;
- qualification evidence;
- an honest current AFENDA evidence grade.

**External sources establish the basis for a rule. They do not prove AFENDA implements it.**  
**A green test proves only the behavior it exercised.**  
**A killed mutant proves sensitivity only to that mutant.**  
**An independent oracle reduces common-mode error; it does not remove all error.**  
**“Battle-proven” is reserved for sustained operational evidence, not documents or laboratory tests.**

This is therefore a **tested-doctrine framework**, not a document that falsely declares every implementation solved in advance.

---

## 1. Authority classes

| Marker | Meaning | Change threshold |
|---|---|---|
| `[C]` | Constitutional system invariant | Implementation contradiction, incident, audit finding, demonstrated harm, or superseding authoritative source |
| `[D]` | Default engineering method | Written evidence that another method satisfies the same invariant with equal or better assurance |
| `[J]` | Jurisdictional requirement | Applicable regulator/law/source version and deployment scope |
| `[C/J]` | Constitutional objective with jurisdiction-specific implementation | Both thresholds apply |

A source can support a constitutional objective without mandating AFENDA’s exact mechanism. Where the method is an AFENDA design choice, the rule says so.

---

## 2. Evidence grades

| Grade | Name | What it means |
|---|---|---|
| **E0** | Hypothesis | Desired statement, not yet precise enough to verify |
| **E1** | Specified | Unique rule, source basis, method, acceptance and red condition defined |
| **E2** | Tested | Fresh positive and negative evidence passes in a controlled environment |
| **E3** | Mutation-sensitive | Relevant injected faults make the actual mapped control fail |
| **E4** | Independently verified | A diverse oracle or independent implementation confirms the material result |
| **E5** | Qualified | E2–E4 repeated in supported deployment topology, versions, concurrency, restore, and operational conditions |
| **E6** | Operationally proven | Sustained real use, close/recovery cycles, operator evidence, and incident-derived regressions exist |

Modifiers:

- **`-R` Reported:** result is present in a supplied document or log but was not independently reproduced from the supplied bundle.
- **`RED`:** direct inspection or execution has identified a material contradiction or missing control.
- **`PARTIAL`:** some criteria are covered, but a material part of the rule remains unverified.

Only **E6** may be described as **battle-proven**.

---

## 3. Prime axiom

> **Generation is cheap. Verification is the bottleneck. Architect for the bottleneck.**

The machine may author code and tests. The human owns the judgment about what must be true, what evidence establishes it, what the evidence does not establish, and what failure means.

**A rule that lives only in prose is E1 at best.**  
**A test that cannot fail is Forbidden.**  
**A critical control graded only by its own calculation path is Forbidden.**

---

## 4. Ownership line

Tiers attach to the semantic risk of the change.

| Tier | Obligation |
|---|---|
| **Generated** | No routine line-by-line review only when traceable to reviewed inputs and fully covered by applicable gates |
| **Reviewed** | Every diff read by a human |
| **Owned** | Named human comprehends and accepts the invariant, oracle, limitations, and failure meaning; machine assistance is allowed |

Automatic escalation to Reviewed applies to financial/statutory substance, money/time semantics, security/scope/authorization, privacy, destructive migrations, concurrency, external effects, public contracts, generator infrastructure, verification infrastructure, and anything outside the current evidence spine.

---

# THE RULES



# 5. Governance and verification

### GOV-01 — Every binding rule is uniquely identifiable and individually verifiable `[C]`

**Rule.** Every binding requirement shall have a permanent identifier, an observable acceptance condition, a named verification method, and a traceable source. A requirement that cannot be assessed separately shall not be constitutional.

**Why this method is justified.** NASA’s requirements-verification guidance calls for each “shall” to have a unique identifier, a definitive source, and an identified verification approach. NIST and OWASP likewise treat verification requirements as explicit assessment objects rather than prose aspirations.

**Required implementation.** Maintain a rule registry in this single document. Each rule states: authority, source basis, required method, turn-red evidence, qualification evidence, and current evidence grade. Repealed identifiers remain tombstones and are never reused.

**Required turn-red evidence.** Delete or bypass a rule’s mapped control, or introduce a known violating fixture. The governance gate must report the exact unmapped, unverified, or violated rule identifier.

**Qualification evidence.** A fresh traceability report must show that every constitutional system invariant maps to at least one executable control or an explicitly scoped open decision, and every executable control maps back to a rule.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S01], [S02], [S04], [S06]

---

### GOV-02 — Citation establishes basis; executable evidence establishes implementation `[C]`

**Rule.** No rule may be called implemented, proven, qualified, or battle-proven merely because an external authority recommends the practice.

**Why this method is justified.** Standards and official guidance can establish that a control objective is recognized and reasonable. They cannot establish that AFENDA’s code satisfies it. NIST SP 800-53 separates control functionality from assurance, and SP 800-53A supplies assessment procedures precisely because adopting a control statement is not the same as demonstrating it.

**Required implementation.** Record two independent facts: (1) source basis, and (2) local evidence grade. Source citations may move a rule from unsupported opinion to E1 SPECIFIED; only local evidence may move it beyond E1.

**Required turn-red evidence.** Replace a working control with a no-op while leaving the citation unchanged. The system must turn red. If it stays green, the citation was being mistaken for assurance.

**Qualification evidence.** An independent assessor can reproduce the named evidence without relying on this document’s assertion that the evidence exists.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S01], [S02], [S04], [S05]

---

### GOV-03 — Critical executable controls must demonstrate that they can fail `[C]`

**Rule.** A critical executable rule is not accepted on green tests alone. At least one relevant injected fault must make the actual control turn red.

**Why this method is justified.** NIST recommends negative, structural, historical, and fuzz testing. Mutation analysis evaluates whether a test suite detects seeded faults; research shows project-tailored mutants reach fault classes generic operators miss.

**Required implementation.** Maintain an independently governed mutant corpus. Each mutant identifies the rule and real control it weakens. The mutation runner invokes the same production verification check, not a duplicate probe.

**Required turn-red evidence.** Remove the balance guard, widen a privilege, change half-even to half-up, remove a tenant/entity predicate, change a governing date, or reuse an idempotency key with a different payload. The mapped control must fail.

**Qualification evidence.** Critical mutant survival is zero in the supported qualification environment. Equivalent mutants require retained proof; waivers are time-boxed and approved by an Owned-tier owner plus an independent reviewer.

**Current AFENDA evidence grade.** **E3-R — MUTATION-SENSITIVE, REPORTED; NOT INDEPENDENTLY REPRODUCED**

**Source basis.** [S02], [S26], [S27]

---

### GOV-04 — Critical invariants require a diverse oracle `[C]`

**Rule.** A critical financial, statutory, or isolation invariant shall have at least one oracle that does not reuse the implementation’s principal calculation path.

**Why this method is justified.** Independent verification reduces common-mode failure. NASA distinguishes verification methods, NIST assessment guidance supports varied assessment procedures, and property-based testing is strongest when the property is independent of the implementation.

**Required implementation.** Examples: recompute FX from original transaction amounts and stored rates in an independently written implementation; compare ledger projections with raw-line SQL; compare generated statutory output with an independently written parser; test authorization through real database roles rather than application mocks.

**Required turn-red evidence.** Introduce a defect that preserves the implementation’s own internal consistency—for example, a consistently wrong FX conversion that still balances. At least one diverse oracle must detect it.

**Qualification evidence.** At least one independent oracle passes on supported PostgreSQL and fails under a domain mutant. The oracle’s authoring lineage and calculation path are documented.

**Current AFENDA evidence grade.** **E1 — SPECIFIED; CURRENT V2 ORACLE IS INSUFFICIENT FOR FX CORRECTNESS**

**Source basis.** [S01], [S04], [S05], [S26]

---

### GOV-05 — Evidence must be reproducible from a complete verification bundle `[C]`

**Rule.** A reported test count is not accepted as current proof unless the supplied repository contains the commands, source, dependency lock, supported environment declaration, and immutable inputs needed to reproduce it.

**Why this method is justified.** SLSA provenance describes verifiable information about where, when, and how an artifact was produced. Reproducible Builds distinguishes primary artifacts from run logs and requires source, environment, and instructions. NASA verification evidence must be objective and traceable.

**Required implementation.** Every evidence-bearing release includes package manifest, lockfile, migration set, test runners, fixtures, supported database versions, role topology, source hashes, and commands. Raw results record environment and exit status.

**Required turn-red evidence.** Remove a dependency lock, hash, migration, fixture, or runner. The evidence validation gate must reject the bundle rather than treating historical counts as proof.

**Qualification evidence.** A second environment reproduces the applicable gates from a clean checkout using only the declared bundle.

**Current AFENDA evidence grade.** **E1 — SPECIFIED; CURRENT BUNDLE INCOMPLETE**

**Source basis.** [S01], [S02], [S22], [S23]

---

### GOV-06 — Ownership attaches to risk in the change, not file type `[C]`

**Rule.** Changes affecting financial or statutory substance, money or time semantics, tenant/entity isolation, authorization, privacy, destructive migrations, concurrency, external effects, public contracts, generators, or verification infrastructure automatically require human diff review.

**Why this method is justified.** NIST SSDF and SP 800-53 organize secure development around risk-relevant practices and control assurance. A file category cannot determine risk: the same migration or test can be routine in one change and security-critical in another.

**Required implementation.** Use three obligations: Generated—mechanically verified and traceable; Reviewed—every diff read; Owned—named human comprehends the invariant, oracle, limitations, and failure meaning. No person approves their own Owned-tier change alone.

**Required turn-red evidence.** Misclassify a security- or money-semantic change as Generated. The governance gate must escalate it and fail until required approval is recorded.

**Qualification evidence.** Escalation rules are exercised with positive and negative fixtures, and the observed escalation rate is monitored for miscalibration.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S03], [S05], [S06]

---

### GOV-07 — There is one doctrine authority and it is integrity-checked `[C]`

**Rule.** Only this file is doctrine authority after adoption. Other doctrine drafts become evidence inputs, not rival authorities. The loaded doctrine must match a recorded cryptographic digest.

**Why this method is justified.** Supply-chain provenance and reproducibility depend on unambiguous inputs. Multiple loadable authorities create an uncontrolled source-selection problem.

**Required implementation.** Store this file at one canonical path. CI calculates SHA-256 and compares it to the ratified digest stored in repository governance configuration. Prompts and tools reject any other file presented as doctrine authority.

**Required turn-red evidence.** Alter one byte, load an old doctrine file, or provide two current authorities. The governance gate must turn red before generation or execution.

**Qualification evidence.** A clean checkout resolves exactly one doctrine file and validates its digest on every applicable gate.

**Current AFENDA evidence grade.** **E1 — SPECIFIED; CURRENT DOCTRINE SHA FILE NOT SUPPLIED**

**Source basis.** [S22], [S23]

---

### GOV-08 — Normative rules freeze; evidence advances append-only `[C]`

**Rule.** After ratification, the normative rule text is frozen. Evidence grade, test results, incidents, source versions, and qualification records may advance through append-only entries without rewriting the rule.

**Why this method is justified.** This separates stable requirements from changing assurance evidence. It prevents endless prose revision while preserving the ability to learn from implementation and operations.

**Required implementation.** Amend a rule only for an implementation contradiction, incident, audit finding, changed law or regulator requirement, changed supported platform, measurable control failure, or demonstrated harm. Record exact before/after text, evidence, decision authority, and affected controls.

**Required turn-red evidence.** Attempt a style-only or theoretical amendment with no qualifying evidence. The doctrine governance gate must reject it.

**Qualification evidence.** An amendment audit can reconstruct every normative change and every evidence-grade transition without retaining a second current authority.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S01], [S04], [S22], [S23]



# 6. Ledger and posting integrity

### LED-01 — Posted financial substance is immutable to runtime credentials `[C]`

**Rule.** After posting, amount, currency, rate basis, account, dimensions, direction, effective time, source identity, and reversal linkage shall not be updated or deleted by any runtime credential.

**Why this method is justified.** IAS 8 distinguishes correction and restatement from ordinary estimate changes; it does not prescribe database design. AFENDA therefore adopts immutability as an engineering control to preserve correction evidence. NIST AU-9 supports protection of audit information, and PostgreSQL privileges permit separation of runtime rights.

**Required implementation.** Use append-only posting tables for financial substance. Put operational metadata in separate mutable or append-only operational records. Separate migration ownership from runtime credentials. Add refusal triggers as secondary controls, not substitutes for privilege separation.

**Required turn-red evidence.** Grant UPDATE or DELETE to each runtime role; attempt mutation of batch and line tables; attempt inherited-role and membership paths; attempt mutation through a function. Every path must fail.

**Qualification evidence.** Privilege inventory and adversarial mutation tests pass on supported PostgreSQL, including role membership, function ownership, restore, and privilege-drift checks.

**Current AFENDA evidence grade.** **E3-R — PARTIAL; BROADER UPDATE/DELETE COVERAGE REQUIRED**

**Source basis.** [S03], [S18], [S28], [S36]

---

### LED-02 — The request-serving role cannot insert ledger rows directly `[C]`

**Rule.** Request-serving credentials shall have no direct INSERT privilege on posting batches or lines. Posting occurs only through a narrowly scoped capability.

**Why this method is justified.** NIST least privilege and separation of duties, OWASP operation-level authorization, and PostgreSQL SECURITY DEFINER support a controlled capability boundary. Balance alone cannot detect bypassed approval, missing evidence, duplicate source operations, or cross-scope posting.

**Required implementation.** Use a SECURITY DEFINER function or equivalently scoped transaction capability owned by a dedicated writer. Revoke PUBLIC EXECUTE, grant only to the application role, schema-qualify every reference, use a secure exact search_path, validate authorization/evidence/scope, and write the complete batch atomically.

**Required turn-red evidence.** Grant direct INSERT, expose PUBLIC EXECUTE, use an unsafe search_path, omit schema USAGE, leak elevated role after exception, or call from an unauthorized scope. The actual capability tests must fail.

**Qualification evidence.** Tests pass under actual supported PostgreSQL roles and concurrent sessions; catalog queries prove grants, ownership, memberships, function configuration, and no privilege persistence.

**Current AFENDA evidence grade.** **E3-R — PARTIAL; REPORTED 16/16 AND MUTANTS NOT INDEPENDENTLY REPRODUCED**

**Source basis.** [S03], [S07], [S11], [S36]

---

### LED-03 — A posting batch is atomic and balanced in functional currency at commit `[C]`

**Rule.** Every committed posting batch shall contain its complete set of lines and total debits shall equal total credits in functional currency.

**Why this method is justified.** IRS Publication 583 describes double-entry as self-balancing and states total debits must equal total credits. PostgreSQL constraint triggers can defer a cross-line assertion until transaction end and raise an exception on violation.

**Required implementation.** Insert batch and all lines in one transaction. Enforce functional-currency balance with a deferred constraint trigger or an equivalent atomic database mechanism. No partial batch may commit.

**Required turn-red evidence.** Drop or disable the constraint trigger; omit a line; interrupt before completion; commit an imbalanced batch; mutate trigger timing. V1 must turn red.

**Qualification evidence.** Pass on supported PostgreSQL with transaction failure, rollback, concurrent writers, dump/restore, and mutation evidence.

**Current AFENDA evidence grade.** **E3-R — REPORTED; NOT INDEPENDENTLY REPRODUCED**

**Source basis.** [S09], [S10], [S17]

---

### LED-04 — Source economic balance is validated before conversion rounding `[C]`

**Rule.** A posting capability shall reject an economically unbalanced source transaction before using rounding to balance functional-currency conversion.

**Why this method is justified.** Double-entry balance is an accounting requirement. Exact numeric types preserve the source arithmetic. Rounding is legitimate only at a declared conversion boundary; it must not repair missing economic value.

**Required implementation.** Validate source debits and credits per transaction currency or per explicitly declared multi-currency balancing policy. Compute the exact conversion and the rounded conversion separately. Derive the maximum possible rounding residual mathematically from the registered rounding boundary—not from a broad line-count tolerance.

**Required turn-red evidence.** Post debit 100 and credit 99 at FX 1/1. It must fail, never create a rounding line. Mutate the source-balance check away; the mapped test must turn red.

**Qualification evidence.** Property tests cover single and multiple currencies, zero and negative prohibitions, maximum line counts, and residual bounds; an independent oracle confirms that every accepted rounding residual is caused solely by declared rounding.

**Current AFENDA evidence grade.** **RED — CURRENT SQL CAN CONVERT A SOURCE IMBALANCE INTO A ROUNDING LINE**

**Source basis.** [S08], [S17], [S18]

---

### LED-05 — Rounding is explicit, uniquely routed, and attributable `[C]`

**Rule.** Every authoritative rounding difference shall be represented by an identified posting line tied to a named rounding boundary and a uniquely selected rounding account.

**Why this method is justified.** Explicit entries preserve traceability and prevent unexplained balancing adjustments. PostgreSQL constraints can enforce account uniqueness and structural properties; NIST audit controls support preserving attributable evidence.

**Required implementation.** Register each rounding boundary and policy. Configure exactly one eligible rounding account per entity, ledger, currency context, and effective policy. Mark the line with boundary ID, policy version, reason, and source lines. Silent alteration of another line is forbidden.

**Required turn-red evidence.** Remove the rounding line; configure two eligible accounts; route to a foreign entity; omit boundary evidence; silently alter an ordinary line. Each fault must fail.

**Qualification evidence.** Golden and property tests cover ties, negative values, allocations, tax, FX, and maximum residuals; mutation changes half-even to half-up and must be killed.

**Current AFENDA evidence grade.** **E3-R — PARTIAL; SOURCE-BALANCE DEFECT UNDERMINES THE CURRENT CLAIM**

**Source basis.** [S03], [S08], [S09], [S18]

---

### LED-06 — Technical reversal exactly links and negates the original facts `[C]`

**Rule.** A technical reversal shall name the original batch and exactly negate its monetary and dimensional facts using the original rate basis. Revaluation or current-period correction is a separate adjustment posting.

**Why this method is justified.** IAS 8 supports explicit correction and retrospective restatement where applicable. Audit protection requires preserving original and corrective evidence. Exact reversal is an AFENDA engineering method to make corrections traceable and testable.

**Required implementation.** Persist `reverses_batch_id`, enforce same entity and ledger, copy original currency/rate/dimensions, prohibit hidden current-rate differences, and prevent unauthorized or duplicate reversal under the declared policy.

**Required turn-red evidence.** Omit the link; alter a dimension; use the current FX rate; reverse quantity without valuation; reverse twice; reverse across entity. The reversal control must turn red.

**Qualification evidence.** An independent query proves line-by-line negation and linkage; cross-period and closed-period scenarios pass under the declared correction policy.

**Current AFENDA evidence grade.** **RED — CURRENT V4 DOES NOT REQUIRE REVERSAL LINKAGE OR DIMENSIONAL EQUALITY**

**Source basis.** [S18], [S03], [S28]

---

### LED-07 — Idempotency binds an operation key to a canonical request fingerprint `[C]`

**Rule.** Retrying the same semantic operation may return the original result; reusing its key with a different canonical payload shall fail with an idempotency conflict.

**Why this method is justified.** The IETF Idempotency-Key document—an expired work-in-progress, not a final standard—states that a key must not be reused with a different payload. PostgreSQL unique constraints provide atomic uniqueness; RFC 8785 provides canonical JSON suitable for stable fingerprints.

**Required implementation.** Define operation identity and key scope. Canonicalize the authoritative payload, including entity, dates, source, evidence, lines, dimensions, rates, and reversal target. Store its digest. Same key plus same digest returns the prior result; same key plus different digest conflicts. Concurrent identical calls create one business effect.

**Required turn-red evidence.** Reuse a key with changed amount, account, entity, date, evidence, or reversal target; race two calls; reuse the document with a new key contrary to operation policy. The checks must turn red.

**Qualification evidence.** Concurrent tests on supported PostgreSQL prove one effect and deterministic responses. Fingerprint calculation is independently reproduced from the canonical input.

**Current AFENDA evidence grade.** **RED — CURRENT FUNCTION RETURNS AN OLD BATCH FOR A DIFFERENT PAYLOAD**

**Source basis.** [S09], [S21], [S35]

---

### LED-08 — Account and ledger scope must match structurally `[C]`

**Rule.** A posting line shall not reference an account outside the batch’s declared entity and ledger scope.

**Why this method is justified.** NIST access controls and PostgreSQL referential/row security mechanisms support enforcing scope beneath application filters. A global account ID foreign key alone does not prove entity ownership.

**Required implementation.** Prefer a composite key and foreign key such as `(entity_id, account_id) → account(entity_id, id)`, or an equally strong validated ownership path inside the posting capability. Explicitly model global/shared exceptions; do not infer them.

**Required turn-red evidence.** Submit an E1 batch using an E2 account; mutate the composite predicate or RLS policy; use an inherited or shared record without permission. Every unauthorized path must fail.

**Qualification evidence.** Cross-scope adversarial fixtures pass for tenant, entity, group, inherited scope, global reference, and explicitly shared records on the real role topology.

**Current AFENDA evidence grade.** **RED — CURRENT SQL DOES NOT CHECK ACCOUNT.ENTITY_ID AGAINST BATCH.ENTITY_ID**

**Source basis.** [S03], [S09], [S12]

---

### LED-09 — Posting evidence is typed, resolvable, and versioned `[C]`

**Rule.** Every posting shall carry typed references to the policy and reference-data versions that determined it, plus actor, reason, source, and correlation evidence.

**Why this method is justified.** Provenance and audit guidance require attributable, interpretable evidence. A non-empty JSON object can still be meaningless or unresolved.

**Required implementation.** Use versioned registries or immutable referenced records for tax, FX, valuation, pricing, extension policies, and other authoritative inputs. Validate schema and existence. Preserve the exact version or digest, not merely a label supplied by the caller.

**Required turn-red evidence.** Pass `{'x': null}`, unknown versions, deleted references, empty actor, fabricated policy keys, or inconsistent effective dates. The posting must fail.

**Qualification evidence.** Historical reconstruction resolves every evidence reference after restore; a mutant that removes referential validation is killed.

**Current AFENDA evidence grade.** **RED/PARTIAL — NON-EMPTY JSON DOES NOT PROVE RESOLVABLE POLICY EVIDENCE**

**Source basis.** [S04], [S22], [S28]

---

### LED-10 — Period close and posting are one concurrency contract `[C]`

**Rule.** A posting must not commit into a period that closes concurrently, and a close must not complete while an eligible posting remains in-flight without a declared resolution.

**Why this method is justified.** Serializable isolation emulates serial execution but requires retries; explicit locks can prevent races but require consistent ordering. The accounting rule must be enforced atomically, not by a UI check.

**Required implementation.** Declare isolation, period guard, lock order, retry policy, idempotency key, and conflict outcome. The period status read and posting write must participate in the same protected transaction.

**Required turn-red evidence.** Race close against post in both orders; downgrade isolation; remove period guard; reorder locks; retry after serialization failure. Invalid interleavings must fail or retry without double effect.

**Qualification evidence.** Concurrency tests pass on supported PostgreSQL with multiple real connections and repeated randomized schedules.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S13], [S14], [S18]



# 7. Money and foreign exchange

### MON-01 — Authoritative money never crosses a binary floating-point boundary `[C]`

**Rule.** Binary floating point shall not determine, transport, persist, compare, allocate, reconcile, post, settle, or report an authoritative monetary amount.

**Why this method is justified.** PostgreSQL documents floating-point types as inexact and recommends exact numeric types for monetary amounts. RFC 8785 recommends representing integers beyond IEEE-754 precision as JSON strings.

**Required implementation.** Use bigint or exact decimal internally. In JSON and language boundaries that cannot preserve arbitrary integers, transmit canonical decimal strings with schema validation. Convert only at explicit exact boundaries.

**Required turn-red evidence.** Round-trip 2^53−1, 2^53, 2^53+1, PostgreSQL bigint extrema, and large FX products through every boundary. Any changed value turns the gate red.

**Qualification evidence.** Property tests and cross-language fixtures prove exact round-trip and overflow behavior on every supported API, queue, database, and export path.

**Current AFENDA evidence grade.** **RED — CURRENT JAVASCRIPT TEST/TRANSPORT USES NUMBER FOR BIGINT AMOUNTS**

**Source basis.** [S08], [S21]

---

### MON-02 — Posted amounts and intermediate calculations use different exact representations `[D]`

**Rule.** Posted amounts default to integer minor units with explicit currency; intermediate tax, allocation, accrual, valuation, and FX calculations use exact decimal or rational arithmetic.

**Why this method is justified.** Exact storage is required; the particular representation is an AFENDA design choice. IAS 21 requires explicit foreign-currency translation concerns, while PostgreSQL provides exact numeric arithmetic.

**Required implementation.** Define Money, DecimalQuantity, Rate, and RoundingBoundary as separate types. Conversion to posted minor units occurs only through the registered rounding policy.

**Required turn-red evidence.** Mix a quantity or rate with Money; post an unrounded decimal; round at an unnamed boundary; silently coerce float. Compile-time or runtime verification must fail.

**Qualification evidence.** Golden cases from accounting policy and property tests pass across positive, negative, allocation, tax, and FX scenarios.

**Current AFENDA evidence grade.** **E2-R/PARTIAL**

**Source basis.** [S08], [S19]

---

### MON-03 — Currency roles are explicit: transaction, functional, and presentation `[C]`

**Rule.** Every monetary fact and report shall state whether a currency is transaction, functional, or presentation currency. The phrase “base currency” is forbidden as ambiguous.

**Why this method is justified.** IAS 21 explicitly distinguishes foreign-currency transactions, functional currency, and presentation currency and identifies exchange-rate selection and translation as principal issues.

**Required implementation.** Store the transaction currency on source facts, functional currency on each ledger, and presentation currency on reports/consolidation. Conversion paths state source, target, rate type, effective time, and policy.

**Required turn-red evidence.** Supply an amount or rate without currency roles; translate directly between ambiguous currencies; change an entity’s functional currency without a governed transition. The control must fail.

**Qualification evidence.** Scenario tests cover foreign transactions, reporting translation, functional-currency changes, and consolidation boundaries under qualified accounting review.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S19]

---

### MON-04 — Every rounding boundary is named and versioned `[C]`

**Rule.** No authoritative rounding may occur outside a registered boundary with a versioned policy and jurisdictional override where applicable.

**Why this method is justified.** Exact arithmetic still requires a decision when producing currency subunits. Tax authorities may prescribe per-line or per-document treatment. Making the boundary explicit makes that decision testable and attributable.

**Required implementation.** Maintain a registry for document-line posting, tax, allocation, FX, valuation, and other domains. Record method, precision, allocation rule, account, effective dates, and jurisdiction.

**Required turn-red evidence.** Call a generic rounding helper without boundary ID; use the wrong policy; omit jurisdiction version; change policy without qualification. The mapped control must fail.

**Qualification evidence.** Golden examples, regulatory examples, and domain mutants cover every registered boundary; no unregistered call site remains.

**Current AFENDA evidence grade.** **E3-R/PARTIAL**

**Source basis.** [S08], [S18], [S32]

---

### MON-05 — An FX rate is a complete quoted fact, not a bare number `[C]`

**Rule.** Every authoritative FX rate shall record source currency, target currency, quote convention, source, category, effective time, precision, and version.

**Why this method is justified.** IAS 21 identifies which exchange rates to use and how to account for their effects as central issues. A numeric ratio without direction, source, or time is not reproducible evidence.

**Required implementation.** Use a typed rate record. Rational or fixed-scale decimal is a default implementation choice. Record whether rate is direct/indirect, spot/average/closing/settlement, and the source reference.

**Required turn-red evidence.** Invert without direction; triangulate incompatible dates or sources; use a missing version; apply a closing rate as a transaction rate without policy. The control must fail.

**Qualification evidence.** Independent oracle cases reproduce conversions, inversions, triangulation, and reversals from stored evidence.

**Current AFENDA evidence grade.** **E1/PARTIAL**

**Source basis.** [S19]

---

### MON-06 — Range, overflow, and sign behavior are part of money correctness `[C]`

**Rule.** Every exact-money operation shall have declared range, overflow, sign, and zero-side behavior. Overflow must fail, never wrap or truncate.

**Why this method is justified.** PostgreSQL bigint has finite range; numeric is exact but still must be constrained by business limits. Cross-language serialization can lose range or precision.

**Required implementation.** Validate integer ranges before database insertion; use checked multiplication/division; constrain one-sided debit/credit and non-negative posted lines; define treatment of negative business amounts through direction, not accidental signs.

**Required turn-red evidence.** Exercise min/max values, one beyond each bound, multiplication overflow, zero/zero, both debit and credit, negative denominator, and malformed decimal strings. All invalid cases must fail.

**Qualification evidence.** Property tests run across language and database boundaries with independent expected values.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S08], [S09], [S21]



# 8. Time, correction, and restatement

### TIM-01 — Every business date and instant is individually named `[C]`

**Rule.** Document date, transaction date, accounting date, tax point, due date, FX date, recorded instant, validation instant, and other governing times shall never be collapsed into a generic `date` field.

**Why this method is justified.** Requirements must be unambiguous. PostgreSQL distinguishes date, timestamp without time zone, and timestamp with time zone. MyInvois correction windows depend on validation time, while accounting and aging use different dates.

**Required implementation.** Model each date/instant explicitly. State whether it is a civil date, local scheduled time, or absolute instant. APIs use RFC 3339 for instants and declared date formats for civil dates.

**Required turn-red evidence.** Replace accounting date with document date; omit offset from an instant; infer FX date; use generic `date`. Static or runtime governance must fail.

**Qualification evidence.** Date-governance fixtures exercise month/year close, daylight-saving transitions where relevant, leap dates, time-zone conversion, and statutory validation windows.

**Current AFENDA evidence grade.** **E1/PARTIAL**

**Source basis.** [S01], [S15], [S20], [S32], [S34]

---

### TIM-02 — Every calculation and report declares its governing temporal policy `[C]`

**Rule.** No subsystem may infer its governing time from field proximity or naming convention. Period assignment, aging, tax, FX, revenue recognition, and statutory windows each declare a date or versioned temporal policy.

**Why this method is justified.** IAS 8 and IAS 21 distinguish different accounting treatments and rate dates; jurisdictional guidance may prescribe tax and validation times. NASA-style verifiable requirements require a definitive source.

**Required implementation.** Maintain a temporal policy registry. Every calculation/report records policy ID and as-of boundary. Revenue recognition may use performance-obligation policy rather than one date.

**Required turn-red evidence.** Change the governing field, omit policy ID, use ambient current date, or run the same report with an unrecorded as-of value. The control must turn red.

**Qualification evidence.** Historical reruns produce the same result from the same facts, policy versions, and as-of boundary.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S01], [S18], [S19], [S32]

---

### TIM-03 — Absolute instants are stored with UTC semantics; business zones are retained separately when needed `[D]`

**Rule.** Recorded and external-event instants use timezone-aware storage; scheduling and statutory local-time rules retain the relevant IANA time-zone identifier separately.

**Why this method is justified.** PostgreSQL stores timestamp-with-time-zone internally as UTC and does not retain the originally supplied zone. RFC 3339 defines unambiguous Internet timestamps with an offset.

**Required implementation.** Use `timestamptz` for instants, RFC 3339 at interfaces, and a separate zone ID for future schedules or local legal rules. Do not use `timestamp without time zone` for an absolute event.

**Required turn-red evidence.** Round-trip instants across session zones; change server TimeZone; cross DST boundaries; omit the business zone for a schedule. Incorrect behavior must fail.

**Qualification evidence.** Qualified tests run with multiple session/server zones and the supported IANA database version.

**Current AFENDA evidence grade.** **E1/PARTIAL**

**Source basis.** [S15], [S20]

---

### TIM-04 — Effective time and recorded time remain distinct `[C]`

**Rule.** Financial facts shall record when they are effective in the business world and when the system recorded them. As-of reports use both dimensions explicitly.

**Why this method is justified.** Prior-period error correction and audit reconstruction require distinguishing the period affected from when the correction became known or recorded. This is effective/recorded semantics, not a claim of full bitemporal interval modeling.

**Required implementation.** Store effective date/time and immutable recorded instant. Projection queries accept both business as-of and knowledge as-of boundaries. Corrections preserve original recorded history.

**Required turn-red evidence.** Backdate a fact without recording when it arrived; query March as known on 5 April after a later correction and get current restated state. The as-of control must detect the difference.

**Qualification evidence.** Scenario tests reproduce original-known and current-restated balances across late entries and corrections.

**Current AFENDA evidence grade.** **E1/PARTIAL**

**Source basis.** [S18], [S28]

---

### TIM-05 — Transaction correction, policy restatement, and data repair are different authorities `[C]`

**Rule.** An isolated transaction correction, a population-wide policy restatement, and a structural data repair shall use different authority, evidence, and execution protocols.

**Why this method is justified.** IAS 8 distinguishes changes in policy, estimates, and prior-period errors. NIST separation of duties and audit protection support maker-checker approval and retained evidence.

**Required implementation.** Transaction correction uses standard reversal. Policy restatement requires named authority, maker-checker, scope declared before dry run, deterministic plan, corrective postings, resumable execution, snapshots, reconciliation, and notification assessment. Data repair must prove economic meaning is unchanged.

**Required turn-red evidence.** Execute mass correction autonomously; alter history; derive scope from the run; omit dry run; mix revaluation into reversal. The control must fail.

**Qualification evidence.** A qualified restatement rehearsal completes, interrupts, resumes, reconciles, and reproduces evidence without partial economic effect.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S18], [S03], [S28]



# 9. Security and privacy

### SEC-01 — Least privilege and separation of duties are enforced in the real credential topology `[C]`

**Rule.** Request, posting, migration, audit, backup, and administrative capabilities shall be separated so each credential has only the permissions needed for its role.

**Why this method is justified.** NIST AC-5 and AC-6 establish separation of duties and least privilege. OWASP recommends least privilege and permission validation on every request. PostgreSQL exposes granular privileges and ownership.

**Required implementation.** Define non-login capability roles and separate login/service identities. Prohibit runtime inheritance of migration or owner roles. Record role membership and privilege inventory as deployable configuration.

**Required turn-red evidence.** Grant a runtime login membership in owner/migration role; add UPDATE, DELETE, BYPASSRLS, superuser, or CREATE in a trusted schema. Privilege-drift checks must fail.

**Qualification evidence.** Catalog assertions pass after fresh migration, upgrade, restore, and credential rotation in the production-equivalent topology.

**Current AFENDA evidence grade.** **E2-R/PARTIAL**

**Source basis.** [S03], [S07], [S36]

---

### SEC-02 — Authorization is operation-specific, fail-closed, and independent of UI visibility `[C]`

**Rule.** Every authoritative operation shall verify actor, action, resource, scope, and relevant policy. Absence, ambiguity, or dependency failure denies the operation.

**Why this method is justified.** OWASP recommends deny-by-default, validation on every request, and tests for authorization logic. NIST access controls require explicit enforcement rather than interface convention.

**Required implementation.** Centralize typed authorization at the operation boundary. UI hiding is advisory only. Record the decision evidence and policy version for privileged financial/statutory actions.

**Required turn-red evidence.** Call an operation directly without the UI; omit actor or scope; make the policy service unavailable; guess another entity ID. All must deny safely.

**Qualification evidence.** Integration tests exercise every operation and role/scope combination, including negative and dependency-failure cases.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S03], [S07]

---

### SEC-03 — Scope isolation is enforced below application filtering `[C]`

**Rule.** Tenant, entity, group, global, inherited, and explicitly shared scope shall be structurally declared and enforced by database/schema isolation, RLS, composite ownership constraints, or an equivalent lower-layer mechanism.

**Why this method is justified.** NIST control assurance and PostgreSQL row security support enforcement below application code. PostgreSQL warns that owners and BYPASSRLS roles normally bypass RLS, so topology matters.

**Required implementation.** Every authoritative record declares scope or inherits it through an enforced ownership path. Application filters may improve ergonomics but are never the only control. Test owner/bypass behavior explicitly.

**Required turn-red evidence.** Remove a scope predicate; access another tenant/entity; exploit owner bypass; use a shared reference as private; change inherited ownership. The cross-scope suite must turn red.

**Qualification evidence.** Cross-scope adversarial fixtures pass under real roles after migration, restore, and privilege changes.

**Current AFENDA evidence grade.** **RED — CURRENT LEDGER ALLOWS CROSS-ENTITY ACCOUNT REFERENCE**

**Source basis.** [S03], [S12]

---

### SEC-04 — SECURITY DEFINER functions are hardened as privileged code `[C]`

**Rule.** A SECURITY DEFINER function shall have a trusted exact search_path, fully qualified references, selective EXECUTE grants, no PUBLIC execution window, least-privileged ownership, and input/authorization checks.

**Why this method is justified.** PostgreSQL explicitly warns that SECURITY DEFINER runs with owner privileges, requires a search_path excluding untrusted schemas, and should revoke PUBLIC EXECUTE before selective grants.

**Required implementation.** Create function and grants in one transaction. Pin a reviewed path such as trusted schema(s) plus `pg_temp` last, or an intentionally empty path with every object qualified. Assert the exact configuration, not merely the presence of `search_path=`.

**Required turn-red evidence.** Reset search_path; set it to `public`; create a shadow object in temp/public; retain PUBLIC EXECUTE; change owner; omit schema qualification. The real privilege tests must fail.

**Qualification evidence.** Exploit fixtures fail on supported PostgreSQL, and catalog assertions match the exact approved function definition and grants.

**Current AFENDA evidence grade.** **E3-R/PARTIAL; EXACT SEARCH_PATH ASSERTION MUST BE STRENGTHENED**

**Source basis.** [S11], [S36]

---

### SEC-05 — All external and cross-boundary input is untrusted `[C]`

**Rule.** HTTP, database output, files, webhooks, extension output, generated artifacts, configuration, and internal-service messages shall be validated against typed and business constraints before authoritative use.

**Why this method is justified.** NIST recommends black-box negative tests, structural tests, fuzzing, and built-in checks. MITRE CWE-94 advises treating input as malicious, using allowlists, and avoiding dynamic code construction.

**Required implementation.** Validate syntax, type, length, range, required/extra fields, cross-field consistency, scope, and business rules. Parse money and dates exactly. Reject unknown authoritative fields unless a versioned compatibility policy permits them.

**Required turn-red evidence.** Fuzz malformed JSON, overflow, duplicate keys, invalid Unicode, extra fields, cross-scope IDs, code-like expressions, and inconsistent related values. Invalid inputs must fail without partial effect.

**Qualification evidence.** Fuzzing and negative tests pass at every boundary in supported environments.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S02], [S05], [S25]

---

### SEC-06 — Secrets never enter generated artifacts, prompts, fixtures, logs, or data configuration `[C]`

**Rule.** Credentials, private keys, tokens, and secret material shall be supplied through governed secret channels and excluded from source, AI context, test fixtures, errors, logs, and tenant-editable records.

**Why this method is justified.** NIST developer-verification guidance includes scanning for hardcoded secrets, and SSDF addresses secure development and delivery practices.

**Required implementation.** Use secret managers/environment injection with least privilege and rotation. Run secret scanning before commit and on generated output. Redact errors and structured logs by schema.

**Required turn-red evidence.** Seed known canary secrets in prohibited locations; generated output and logs must be rejected. Rotate a secret and verify no old credential remains valid.

**Qualification evidence.** Independent secret scanning and runtime redaction tests pass; incident response can identify exposure without exposing the secret itself.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S02], [S05]

---

### SEC-07 — Audit evidence is protected, attributable, and operationally usable `[C]`

**Rule.** Authoritative operations and privileged actions shall emit audit evidence containing actor, scope, operation, source, outcome, correlation, timing, and policy references; runtime actors cannot alter it.

**Why this method is justified.** NIST AU controls and SP 800-92 support protected audit information and effective log-management processes for investigation, operations, and retention.

**Required implementation.** Use append-only or separately protected audit storage, separated credentials, integrity/retention controls, and operator-searchable correlation IDs. Avoid secrets and unnecessary personal data.

**Required turn-red evidence.** Alter or delete an audit record as runtime user; omit actor/outcome; break correlation; inject log control characters; exceed retention without alert. The control must fail.

**Qualification evidence.** Incident rehearsal reconstructs a posting, denial, retry, privilege change, and restatement from protected evidence.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S03], [S28]

---

### SEC-08 — Personal data is classified, minimized, and purpose-limited at schema definition `[C/J]`

**Rule.** Every schema field containing or linking personal data shall declare classification, purpose, lawful/contractual basis where applicable, access scope, retention, and derived-copy behavior.

**Why this method is justified.** Malaysia’s PDPA principles require security, storage limitation, accuracy/integrity, notice, purpose, and access; the Personal Data Protection Standard sets minimum security, storage, and integrity requirements.

**Required implementation.** Add privacy metadata to schema definitions and generation inputs. Default to not collecting personal data. Treat persistent identifiers as personal data when linkable.

**Required turn-red evidence.** Add an unclassified personal field; use data for a new purpose; copy into logs/search without policy; retain beyond limit. Governance must fail.

**Qualification evidence.** Privacy inventory reconciles primary data and every derived copy; access and correction workflows are tested.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S30], [S31]

---

### SEC-09 — Personal data is not embedded in immutable financial substance `[C]`

**Rule.** Append-only ledger facts shall reference governed subjects or counterparties through stable pseudonymous identifiers rather than inline names, addresses, contact details, or free-text personal data.

**Why this method is justified.** Storage limitation and correction rights conflict with unnecessary personal data embedded in immutable facts. Indirection reduces the conflict while preserving accounting identity; it does not itself guarantee erasure.

**Required implementation.** Keep personal data in governed mutable/encrypted stores. Use sufficiently granular keys and controlled projections. Prohibit free-text personal identifiers in posting descriptions and dimensions.

**Required turn-red evidence.** Insert a name, email, identity number, address, or linkable free text into immutable lines. Schema or content governance must reject it.

**Qualification evidence.** Data-flow and erasure tests prove that ledger facts remain interpretable after permitted personal-data deletion or key destruction, subject to legal retention.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S30], [S31]

---

### SEC-10 — Retention, erasure, backups, and derived copies form one privacy control `[J/C]`

**Rule.** Retention and erasure decisions shall cover primary records, projections, caches, indexes, logs, exports, backups, replicas, support snapshots, and processors, while recording legal-hold or statutory-retention overrides.

**Why this method is justified.** Malaysia’s PDPA sources require storage no longer than necessary, reasonable destruction, security, and data integrity. NIST contingency guidance requires recoverable systems, creating a necessary tension with erasure that must be designed explicitly.

**Required implementation.** Maintain a retention register per data class and jurisdiction. Track derived copies. Define backup expiry, restore-time re-erasure, processor obligations, and legal-hold authority.

**Required turn-red evidence.** Erase only the primary row while a search index, export, backup restore, or processor copy still exposes the data. The privacy verification must turn red.

**Qualification evidence.** Periodic erasure drills include restore from backup and prove reapplication of deletion/retention state.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S30], [S31], [S29]



# 10. Determinism and provenance

### DET-01 — AI authorship and deterministic generation are separate pipelines `[C]`

**Rule.** AI output is an authoring proposal, not a reproducible build artifact. Only deterministic compilation from a committed definition may claim byte-stable regeneration.

**Why this method is justified.** Reproducible Builds requires the same source, environment, and instructions to recreate specified artifacts. SLSA provenance records how artifacts were produced. Model output is not guaranteed deterministic merely by naming a model.

**Required implementation.** Pipeline A produces a reviewed definition committed to source control. Pipeline B deterministically compiles that definition. The committed definition is authoritative; model identity is provenance.

**Required turn-red evidence.** Regenerate an AI proposal and require byte identity; the doctrine gate must reject that claim. Change deterministic compiler input/environment and hide it; reproducibility must fail.

**Qualification evidence.** Independent rebuilds reproduce only the declared deterministic artifacts bit-for-bit.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S22], [S23]

---

### DET-02 — Generated expansions are subordinate to reviewed definitions `[D]`

**Rule.** Generated modules, schemas, APIs, and scaffolding shall be reproducible projections of small reviewed definitions; domain policy shall not hide only in expansion output.

**Why this method is justified.** Parnas’s information-hiding criterion supports modules organized around concealed change decisions. Reproducible builds require identified source inputs. Reviewing the definition is effective only if the expansion is deterministic and replaceable.

**Required implementation.** Mark generated ownership, prevent hand edits, include generator/version provenance, and regenerate in CI. Escalate generated output when it crosses a risk boundary not covered by controls.

**Required turn-red evidence.** Hand-edit a generated file; introduce behavior not represented in its definition; regenerate with drift. The gate must fail.

**Qualification evidence.** Clean regeneration creates no diff, and representative semantic fixtures confirm the definition means what reviewers intended.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S23], [S24]

---

### DET-03 — Authoring provenance and build provenance are distinct records `[C]`

**Rule.** Authoring provenance records how a proposal was created; build provenance records how committed definitions produced deterministic artifacts. Run-varying evidence is not embedded in byte-stable expansions.

**Why this method is justified.** SLSA separates source/build provenance concepts, while Reproducible Builds excludes ancillary logs from specified primary outputs.

**Required implementation.** Authoring provenance: model/revision, prompt contract, context hash, tools, sampling, proposal ID. Build provenance: source definition hash, deterministic compiler/formatter versions, source commit, run ID, artifact digests. Store sidecar attestations where appropriate.

**Required turn-red evidence.** Embed timestamp or destination commit into a byte-stable artifact; omit source definition or compiler version; claim reproducibility from model identity. The provenance gate must fail.

**Qualification evidence.** An assessor traces any artifact to committed source and qualified toolchain without changing its reproducible digest.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S22], [S23]

---

### DET-04 — Qualification triggers on toolchain change, not ordinary run evidence `[C]`

**Rule.** A generator qualification event occurs only when a qualified toolchain component changes, not when definitions, timestamps, run IDs, artifact hashes, or destination commits change.

**Why this method is justified.** Treating every run-varying field as a qualification trigger makes ordinary generation impossible. Provenance distinguishes what happened in a run from what toolchain is approved.

**Required implementation.** Qualified components include model family/revision where used, prompt contract, standing-context contract, generator wrapper, deterministic compiler, formatter semantics, tool capability, and generation policy. Qualification runs representative regeneration, semantic diff, full applicable controls, and explicit approval.

**Required turn-red evidence.** Change a qualified component without qualification; or change only a definition/run ID and incorrectly demand qualification. Both governance tests must fail.

**Qualification evidence.** Toolchain registry and qualification fixtures prove correct trigger classification.

**Current AFENDA evidence grade.** **E1 — SPECIFIED; CORRECTS THE V5 D4/D5 CONTRADICTION**

**Source basis.** [S22], [S23]

---

### DET-05 — Canonicalization precedes authoritative hashing or fingerprinting `[C]`

**Rule.** Any JSON used for request fingerprints, signatures, evidence digests, or canonical equality shall use a declared canonical form; long integers are strings where double precision cannot represent them exactly.

**Why this method is justified.** RFC 8785 defines deterministic JSON canonicalization and explicitly recommends strings for higher-precision or longer integers than IEEE-754 double precision.

**Required implementation.** Reject duplicate keys and invalid Unicode; preserve strings; sort properties per the chosen canonical scheme; normalize domain representations before hashing; version the canonicalization policy.

**Required turn-red evidence.** Reorder keys, vary whitespace, encode 2^53+1 as a number, duplicate a property, or change Unicode representation. Semantically equivalent inputs must hash equally; unsafe inputs must fail.

**Qualification evidence.** Independent implementations produce the same canonical bytes and digest for the approved corpus.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S21]

---

### DET-06 — Dependency, source, and doctrine integrity are locked and verifiable `[C]`

**Rule.** Verification-bearing artifacts shall pin dependencies and identify the exact doctrine, source, migration, generator, and environment inputs.

**Why this method is justified.** NIST recommends addressing included code and secure supply-chain practices. SLSA and reproducible-build guidance require traceable inputs and environments.

**Required implementation.** Commit package manifest and lockfile, source hashes, migration ordering, supported runtime/database versions, doctrine digest, and gate commands. CI rejects unpinned or mismatched inputs.

**Required turn-red evidence.** Remove lockfile; alter doctrine/migration; resolve a different transitive version; run an unlisted script. Evidence validation must fail before tests are credited.

**Qualification evidence.** A clean isolated build reproduces dependency resolution and all applicable gates from the sealed bundle.

**Current AFENDA evidence grade.** **RED — CURRENT SUPPLIED BUNDLE LACKS PACKAGE MANIFEST/LOCK AND DOCTRINE SHA FILE**

**Source basis.** [S02], [S05], [S22], [S23]



# 11. Extension and configuration

### EXT-01 — Extensions depend only on declared public contracts `[C]`

**Rule.** An extension shall use versioned public capabilities and shall not depend on another module’s incidental internal structure.

**Why this method is justified.** Parnas’s information hiding reduces change coupling by concealing design decisions behind module interfaces. OWASP ASVS demonstrates stable, version-qualified requirement identifiers as a basis for verifiable contracts.

**Required implementation.** Publish typed contracts, semantic versions, compatibility metadata, and capability permissions. CI inventories extension dependencies and diffs the public surface.

**Required turn-red evidence.** Import a private path, reach an internal table, rely on DOM structure, or remove/change a public contract without compatibility report. The gate must fail.

**Qualification evidence.** A deployment-specific compatibility report identifies every affected extension before upgrade.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S24], [S06]

---

### EXT-02 — The extension-kind registry is closed by default `[D]`

**Rule.** Only registered extension kinds may alter system behavior. A new kind requires a bounded authority model, lifecycle, isolation, compatibility semantics, transaction/data scope, and proof that existing kinds cannot represent it honestly.

**Why this method is justified.** This exact taxonomy is an AFENDA design decision, not a universal standard. It is justified by information hiding and by the risk of externally influenced code/control injection.

**Required implementation.** Default kinds: hook, policy, field-extension, view-slot, document-type, scheduled-operation. Keep the registry machine-readable and versioned.

**Required turn-red evidence.** Introduce an unnamed injection mechanism or arbitrary callback and label it as an existing kind. Contract validation must reject it.

**Qualification evidence.** Each kind has negative fixtures proving its authority boundary and failure isolation.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S24], [S25]

---

### EXT-03 — Arbitrary overrides, internal imports, and unnamed UI injection are forbidden `[C]`

**Rule.** Extensions shall not override arbitrary methods, import internals, monkey-patch runtime behavior, or inject UI at unnamed structural positions.

**Why this method is justified.** Such mechanisms bypass information hiding and create uncontrolled code/control paths. MITRE CWE-94 documents risks when externally influenced input changes executable control flow.

**Required implementation.** Provide named hooks, typed policy interfaces, namespaced fields, and named view slots. Enforce import and composition rules statically and at package boundaries.

**Required turn-red evidence.** Add an internal import, prototype/method override, eval-based extension, or XPath/selector injection. Structural gates must fail.

**Qualification evidence.** Repository-wide static analysis and negative fixtures cover every supported extension mechanism.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S24], [S25]

---

### EXT-04 — Configuration selects behavior; it does not contain executable expressions `[C]`

**Rule.** Tenant- or user-editable configuration shall contain validated data and enumerated selections, never executable code, expressions, templates with arbitrary evaluation, or dynamic queries.

**Why this method is justified.** MITRE recommends avoiding dynamic code generation and using allowlisted inputs; code injection can alter intended control flow and integrity.

**Required implementation.** Use discriminated unions and allowlisted policy identifiers. Treat any expression language as code requiring version control, review, sandbox, capability restrictions, and a separate extension contract.

**Required turn-red evidence.** Store `eval`, script, formula, SQL, or arbitrary template execution in a configuration row. Schema/static controls must reject it.

**Qualification evidence.** Fuzzing and code-injection fixtures prove no configuration path reaches an execution sink.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S25]

---

### EXT-05 — Extension execution declares trust, scope, resources, and failure policy `[C]`

**Rule.** Every extension declares execution trust level, data/network scope, resource budget, timeout, transaction participation, required capability, and failure behavior. Untrusted customer code never runs inside financial posting.

**Why this method is justified.** NIST security controls and MITRE mitigations support least privilege, sandboxing, validation, and fault containment. Type compatibility alone does not establish runtime safety.

**Required implementation.** Run untrusted work in an isolated process/service with explicit capabilities. Synchronous financial policies must be trusted, deterministic, bounded, and fully evidenced; observers default after commit.

**Required turn-red evidence.** Exceed time/memory/network scope; crash; return malformed data; attempt ledger access; run untrusted code in posting transaction. The host must contain the failure and preserve transaction integrity.

**Qualification evidence.** Resource, timeout, sandbox-escape, and failure-isolation tests pass in production-equivalent deployment.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S03], [S05], [S25]

---

### EXT-06 — Extension lifecycle and scheduled operations are explicit `[C]`

**Rule.** Extensions declare install, migrate, enable, disable, remove, retention, dependency, permission, failure-isolation, and compatibility behavior. A scheduled operation invokes an existing typed operation and embeds no new business logic.

**Why this method is justified.** Traceable, versioned requirements and information hiding support controlled lifecycle and upgrade analysis. A scheduler otherwise becomes an arbitrary execution escape hatch.

**Required implementation.** A scheduled-operation contract declares target operation, schedule/zone, scope, idempotency, overlap, retry, missed-run/catch-up, budget, capability, observability, and recovery.

**Required turn-red evidence.** Disable/remove with retained data; run overlapping schedules; miss a run; change target contract; embed business logic in scheduler. Lifecycle tests must fail or follow the declared outcome.

**Qualification evidence.** Install-upgrade-disable-remove and schedule recovery scenarios pass across supported versions.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S01], [S06], [S24]



# 12. Operations, concurrency, and recovery

### OPS-01 — External side effects use durable state, idempotency, and reconciliation `[C]`

**Rule.** External submissions, notifications, payments, and other non-transactional effects shall use a durable state machine, idempotency/fingerprint, retry policy, reconciliation, and operator-visible ambiguity handling.

**Why this method is justified.** Distributed effects cannot be made atomic merely by a database transaction. The IETF idempotency draft is work-in-progress but usefully states payload/key constraints; NIST logging and audit controls support observable recovery.

**Required implementation.** Use transactional outbox or an equivalent durable handoff. Persist request, fingerprint, attempt, acknowledgement, external ID, status transition, and reconciliation result. Treat transport as at-least-once and target effectively-once business effect.

**Required turn-red evidence.** Crash before/after send, lose acknowledgement, duplicate callback, reorder statuses, reuse a key with changed payload, or retry concurrently. The system must converge without duplicate business effect.

**Qualification evidence.** Fault-injection tests and a controlled integration pilot exercise every ambiguity state and operator action.

**Current AFENDA evidence grade.** **RED/PARTIAL — CURRENT LEDGER IDEMPOTENCY IS INSUFFICIENT; OUTBOX NOT SUPPLIED**

**Source basis.** [S03], [S28], [S35]

---

### OPS-02 — Each critical operation declares isolation and retry semantics `[C]`

**Rule.** Posting, close, numbering, valuation, allocation, restatement, and projection rebuild shall declare transaction isolation, retryable errors, maximum retries, idempotency identity, and conflict outcome.

**Why this method is justified.** PostgreSQL Serializable provides strong guarantees but explicitly requires whole-transaction retry on serialization failure. Applying it selectively is an engineering decision based on anomaly risk.

**Required implementation.** Maintain an operation concurrency matrix. Retry only the complete idempotent operation with bounded backoff. Never reuse results from an aborted transaction.

**Required turn-red evidence.** Inject serialization failure, deadlock, timeout, and connection loss at each step. Partial or duplicate effect must not survive.

**Qualification evidence.** Multi-session tests repeat randomized schedules until the declared invariants hold under sustained contention.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S13]

---

### OPS-03 — Lock ordering is global and executable `[C]`

**Rule.** Any operation acquiring multiple locks shall follow one documented global order and acquire the strongest required mode first where practical.

**Why this method is justified.** PostgreSQL identifies consistent lock ordering as the best defense against deadlocks and notes that deadlocks otherwise abort one transaction.

**Required implementation.** Define canonical orders such as period → ledger → sequence → account/valuation bucket. Static helpers and runtime assertions enforce order. Transactions do not wait for user input.

**Required turn-red evidence.** Reverse two locks, acquire weaker then upgrade, or hold a transaction through external input. Deadlock/order fixtures must fail.

**Qualification evidence.** High-contention tests show bounded retries and no unhandled deadlocks across supported operations.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S14]

---

### OPS-04 — Operational risk is observable as a condition with an action `[C]`

**Rule.** Projection lag, reconciliation differences, outbox backlog, privilege drift, extension failure, ambiguous submission, restore failure, and surviving mutants shall be observable conditions with owner, severity, and runbook action.

**Why this method is justified.** NIST log-management and audit controls emphasize usable logging for investigation and operations; a line emitted somewhere is not an operational control.

**Required implementation.** Define metrics, thresholds, alerts, evidence links, owners, and operator actions. Correlate across operation, batch, entity, request, and external submission.

**Required turn-red evidence.** Create each failure state without emitting an actionable condition, or emit an alert with no owner/runbook. Observability tests must fail.

**Qualification evidence.** Game-day exercises demonstrate detection, diagnosis, action, and closure within declared objectives.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S03], [S28]

---

### OPS-05 — Backup existence is not recovery; restore is tested `[C]`

**Rule.** Backups, role definitions, configuration, doctrine, migrations, and evidence are not accepted until restoration and post-restore reconciliation succeed.

**Why this method is justified.** PostgreSQL documents backup/restore methods and notes that roles/permissions must exist for faithful restoration. NIST contingency guidance requires planning, testing, training, and maintenance for recovery.

**Required implementation.** Test SQL dump or physical/PITR strategy according to recovery objectives. Restore into an isolated supported environment, recreate roles, run migrations and full verification, reconcile financial state, and reapply privacy deletion state.

**Required turn-red evidence.** Corrupt or omit roles, grants, a WAL segment, extension, migration, or deletion register. The restore exercise must detect the defect.

**Qualification evidence.** Governed restore drills meet RPO/RTO and produce reconciled canonical financial state.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S16], [S29]

---

### OPS-06 — Reports derive from governed immutable facts and versioned projections `[C]`

**Rule.** Financial statements and ledger-based statutory reports read from reconciled ledger-derived projections. Other statutory outputs read from governed projections over relevant immutable authoritative facts and subledgers, never mutable live documents.

**Why this method is justified.** Restatement requires reproducible reporting inputs. Provenance and deterministic-build concepts support versioned algorithms and inputs; IAS 8 requires corrected comparative information where applicable.

**Required implementation.** Record projection algorithm version, source boundaries, reference data, as-of values, and successful reconciliation. Rebuild from empty projection state. Filed outputs preserve evidence and become authoritative artifacts.

**Required turn-red evidence.** Change live document fields after posting and alter a filed report; rebuild with different result; omit algorithm version. Projection controls must fail.

**Qualification evidence.** Independent rebuilds are canonically equal and reports reconcile to ledger/subledger sources.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S18], [S22], [S23]

---

### OPS-07 — Every control account reconciles to its authoritative subledger `[C]`

**Rule.** Receivables, payables, cash/bank, tax, payroll, fixed assets, intercompany, inventory, and other control accounts shall reconcile to their authoritative subledgers under declared timing and exception policies.

**Why this method is justified.** Double-entry balance alone proves only that debits equal credits, not that subledger detail is complete or correctly classified. Verification requires an independent observable relationship.

**Required implementation.** Define reconciliation formula, timing, expected temporary differences, exception workflow, owner, and close gate. Inventory uses its declared valuation policy rather than a naive quantity-times-value identity.

**Required turn-red evidence.** Drop a subledger item, post to wrong control account, alter a cost layer, create timing difference outside policy, or omit an intercompany item. Reconciliation must turn red.

**Qualification evidence.** Close-cycle rehearsals produce zero unexplained differences and retain resolution evidence.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S01], [S17], [S18]

---

### OPS-08 — Every production defect becomes a regression and, where material, a mutant `[C]`

**Rule.** A defect is not closed until a test reproduces it, the fix passes, and a domain mutant or equivalent negative fixture proves the controlling suite would detect its recurrence.

**Why this method is justified.** NIST recommends historical tests. Tailored mutation research shows project-specific mutants reach real-fault classes generic operators miss.

**Required implementation.** Maintain incident lineage, reproduction, control mapping, regression, mutant, fix, and release evidence. The corpus only grows unless equivalence or obsolescence is proved.

**Required turn-red evidence.** Fix code without a failing reproduction; add a test that passes before the fix; remove an incident mutant. Governance must fail.

**Qualification evidence.** Release gate demonstrates the regression red on the faulty baseline or mutant and green on the fix.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S02], [S27]



# 13. Jurisdictional controls

### JUR-01 — Jurisdiction rules are versioned deployment inputs, not global assumptions `[J]`

**Rule.** Numbering, tax point, retention, residency, statutory schema, correction window, rounding, filing calendar, and mandatory fields shall be declared per jurisdiction and effective period.

**Why this method is justified.** Regulatory requirements vary and change. Malaysia’s PDPA and LHDN e-Invoice materials are jurisdiction-specific and versioned; global defaults would be unsafe.

**Required implementation.** Maintain a jurisdiction register with source URL, publication/version, effective dates, applicability, interpretation owner, tests, and supersession. No jurisdiction is inherited by convenience.

**Required turn-red evidence.** Deploy without a complete applicable register; use an expired schema/version; apply one jurisdiction’s rule globally. The launch gate must fail.

**Qualification evidence.** Qualified legal/accounting review and regulator-sourced fixtures pass for the deployment’s effective date.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S30], [S31], [S32]

---

### JUR-02 — Malaysia MyInvois integration tracks current official guideline and SDK versions `[J]`

**Rule.** For Malaysia, the integration shall pin the applicable LHDN e-Invoice Guideline, Specific Guideline, SDK/document version, validation rules, mandatory fields, and effective programme dates.

**Why this method is justified.** LHDN currently lists e-Invoice Guideline v4.7 and Specific Guideline v4.8 published 7 July 2026, while the SDK release notes show continuing updates through July 2026. This volatility requires versioned qualification.

**Required implementation.** Record exact document and SDK versions in the jurisdiction register and generated validation contracts. Requalify on regulator change; do not silently accept new versions.

**Required turn-red evidence.** Change SDK document version, mandatory field, tax-exemption interpretation, or effective period without qualification. Jurisdiction gates must fail.

**Qualification evidence.** Official sample/validation corpus and controlled sandbox/pilot submissions pass for the applicable taxpayer phase.

**Current AFENDA evidence grade.** **E1 — SPECIFIED; GO-LIVE NOT QUALIFIED**

**Source basis.** [S32], [S33]

---

### JUR-03 — Statutory correction windows are authority-derived and time-aware `[J]`

**Rule.** MyInvois rejection/cancellation eligibility shall be determined from the authority’s document-type workflow parameters and validation timestamp; after the allowed window, correction uses the applicable credit/debit/refund mechanism.

**Why this method is justified.** MyInvois documentation states that the time limit is document-type specific and currently describes a 72-hour window, with later correction through adjustment documents.

**Required implementation.** Persist authority validation time and workflow/version. Query or cache document-type workflow parameters under a versioned policy. Never infer the window from issue date or local clock alone.

**Required turn-red evidence.** Use document date instead of validation time; accept after expiry; reject before expiry; hard-code a window inconsistent with authority parameters. Tests must fail.

**Qualification evidence.** Sandbox/pilot scenarios cover boundary seconds, delayed callbacks, timezone conversion, and post-window correction.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S34]

---

### JUR-04 — Privacy, retention, and launch readiness are explicit go-live gates `[J/C]`

**Rule.** No jurisdictional feature goes live until applicable privacy, retention, schema, submission, correction, numbering, monitoring, recovery, and operator procedures are qualified.

**Why this method is justified.** Official regulatory sources establish obligations but production readiness also requires software assurance and recovery evidence.

**Required implementation.** Use a jurisdiction launch matrix mapping every rule to source, implementation, negative tests, qualification environment, accountable owner, and residual risk acceptance.

**Required turn-red evidence.** Attempt production enablement with an open blocking item, unqualified regulator version, missing restore, or untested correction path. Deployment must fail closed.

**Qualification evidence.** Named business, accounting/tax, privacy, security, and engineering owners approve a complete evidence package.

**Current AFENDA evidence grade.** **E1 — SPECIFIED**

**Source basis.** [S30], [S31], [S32], [S33], [S34]

# 14. Minimum executable verification spine

The rule cards are authoritative; this matrix is the minimum named control set. A repository may split controls, but may not silently omit them.

| Control | Primary rules | Must prove | Required red condition |
|---|---|---|---|
| **V01 Privilege topology** | LED-01, LED-02, SEC-01, SEC-04 | Runtime roles cannot update/delete or directly insert; capability grants/configuration exact | Grant or role-membership escalation |
| **V02 Atomic batch balance** | LED-03 | No partial or functionally imbalanced batch commits | Remove/defer incorrectly the balance guard |
| **V03 Source balance before rounding** | LED-04 | Economic source balances before conversion | Debit 100 / credit 99 at 1:1 |
| **V04 Rounding boundary** | LED-05, MON-04 | Correct registered policy and explicit line | Half-even→half-up; hidden adjustment |
| **V05 Scope integrity** | LED-08, SEC-03 | Account/ledger/record scope cannot cross without explicit authority | Remove entity/scope predicate |
| **V06 Idempotency fingerprint** | LED-07, OPS-01 | Same key+same digest repeats; changed digest conflicts; concurrency one effect | Reuse key with changed amount/account/entity |
| **V07 Exact reversal** | LED-06, TIM-05 | Linkage, monetary and dimensional negation, original rate basis | Omit link; change dimension/rate |
| **V08 Exact money transport** | MON-01, MON-06 | Values survive every boundary exactly | 2^53+1 and bigint-range corpus |
| **V09 Typed evidence** | LED-09 | Policy/reference versions are valid and resolvable | Non-empty meaningless JSON |
| **V10 Temporal governance** | TIM-01–TIM-04 | Named governing dates/policies and as-of behavior | Substitute document date for accounting date |
| **V11 Cross-scope authorization** | SEC-02, SEC-03 | All declared scopes fail closed | Tenant/entity/group bypass |
| **V12 Mutation sensitivity** | GOV-03, OPS-08 | Critical corpus killed by real controls | Any surviving critical mutant |
| **V13 Oracle diversity** | GOV-04, MON-05, OPS-06, OPS-07 | Independent calculation detects common-mode defects | Consistently wrong but self-balancing conversion |
| **V14 Provenance and reproducibility** | GOV-05, DET-01–DET-06 | Complete bundle and byte-stable deterministic expansion | Missing lock/hash/input; hidden toolchain change |
| **V15 Concurrency** | LED-10, OPS-02, OPS-03 | Declared interleavings, retries, one effect | Close/post race; lock inversion |
| **V16 Projection and reconciliation** | OPS-06, OPS-07 | Canonical rebuild and subledger control-account equality | Drop/misclassify a subledger fact |
| **V17 Restore** | OPS-05, SEC-10 | Restored roles/data/evidence reconcile and privacy state reapplies | Omit role/grant/deletion state |
| **V18 Jurisdiction launch** | JUR-01–JUR-04 | Applicable regulator version, correction, privacy, recovery, operations | Enable with open blocking evidence |

## Gate cadence

| Gate | Contents | Trigger |
|---|---|---|
| **Fast** | Rule mapping, types/static checks, V01–V05, V08–V11 as affected | Every commit |
| **Merge** | All affected controls, property sequences, affected V12 mutants, affected V13 oracle | Every merge request |
| **Nightly** | Full V12 corpus, full V13 comparisons, V15 stress, V16 rebuild | Scheduled |
| **Qualification** | V01–V18 in supported deployment topology, generator qualification, migration/restore | Before release and on qualified toolchain/platform change |
| **Production** | Reconciliation, privilege/scope drift, outbox/submission ambiguity, restore cadence, incident regressions | Governed operational cadence |

A gate that is routinely bypassed or waited out is a defective gate. Split or relocate it; do not silently remove the control.

# 15. Current AFENDA evidence ledger

This section is **append-only evidence**, not a second doctrine. Updating a grade or recording a test does not amend the normative rule.

## 15.1 Supplied implementation snapshot

| File | SHA-256 |
|---|---|
| `DOCTRINE.md` (prior v5 input) | `d7b384b9cdfb2fc6b219d8cb129b0bf0483f0ff1608f04e5d25f97d6376a9899` |
| `001_ledger.sql` | `dbfac69e27b623de00d43092a6c4078f73a366692fc2e8bd3acd13cfb5ebeaff` |
| `spine.mjs` | `a9b43a0b462895560b87119c7252aa84e6db422aaed4ed6d82aa7706f6942f71` |
| `mutants.mjs` | `3e24141e9eb7c9c5889f29d8f671a35009b3fc2bdec8a2ee72bcf48a077f99c9` |
| `CLAUDE.md` | `afaf542da2e0e402105f9df4519bf551813feb497eb15d1fa77ea5250003b6c7` |

## 15.2 Directly reproduced in this review

- `node --check spine.mjs` — passed.
- `node --check mutants.mjs` — passed.
- Source and doctrine hashes above — calculated.
- Static inspection of the supplied SQL and test code — completed.

## 15.3 Reported but not independently reproduced from the supplied bundle

The prior v5 document reports:

- fast spine: **16/16**;
- mutation campaign: **7/7 killed**;
- execution against PostgreSQL 18.3 through PGlite/wasm.

Those results are useful historical evidence, but the supplied bundle did not include the package manifest, dependency lock, installed PGlite dependency, doctrine hash file, full gate runners, or referenced amendment record needed for clean independent reproduction. They therefore carry the **`-R`** modifier.

## 15.4 Mandatory current red findings

These findings are not doctrine opinions; they are observable gaps in the supplied implementation and must remain red until corrected and independently retested.

| Red ID | Mapped rules | Finding | Required proof of closure |
|---|---|---|---|
| **RED-01** | LED-04, LED-05 | `post_batch` does not first prove source debit=credit; a small economic imbalance can be posted as “rounding” under `v_tol := line_count + 1` | 100 debit / 99 credit at 1:1 rejects; domain mutant killed |
| **RED-02** | LED-08, SEC-03 | A batch can reference an account from another entity because `account.entity_id` is not matched to `posting_batch.entity_id` | Composite ownership enforcement and cross-entity mutant |
| **RED-03** | MON-01, MON-06 | JavaScript checks construct/convert authoritative amounts through `Number`, losing integers beyond 2^53−1 | String/bigint transport and boundary corpus |
| **RED-04** | LED-07, OPS-01 | Same idempotency key with a different payload returns the previous batch; no canonical request digest conflict | Same-key/different-payload rejection and concurrent test |
| **RED-05** | LED-06 | V4 does not require `reverses_batch_id`, dimension equality, or independent original-basis comparison | Independent exact-reversal control and mutants |
| **RED-06** | SEC-04 | Search-path check accepts any `search_path=` value rather than the exact approved secure value | Unsafe `public`/temp path mutants killed |
| **RED-07** | LED-09 | Evidence constraint proves only non-empty JSON, not typed or resolvable policy/reference versions | Registry/schema/reference validation and mutant |
| **RED-08** | LED-01, SEC-01 | Immutability evidence does not yet cover update/delete on both batch and line through every runtime credential and membership path | Complete role/operation matrix on supported PostgreSQL |
| **RED-09** | GOV-05, DET-06 | Verification package is incomplete for an independent clean run | Manifest, lockfile, dependency, hash seal, commands, supported environment |

## 15.5 Current overall grade

- **Doctrine quality:** source-backed and falsifiable at **E1 SPECIFIED**.
- **Ledger prototype:** partial E2/E3 reported evidence with material RED findings.
- **Deployment qualification:** not yet E5.
- **Battle-proven claim:** prohibited; no E6 operational evidence exists yet.

This is the intended behavior of the doctrine: implementation contact makes unsupported confidence turn red.

# 16. The Forbidden

These are build or release failures, not style preferences.

1. Calling a citation proof of AFENDA implementation.
2. Calling a green test proof when the mapped fault cannot make it red.
3. Calling anything battle-proven below E6.
4. Binary floating point in an authoritative monetary path.
5. Direct request-role insertion into posted ledger tables.
6. Runtime UPDATE or DELETE of posted financial substance.
7. Rounding used to repair an economically unbalanced source.
8. Silent rounding or an unregistered rounding boundary.
9. Cross-scope access protected only by application filtering.
10. An idempotency key accepted with a different canonical payload.
11. A technical reversal without exact linkage and fact equality.
12. An unnamed, inferred, or overloaded governing date.
13. An authoritative decision based on ambient clock, randomness, locale, environment, or unrecorded external response.
14. User-authored or runtime-editable executable business logic stored as data.
15. Arbitrary method override, internal import, or unnamed injection point.
16. Untrusted extension code inside financial posting.
17. Personal data inline in immutable financial substance without a justified jurisdictional requirement and approved design.
18. A critical invariant graded only through the implementation’s own calculation path.
19. A verification claim without a complete reproducible evidence bundle.
20. Loading a doctrine authority other than this hash-matched file.

# 17. Ratification, freeze, and evidence updates

## 17.1 Ratification

Upon adoption, this file becomes the only doctrine authority. Record its SHA-256 in repository governance and require the hash before loading it as standing context.

## 17.2 Freeze

The normative rules are frozen. A rule changes only when supported by:

- implementation contradiction;
- surviving material mutant;
- production or pilot incident;
- audit/accounting finding;
- changed law, regulator guidance, or supported platform behavior;
- measurable governance failure;
- demonstrated harm from the rule as written.

Stylistic improvement, theoretical completeness, or another opinion-only review is not evidence.

## 17.3 Evidence updates

Evidence entries may be appended without changing a rule:

- test command, environment, and result;
- killed or surviving mutant;
- independent oracle result;
- qualification run;
- restore or concurrency exercise;
- production metric, incident, and regression;
- source version and applicability review.

A grade may advance only when all criteria for that grade are met. It may be downgraded immediately when contradictory evidence appears.

## 17.4 Source updates

Jurisdictional and current-platform sources are reviewed before qualification and on material source updates. A changed source does not silently rewrite a rule; it opens a traceable amendment or jurisdiction-register update.

# 18. Source register

Accessed 6 August 2026 unless otherwise stated. Sources establish rationale and recognized control objectives; local AFENDA proof still requires the evidence defined above.

- **[S01] NASA, Systems Engineering Handbook, Appendix D—Requirements Verification Matrix.** Unique “shall” identifiers, definitive sources, and planned verification.  
  https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/

- **[S02] NIST IR 8397, Guidelines on Minimum Standards for Developer Verification of Software.** Threat modeling, automated, static, black-box, structural, historical, fuzz, and dependency verification.  
  https://csrc.nist.gov/pubs/ir/8397/final

- **[S03] NIST SP 800-53 Rev. 5, Release 5.2.0, Security and Privacy Controls.** Includes separation of duties, least privilege, audit protection, backup/recovery, testing, and input validation control families.  
  https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final

- **[S04] NIST SP 800-53A Rev. 5, Assessing Security and Privacy Controls.** Assessment methodology and procedures; control adoption is distinct from assurance.  
  https://csrc.nist.gov/pubs/sp/800/53/a/r5/final

- **[S05] NIST SP 800-218, Secure Software Development Framework v1.1.** Secure development, delivery, and root-cause prevention practices.  
  https://csrc.nist.gov/pubs/sp/800/218/final

- **[S06] OWASP Application Security Verification Standard 5.0.0.** Verifiable security requirements with version-qualified identifiers.  
  https://owasp.org/www-project-application-security-verification-standard/

- **[S07] OWASP Authorization Cheat Sheet.** Least privilege, deny by default, validate every request, log and test authorization.  
  https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

- **[S08] PostgreSQL, Numeric Types.** Floating point is inexact; exact numeric is recommended for monetary amounts.  
  https://www.postgresql.org/docs/current/datatype-numeric.html

- **[S09] PostgreSQL, Constraints.** Check, unique, primary, foreign-key, and integrity behavior.  
  https://www.postgresql.org/docs/current/ddl-constraints.html

- **[S10] PostgreSQL, CREATE TRIGGER.** Deferred constraint triggers and exception-based enforcement.  
  https://www.postgresql.org/docs/current/sql-createtrigger.html

- **[S11] PostgreSQL, CREATE FUNCTION—Writing SECURITY DEFINER Functions Safely.** Secure search_path and selective EXECUTE grants.  
  https://www.postgresql.org/docs/current/sql-createfunction.html

- **[S12] PostgreSQL, Row Security Policies.** Default-deny behavior, role-specific policies, and owner/BYPASSRLS caveats.  
  https://www.postgresql.org/docs/current/ddl-rowsecurity.html

- **[S13] PostgreSQL, Transaction Isolation.** Serializable semantics and whole-transaction retry requirements.  
  https://www.postgresql.org/docs/current/transaction-iso.html

- **[S14] PostgreSQL, Explicit Locking.** Deadlocks, consistent lock ordering, and retry.  
  https://www.postgresql.org/docs/current/explicit-locking.html

- **[S15] PostgreSQL, Date/Time Types.** Timestamp semantics, UTC storage, timezone handling, and ambiguity cautions.  
  https://www.postgresql.org/docs/current/datatype-datetime.html

- **[S16] PostgreSQL, Backup and Restore.** SQL dump, filesystem backup, continuous archiving, and restore considerations.  
  https://www.postgresql.org/docs/current/backup.html

- **[S17] U.S. Internal Revenue Service, Publication 583—Starting a Business and Keeping Records.** Double-entry system and total debits equaling total credits.  
  https://www.irs.gov/publications/p583

- **[S18] IFRS Foundation, IAS 8—Basis of Preparation of Financial Statements.** Retrospective policy application, prospective estimate changes, and prior-period error restatement.  
  https://www.ifrs.org/issued-standards/list-of-standards/ias-8-basis-of-preparation-of-financial-statements/

- **[S19] IFRS Foundation, IAS 21—The Effects of Changes in Foreign Exchange Rates.** Functional and presentation currency and exchange-rate issues.  
  https://www.ifrs.org/issued-standards/list-of-standards/ias-21-the-effects-of-changes-in-foreign-exchange-rates/

- **[S20] RFC 3339, Date and Time on the Internet: Timestamps.** Unambiguous Internet timestamp format and UTC offsets.  
  https://www.rfc-editor.org/info/rfc3339/

- **[S21] RFC 8785, JSON Canonicalization Scheme.** Deterministic JSON, duplicate-key/Unicode requirements, and string representation for higher-precision integers.  
  https://www.rfc-editor.org/rfc/rfc8785.html

- **[S22] SLSA v1.2, Provenance.** Verifiable information about where, when, and how artifacts were produced.  
  https://slsa.dev/spec/v1.2/provenance

- **[S23] Reproducible Builds, Definitions.** Same source, environment, and instructions reproduce specified artifacts bit-for-bit; ancillary logs are distinct.  
  https://reproducible-builds.org/docs/definition/

- **[S24] D. L. Parnas, “On the Criteria To Be Used in Decomposing Systems into Modules,” Communications of the ACM (1972).** Information hiding and modularization around likely change.  
  https://doi.org/10.1145/361598.361623

- **[S25] MITRE CWE-94, Improper Control of Generation of Code.** Avoid dynamic code generation, use allowlists, validate input, and isolate execution.  
  https://cwe.mitre.org/data/definitions/94.html

- **[S26] Claessen and Hughes, “QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs.”** Property-based random testing and custom generators.  
  https://doi.org/10.1145/357766.351266

- **[S27] Allamanis, Barr, Just, and Sutton, “Tailored Mutants Fit Bugs Better.”** Project-tailored mutation operators and coupling to real faults.  
  https://arxiv.org/abs/1611.02516

- **[S28] NIST SP 800-92, Guide to Computer Security Log Management.** Effective log-management infrastructure and processes.  
  https://csrc.nist.gov/pubs/sp/800/92/final

- **[S29] NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems.** Recovery planning, testing, training, exercises, and maintenance.  
  https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final

- **[S30] Malaysia Personal Data Protection Department, Principles of Personal Data Protection.** Consent/notice, disclosure, security, storage limitation, integrity, and access.  
  https://www.pdp.gov.my/ppdpv1/en/principles-of-personal-data-protection/

- **[S31] Malaysia Personal Data Protection Standard 2015.** Minimum security, storage, and data-integrity requirements.  
  https://www.pdp.gov.my/ppdpv1/en/personal-data-protection-standard-2015/

- **[S32] Lembaga Hasil Dalam Negeri Malaysia, e-Invoice Guidelines.** Current page lists Guideline v4.7 and Specific Guideline v4.8, published 7 July 2026.  
  https://www.hasil.gov.my/en/e-invoice/reference-for-the-implementation-of-e-invoice/guidelines/

- **[S33] MyInvois SDK 1.0 Release and Release Notes.** Versioned technical updates, including July 2026 changes.  
  https://sdk.myinvois.hasil.gov.my/sdk-1-0-release/  
  https://sdk.myinvois.hasil.gov.my/release-notes/

- **[S34] MyInvois Reject Document and Cancel Document APIs.** Validation-time workflow windows and post-window adjustment documents.  
  https://sdk.myinvois.hasil.gov.my/einvoicingapi/04-reject-document/  
  https://sdk.myinvois.hasil.gov.my/einvoicingapi/03-cancel-document/

- **[S35] IETF HTTPAPI Working Group, draft Idempotency-Key HTTP Header Field, revision 07.** **Expired work in progress, not a final RFC.** Useful guidance: keys identify retries and must not be reused with a different payload.  
  https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header

- **[S36] PostgreSQL, Privileges / GRANT and REVOKE model.** Object ownership and granular SELECT/INSERT/UPDATE/DELETE/EXECUTE/USAGE privileges.  
  https://www.postgresql.org/docs/current/ddl-priv.html

# 19. Final operating rule

> **Use the citations to justify why a rule exists. Use executable evidence to prove AFENDA enforces it. Use injected faults to prove the evidence has teeth. Use independent oracles to reduce collusion. Use qualification to prove the supported deployment. Use operations to earn the words “battle-proven.”**

The doctrine is now complete enough to use. The next action is not another rewrite. The next action is to close the RED findings, run the verification spine from a sealed bundle, qualify on supported PostgreSQL, and append the resulting evidence grades here.
