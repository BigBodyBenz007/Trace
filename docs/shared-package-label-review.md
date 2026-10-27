# Shared package-label review — Preview implementation

This extends working device-local personal labels. Nothing is uploaded when a
personal label is saved. Sharing is a separate, explicit consent action.
**Setup progress, October 27, 2026:** the owner created the dedicated Free project
and ran the committed migration. Owner-provided catalog results confirm all
three tables have RLS, browser roles have no table/RPC access, service_role has
explicit data/RPC grants, and the JPEG evidence bucket is private (2 MiB limit).
Storage RLS is enabled with no Storage policies; ensure_rls is active. The owner
created the one confirmed Auth user, verified that its password is set, enabled
the Email provider and disabled public sign-ups. Account metadata does not prove
a known/strong password or a successful login.

The owner reported saving all seven documented Vercel settings for Preview on
feature/personal-package-label-20261024 only, with Production and Development
unselected. Server/publishable keys, owner email and rate secret were saved as
Secret; no credential values or owner UUID/email were collected in chat or this
report. Vercel settings were not independently inspected through its management
API. The next verification uses the real hosted Preview; local tests and these
owner-reported setup steps do not prove hosted authentication or transactions.

The hosted default email templates cannot be edited without custom SMTP, as
reported by the Dashboard. The SMTP-dependent code-entry setup is replaced in
this checkout by Supabase email/password authentication for the existing owner.
No custom SMTP, paid service, billing or account has been added. The deployed
Preview is not updated until the feature branch is redeployed. Local synthetic
tests are not hosted sign-in or shared-publication proof.

## One recommended setup, with no purchase

Use a dedicated **Supabase Free project** for Postgres, private Storage and the
single owner's email/password authentication. Ordinary submitters do not create
accounts. Do not enable billing or upgrade plans for this Preview.

