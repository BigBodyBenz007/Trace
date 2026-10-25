# Shared package-label review — Preview implementation

This extends working device-local personal labels. Nothing is uploaded when a
personal label is saved. Sharing is a separate, explicit consent action.
**The Supabase project, owner identity and Vercel server variables have not been
provisioned. Shared submission/authentication/publication is therefore disabled
on the hosted Preview.** Local synthetic tests are not hosted end-to-end proof.

## One recommended setup, with no purchase

Use a dedicated **Supabase Free project** for Postgres, private Storage and the
single owner's email-code authentication. Ordinary submitters do not create
accounts. Do not enable billing or upgrade plans for this Preview.

Public quotas checked October 24, 2026: Free is $0/month, 500 MB database,
1 GB file storage, 5 GB egress and 50,000 monthly active users; inactive projects
can pause after a week. Automatic backups are not included. This is suitable for
a small protected trial, not an uptime or long-term archival commitment.
[Supabase pricing](https://supabase.com/pricing)

The default Auth email service sends only to project-team addresses, currently
two messages/hour, with no delivery SLA. Use the owner's project-team email for
this initial Preview. A wider/reliable email service would require separately
approved SMTP setup; no such account or expense was created.
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
3. Under **Authentication → Users**, create the one owner user with your project
   team email, confirm its email, and copy its user UUID. Disable public sign-ups.
   Under **Authentication → Email Templates → Magic Link**, use an email-code
   template containing `{{ .Token }}`, rather than a redirect link.
   [Email OTP configuration](https://supabase.com/docs/guides/auth/auth-email-passwordless)
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
   Send a code to your configured email and enter it. The API validates the
   returned confirmed user ID/email on every review/evidence operation.
6. Complete the first real hosted synthetic submission → review/transcription
   edit → approve → new-browser version choice → withdraw check. No hosted shared
   transaction has been tested yet. Withdraw any test publication and remove only
   explicitly identified disposable evidence/rows in the dedicated test project
   after checking references. Keep real review history and approved evidence.
   Do not publish real labels until these provisioned checks pass.

**Next owner action:** create the dedicated Free project and follow steps 2–4.
No secret needs to be sent to Codex. Provisioning and a Preview redeploy are
required before sharing or owner sign-in can work.

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
real shared publication. The database migration and real Auth/Storage RLS must
be exercised against the provisioned project; static checks and mock stores do
not establish that deployment.

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

## Final local evidence

- 194 distinct focused Jest cases passed across reviewed runs. One 5-second handoff timeout under concurrent compilation passed with its original timeout when isolated; no timeout was increased.
- Ten Node API/image/security contracts passed using a synthetic store. No real shared-database transaction is claimed.
- Seven actual-component mobile/desktop screenshots inspected. Synthetic local transport is labeled. Visual checks saved no food entries. The isolated storage regression did save/reopen synthetic records.
- A temporary PostgreSQL test-engine install failed with ENOSPC. Only temporary profiles created by this task and its failed install were removed. SQL grants/locking statements were inspected, but the migration was not executed. Real Auth/Storage/database verification remains a provisioning blocker.
- Existing manufacturer corrections, personal-label independence, null-sodium save/reopen, powder boundaries, grading-mode contracts and the CommonJS repair were checked without changing scoring.

API keys are copied from Supabase Settings → API Keys. Modern secret keys are sent only in the apikey header, never as a bearer JWT; owner access tokens are separate verified user JWTs. [Supabase API-key semantics](https://supabase.com/docs/guides/getting-started/api-keys)