Public quotas checked October 24, 2026: Free is $0/month, 500 MB database,
1 GB file storage, 5 GB egress and 50,000 monthly active users; inactive projects
can pause after a week. Automatic backups are not included. This is suitable for
a small protected trial, not an uptime or long-term archival commitment.
[Supabase pricing](https://supabase.com/pricing)

Routine owner sign-in uses Supabase's password grant, which sends no email and
does not depend on template editing or custom SMTP. It requires the existing
owner's confirmed email identity, a privately held password and the Email provider
enabled. Public sign-ups stay disabled. This is Supabase Auth verification, not
a password embedded in Trace or compared in client code.
[Password sign-in](https://supabase.com/docs/guides/auth/passwords),
[Auth password-grant contract](https://supabase.github.io/auth/#post-token).

The default mail service remains restricted to project-team addresses with
best-effort delivery and currently two messages/hour. Password-reset/confirmation
emails are separate from routine sign-in; an app recovery flow is not configured
or verified here. Do not assume a default reset link completes recovery in Trace.
[Supabase SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp)

## Exact setup steps for the owner

1. Open [Supabase](https://supabase.com/dashboard), create/sign in to your own
   account and create **one dedicated Free project**. Keep its database password
   private. Do not paste credentials into chat or the repository.
2. In that project's **SQL Editor**, paste and run the entire committed file
   [20261024_shared_package_labels.sql](../supabase/migrations/20261024_shared_package_labels.sql).
   Verify the three trace_label tables have RLS enabled, no anon/authenticated
   policies, and the trace-label-evidence Storage bucket is private. On a fresh
   dedicated project there must be no broad Storage policies allowing browser
   roles into this bucket.
3. Under **Authentication → Users**, use the one existing owner user with your
   project-team email, a confirmed email and a strong unique password. This is the
   project's Auth user, separate from the Supabase Dashboard login. Keep public
   sign-ups disabled and the Email provider enabled. Copy the user's UUID directly
   into the Vercel setting below. Do not edit email templates, configure SMTP or
   disable email confirmation globally. Never paste passwords or keys into chat.
   A read-only check can confirm readiness without exposing identity/hash values:

   ```sql
   select count(*) as user_count,
     bool_and(email_confirmed_at is not null) as all_emails_confirmed,
     bool_and(coalesce(encrypted_password, '') <> '') as all_passwords_set
   from auth.users;
   ```

   For this dedicated initial project expect one user and both booleans true.
   These booleans do not establish password strength, knowledge or successful
   authentication. If they differ, inspect the specific account before proceeding.
4. In the existing Vercel Trace project, add the following **server-side variables
   to Preview only**, scoped to branch `feature/personal-package-label-20261024`.
   Never prefix these with REACT_APP_ or put them in a browser bundle:
   - TRACE_LABELS_ENABLED: true
   - SUPABASE_URL: the new project's HTTPS project URL
   - SUPABASE_SERVICE_ROLE_KEY: its server secret key (sb_secret_...), or legacy service_role key
   - SUPABASE_ANON_KEY: its publishable (sb_publishable_...) or legacy anon API key, used server-side for Auth
   - TRACE_LABEL_OWNER_ID: the confirmed owner's UUID
   - TRACE_LABEL_OWNER_EMAIL: that same owner's email
   - TRACE_LABEL_RATE_SECRET: a new random value of at least 32 characters;
     generate privately, for example with `openssl rand -hex 32`, and paste it
     directly into Vercel, not chat.
5. Redeploy the existing feature branch to **Preview**, retaining Deployment
   Protection and its sharing route. No Production variables or domain change.
   Owner screen: open the protected Preview, then `/?labelReview=1`.
   Enter the configured owner's email and Supabase Auth password in Trace. Do not
   put that password into Vercel variables or chat. The server exchanges it with
   Supabase over HTTPS, validates the confirmed user ID/email and sets a host-only
   HttpOnly Secure SameSite=Strict session cookie. Each review/evidence operation
   rechecks the current Auth user. Existing same-origin and durable rate limits
   remain in force; passwords and refresh tokens are not persisted by Trace.
6. Complete the first real hosted synthetic submission → review/transcription
   edit → approve → new-browser version choice → withdraw check. No hosted shared
   transaction has been tested yet. Withdraw any test publication and remove only
   explicitly identified disposable evidence/rows in the dedicated test project
   after checking references. Keep real review history and approved evidence.
   Do not publish real labels until these provisioned checks pass.

**Setup handoff:** configuration steps are reported complete. Release the saved
five-file owner-auth repair on this feature branch to Preview only, verify its
exact deployment and test the real protected sharing route. Any necessary owner
sign-in must happen privately in Trace, using that Auth user's password, never
in chat or an environment variable. Provide one plain-language owner step at a
time if sharing access or sign-in needs interaction. Real sign-in, evidence
access and approval/rejection/withdrawal remain unverified until exercised.

## User and owner flows

User: scan or enter a barcode → Use my package label → photo/manual confirmation
→ Save my label. Then open Optional shared review. Add clear barcode, package and
complete Nutrition Facts photos; ingredient publication additionally requires
the same package's ingredient declaration and photo. The disclosure enumerates
the fields, relevant original-provider comparison and label photos that will
upload. Three explicit confirmations include upload/publication consent.
Submission stays pending, with an idempotent receipt. Personal use works even
when shared services fail, pause or are not configured.

Owner: filter pending/status list, open a submission, compare private photos
beside editable final values and the existing reviewed edition (or an explicitly
unverified submitted provider comparison). Inspect serving/ingredient changes,
duplicates, transcription and major-departure hints. Missing numbers remain
null. Unusual legitimate values are not replaced or automatically rejected.
Record a reason, then approve or reject. Questionable evidence can remain pending.
Submitted values and final transcription edits are retained in decision history.
Withdrawal removes a publication from future choices. Re-publishing a withdrawn
prior edition creates a new version referencing it, never edits old snapshots.
Review is not manufacturer certification or proof of authenticity/currentness.

## Coherence and device history

All approved editions remain separate. Barcode alone never auto-applies a shared
panel: users compare product, variant, package, serving and panel, then explicitly
confirm the match. Multiple editions are offered as choices. Personal labels
retain precedence; users may deliberately inspect shared editions separately.
Every fresh/cached provider lookup checks active shared editions online without
changing provider order. The app does not persist a shared-version cache. It
rechecks the version before Use This Food; if withdrawn or status cannot be
checked, users can choose provider/personal data instead.

A selected shared edition replaces the whole serving panel and only its own
confirmed ingredient declaration. Missing ingredient evidence stays unknown;
provider ingredients, manufacturer authority and old sodium conflicts are not
carried onto the new edition. Original provider observations remain separate.
New entries snapshot reviewed-label version/provenance and original observations;
historical entries are never migrated or rewritten. Withdrawing does not erase
personal corrections or old entries. Offline provider/personal use remains
available; fresh shared selection requires an online status check.

Nutrition v2, additive identities/weights, correction applicability,
protein-supplement boundary and sodium/salt calculation rules are unchanged.
Main/Production and the user's browser profiles are outside this deployment.
The already-approved Trophy Case repair is also retained on this branch.

## Security, limits and maintenance

Vercel routes use server-only Supabase REST calls. RLS/table/function grants deny
browser roles. Private Storage objects have no public URLs; owner-authenticated,
no-store image responses proxy evidence. Secure HttpOnly SameSite=Strict owner
cookies are checked against Auth's current user, plus same-origin checks for
writes. A request-body owner role cannot authorize anything. API requests bypass
the service worker, including images opened in a tab.

Uploads use separate 2 MiB photo requests, below Vercel's 4.5 MB body limit.
[Function limits](https://vercel.com/docs/functions/limitations)
Sharp decodes still JPEG/PNG/WebP, rejects corrupt/oversize/animated inputs, caps
24 million pixels, rotates/resizes to 2400 px, re-encodes JPEG and omits metadata.
[Sharp metadata behavior](https://sharp.pixelplumbing.com/api-output/)

A session-only retry capability is hashed on the server and excluded from
backups. Identical retries resume the same submission; changed evidence needs a
new submission. Uploads expire after 24 hours. Durable transaction counters
limit per-address requests (IP stored only as keyed hash), global requests,
100 daily/new outstanding submissions and 500 MiB of referenced evidence.
Approval/withdrawal uses row locks and expected revisions, returning a conflict
instead of overwriting another decision.

These are initial bounded abuse controls, not DDoS protection. No CAPTCHA or
paid service was introduced. The owner must monitor quotas and manually remove
expired abandoned/rejected disposable uploads and orphaned objects, respecting
approved-version references and history. A failed object/DB cleanup can leave an
orphan; Free storage limits still apply. There is no automatic retention deletion
or external backup service. Keep separately secured operational backups before
real shared publication. Owner-provided catalog checks establish the applied
migration grants/RLS and private bucket settings. Actual Auth requests, Storage denial/access and database
transactions still require hosted verification; mock stores do not establish them.

## Reproducible focused validation

- `node --test scripts/shared-package-label-server.test.cjs scripts/package-label-submission.test.cjs`
  (Sharp must be installed by the feature lockfile; local isolated testing used
  NODE_PATH pointing to an ignored dependency prefix, leaving main's junction
  dependencies untouched.)
- `npm test -- --watch=false --runInBand --runTestsByPath src/services/sharedPackageLabels.test.js src/components/SharedLabelReviewPage.test.jsx src/components/NutritionPage.sharedLabel.test.jsx src/components/NutritionPage.packageLabel.test.jsx src/services/sharedPackageLabelReview.test.js src/serviceWorkerOffline.test.js`
- Existing manufacturer/provider, nullable-sodium, protein boundary, grading-mode
  and production CommonJS regressions are reused/run as listed in the delivery.
- `node scripts/verify-shared-package-labels.cjs` captures the actual components
  with explicitly synthetic local API transport, at 390×844 and 1440×1000.
  It is not a live Supabase submission test.

Server tests cover consent/whitelisting, real image decoding/metadata stripping,
invalid input, forged/cross-site owner access, secure Auth cookies, private
evidence, retry/approval/rejection/withdrawal contracts and SQL permission/locking
statements. Integration covers coherent review → selected edition → 1.25 servings
→ save/reopen with unknown sodium, provider snapshot and history preservation.

## Complete implementation inventory

- `api/labels/_reviewPolicy.cjs`
- `api/labels/_service.cjs`
- `api/labels/_validation.cjs`
- `api/labels/evidence.mjs`
- `api/labels/review.mjs`
- `api/labels/session.mjs`
- `api/labels/submissions.mjs`
- `api/labels/versions.mjs`
- `docs/package-label-corrections.md`
- `docs/shared-package-label-review.md`
- `package-lock.json`
- `package.json`
- `public/service-worker.js`
- `scripts/shared-package-label-server.test.cjs`
- `scripts/verify-shared-package-labels.cjs`
- `src/components/BarcodeScannerDialog.jsx`
- `src/components/NutritionPage.jsx`
- `src/components/NutritionPage.packageLabel.test.jsx`
- `src/components/NutritionPage.sharedLabel.test.jsx`
- `src/components/NutritionPage.sodiumSalt.test.jsx`
- `src/components/SharedLabelReviewPage.css`
- `src/components/SharedLabelReviewPage.jsx`
- `src/components/SharedLabelReviewPage.test.jsx`
- `src/components/SharedLabelSubmission.css`
- `src/components/SharedLabelSubmission.jsx`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/barcodeNutritionAssessment.js`
- `src/development/personalPackageLabelAssessment.js`
- `src/development/traceOverallFoodQuality.js`
- `src/index.js`
- `src/serviceWorkerOffline.test.js`
- `src/services/barcodeNutritionSelection.js`
- `src/services/personalPackageLabelCandidate.js`
- `src/services/remoteBarcodeLookup.js`
- `src/services/sharedPackageLabels.js`
- `src/services/sharedPackageLabels.test.js`
- `src/services/verifiedProductNutritionCorrections.providers.test.js`
- `supabase/migrations/20261024_shared_package_labels.sql`

The preceding 90cf77541e2253f9ac012fdc2ed3028011d0a72a commit also retains the already-released Trophy Case repair in src/index.css; main is unchanged.

## Original implementation evidence (October 24, 2026)

- 194 distinct focused Jest cases passed across reviewed runs. One 5-second handoff timeout under concurrent compilation passed with its original timeout when isolated; no timeout was increased.
- Ten original Node API/image/security contracts passed using a synthetic store. Later SMTP-independent owner-auth checks are reported separately; no real shared-database transaction is claimed.
- Seven actual-component mobile/desktop screenshots inspected. Synthetic local transport is labeled. Visual checks saved no food entries. The isolated storage regression did save/reopen synthetic records.
- A temporary PostgreSQL test-engine install failed with ENOSPC. Only temporary profiles created by this task and its failed install were removed. SQL grants/locking statements were inspected, but at that time the migration was not executed. On October 25 the owner executed it and supplied passing catalog checks; real Auth/Storage/database transactions still await Preview configuration.
- Existing manufacturer corrections, personal-label independence, null-sodium save/reopen, powder boundaries, grading-mode contracts and the CommonJS repair were checked without changing scoring.

API keys are copied from Supabase Settings → API Keys. Modern secret keys are sent only in the apikey header, never as a bearer JWT; owner access tokens are separate verified user JWTs. [Supabase API-key semantics](https://supabase.com/docs/guides/getting-started/api-keys)

## SMTP-independent owner sign-in validation (October 25, 2026)

The SMTP-independent owner-authentication repair changes exactly these files:

- `api/labels/_service.cjs`
- `src/components/SharedLabelReviewPage.jsx`
- `scripts/shared-package-label-server.test.cjs`
- `src/components/SharedLabelReviewPage.test.jsx`
- `docs/shared-package-label-review.md`

No migration, grants, Storage policies, dependencies, personal-label flow or
Production configuration changed. All imports remain already tracked.

Fresh focused checks: 7 Node API/security contracts and all 5 owner-review UI
cases passed. The four changed code/test files lint with zero errors/warnings;
server/test syntax and Git whitespace checks pass. Main's protected 62 Git
entries exactly match the prior preservation baseline. No real credentials,
owner login, hosted submission or shared publication were used in these tests.

Reproduce the focused runs with:

```powershell
node --test --test-name-pattern='owner|Production|cross-origin|rejection' scripts/shared-package-label-server.test.cjs
npm test -- --watch=false --runInBand --runTestsByPath src/components/SharedLabelReviewPage.test.jsx
```

The supported Supabase password-grant protocol and Free-plan availability were
checked against the official references above. The owner-reported account check
passed on October 27; actual hosted authentication is still pending. Password reset/recovery was not added
or exercised. At the October 25 checkpoint the repair was saved without staging
or deployment. On October 27 the seven Node security cases and three existing
CommonJS startup cases passed fresh; the unchanged five UI cases and clean lint
are reused. Release only the feature branch, retain Preview protection and keep
Production unchanged. Actual hosted outcomes must be distinguished from these
local checks; never claim owner authentication from mocked results.
