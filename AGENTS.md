# BarrexSoft App Guidelines

Version: 2026-05-04  
Scope: new Android/Firebase/AI apps in this workspace  
Reference apps:

- `IntelliAuto`: vehicle/mechanic operations app.
- `IntelliFlow`: personal finance operations app.
- `IntelliNest`: home, pantry, meal, shopping, and home-task operations app.

This document defines the baseline structure, design language, security posture, AI integration style, Firebase layout, and engineering workflow that every new app should follow unless there is a strong product reason to diverge.

## 0. Portfolio Design Rules — sergiob.dev

These rules are mandatory for the Astro portfolio in this repository. Do not ship visual changes that violate them.

- Verify visual work with `npm run build`, local `astro preview`, and browser/vision inspection before pushing.
- Never inject duplicate sidebars or floating cards into page content. Layout ownership belongs to `BaseLayout.astro` and scoped page shells only.
- Preserve the dark terminal/executive aesthetic: `#0B1120`-class background, `var(--surface)` cards, thin borders, cyan/blue accents, high contrast text.
- Use real product assets when available. IntelliAuto and IntelliFlow cards must use real app icons from `public/images/apps/`, not placeholder monograms.
- Category/tag chips must use the existing category color tokens (`--category-*`) and be readable on dark surfaces.
- External product links must be checked before publishing. Current canonical links: `https://intelliauto.app` and `https://barrysoft-intelliflow.work`.
- The LLM Handbook must match the portfolio: strong technical hero, card-based chapter index, clean prose shell, no generic unstyled list pages.
- EN/ES switching must update visible homepage copy instantly without reload. Any new homepage copy needs `data-i18n` coverage.
- Do not commit generated previews, temporary screenshots, local caches, or build output. Keep `.gitignore` protecting transient artifacts; commit only source, content, and intentional public assets.

## 1. Product Standard

Every app should be an operations product, not a marketing shell or a thin AI wrapper.

A good BarrexSoft app has:

- A clear operational domain.
- Local-first user value even when AI or network fails.
- A deterministic source of truth.
- AI as a copilot for interpretation, generation, summarization, and recalculation.
- Firebase as the secure backend boundary.
- A polished Android-native UI that feels consistent with IntelliAuto, IntelliFlow, and IntelliNest.

The core loop must be explicit before implementation starts.

Examples:

- IntelliAuto: vehicle data -> maintenance/diagnosis -> reminders -> receipts -> history.
- IntelliFlow: transactions -> categorization -> insight -> budgets -> projections.
- IntelliNest: inventory -> meal plan -> cook/use stock -> recalculate -> shopping/home tasks.

For a new app, document:

```text
App name:
Domain:
Primary user:
Main pain:
Core loop:
Offline value:
AI value:
Paid/premium boundary:
Data sensitivity:
```

## 2. Naming and Branding

App names should fit the existing family:

- `IntelliAuto`
- `IntelliFlow`
- `IntelliNest`

Naming rules:

- Prefer `Intelli` + short concrete noun.
- Keep it English.
- Avoid generic broad names that collide with many apps.
- Prefer 2-4 syllables after `Intelli`.
- The second word should signal the domain.

Good patterns:

```text
IntelliNest
IntelliAuto
IntelliFlow
IntelliVault
IntelliRoute
IntelliCare
```

Avoid:

```text
IntelliManager
IntelliAssistant
IntelliLife
IntelliAI
IntelliPlanner
```

Reason: generic names are harder to brand, search, and protect.

## 3. Required Repository Structure

Each app should live in its own top-level folder:

```text
Syncthing/
  IntelliAuto/
  IntelliFlow/
  IntelliNest/
  IntelliNewApp/
```

Recommended structure:

```text
IntelliNewApp/
  AGENTS.md
  README.md
  IMPLEMENTATION_STATUS.md
  APP_SPEC.md
  firebase.json
  firestore.rules
  storage.rules
  .firebaserc

  docs/
    product-vision.md
    architecture.md
    firebase-setup-status.md
    ai-contracts.md
    deepseek-model-policy.md
    android-install.md
    release-checklist.md
    security.md

  android/
    app/
      build.gradle.kts
      google-services.json
      src/main/
        AndroidManifest.xml
        java/<package>/
        res/

  functions/
    package.json
    src/ or index.js
    lib/
    test/
```

For Kotlin/Android projects, prefer the IntelliNest structure:

```text
app/src/main/java/<package>/
  MainActivity.kt
  Intelli<App>NameApp.kt

  ui/
    app/
    auth/
    dashboard/
    theme/
    <feature>/

  core/
    model/
    result/
    util/

  data/
    local/
    remote/
    repository/
    sync/

  di/

  worker/
```

Feature modules should be organized by product domain, not by arbitrary UI tabs.

## 4. Mandatory Planning Documents

Every app must start with:

```text
AGENTS.md
README.md
IMPLEMENTATION_STATUS.md
docs/product-vision.md
docs/architecture.md
docs/ai-contracts.md
docs/firebase-setup-status.md
docs/security.md
```

`AGENTS.md` should explain:

- Product mission.
- Architecture rules.
- AI rules.
- Security rules.
- Testing rules.
- What must not be done.
- Current decisions and rationale.

`IMPLEMENTATION_STATUS.md` should be updated after every major pass:

- What was implemented.
- What was verified.
- What is deployed.
- What is intentionally deferred.
- What manual actions remain.

Do not let status docs lie. If Firebase, App Check, or AI is wired, say so. If it is fallback-only, say so.

## 5. Android Stack Standard

Default stack:

```text
Language: Kotlin
UI: Jetpack Compose
Architecture: MVVM/MVI + light Clean Architecture
DI: Hilt
Local DB: Room
Preferences: DataStore
Background work: WorkManager
Firebase: Auth, Firestore, Functions, Storage, App Check
AI: DeepSeek behind Cloud Functions
Serialization: kotlinx.serialization or explicit DTO mapping
Testing: JUnit + coroutine tests + focused repository/use-case tests
```

Do not choose Flutter, React Native, or a custom backend unless there is a concrete need.

Preferred flow:

```text
UI -> ViewModel -> UseCase/Repository -> Room/Firestore/Functions
```

Room remains the local source of truth. Firestore sync should not replace local state.

## 6. Android Package and App IDs

Use stable package names:

```text
com.barrysoft.intelliauto
com.intelliflow.finances
com.sergio.intellinest
```

For future apps, choose one convention and keep it stable:

```text
com.barrexsoft.<appname>
```

Recommended for new apps:

```text
com.barrexsoft.intellinewapp
```

Avoid changing package names after Firebase setup unless absolutely necessary.

## 7. UI/UX Design Language

The shared visual language is based on IntelliAuto and IntelliFlow, with IntelliNest now aligned:

- Dark premium base.
- Deep navy / midnight backgrounds.
- Cyan and blue primary accents.
- Sparse but high-contrast text.
- Glass-like panels for login/onboarding only.
- Dense but readable operational screens after login.
- Strong icon-based identity.
- Minimal decorative clutter.

Core palette:

```text
Deep background: #0B1120
Surface dark:    #111827 / #1E293B
Primary blue:    #2979FF
Cyan accent:     #00E5FF
Success green:   #00E676
Warning amber:   #FFB74D
Error red:       #FF5252
Text primary:    #FFFFFF
Text secondary:  white 70-75%
```

Login screen standard:

- Full-screen dark radial/linear background.
- App logo at top.
- Product name as main brand text.
- One short domain subtitle.
- Demo/local CTA before auth form where useful.
- Divider.
- Glass panel with:
  - Sign in / Register tabs.
  - Email field.
  - Password field.
  - Confirm password in register mode.
  - Password strength meter.
  - Terms checkbox in register mode.
  - Forgot password in sign-in mode.
  - Optional biometric login.
  - Primary action button.

The login should look recognizably related across apps. Only change:

- App icon.
- Product subtitle.
- CTA wording.
- Terms/privacy links.
- Domain-specific accent if needed.

Do not create a bland white Firebase login screen.

Operational app screens:

- Avoid huge marketing hero sections.
- Start with the actual workspace.
- Use bottom navigation only for primary destinations.
- Move secondary destinations into `More`.
- Avoid overflowing labels in bottom nav.
- Use cards only for repeated entities or interaction surfaces.
- Prefer full-width sections and compact rows.
- Keep text short, functional, and scannable.

## 8. App Icon Standard

Every app needs:

```text
res/drawable/ic_<app>_logo.xml
res/drawable/ic_launcher_foreground.xml
res/mipmap-anydpi-v26/ic_launcher.xml
res/mipmap-anydpi-v26/ic_launcher_round.xml
res/values/colors.xml
```

Manifest must include:

```xml
android:icon="@mipmap/ic_launcher"
android:roundIcon="@mipmap/ic_launcher_round"
```

Icon style:

- Vector or carefully generated raster.
- Dark circular/squircle base.
- Cyan/blue highlight.
- One domain symbol.
- No tiny text.
- Must work at launcher size.

Examples:

- IntelliAuto: vehicle/mechanic identity.
- IntelliFlow: finance/flow identity.
- IntelliNest: house/nest + inventory wave + leaf.

The same logo should be used in the login screen.

## 9. Authentication Standard

Baseline:

- Firebase Auth.
- Email/password at minimum.
- Password reset.
- Optional Google Sign-In if the app needs it.
- Optional anonymous/local demo mode when useful.
- Auth state observed as a flow/state.

Auth repository should expose:

```kotlin
val currentUser: Flow<AuthUser?>
suspend fun signIn(email: String, password: String)
suspend fun register(email: String, password: String)
suspend fun resetPassword(email: String)
fun signOut()
```

Do not call Firebase Auth directly from random ViewModels except in legacy code. Centralize it.

Auth UI should validate:

- Email format.
- Password length >= 8.
- Uppercase.
- Lowercase.
- Digit.
- Confirm password match.
- Terms acceptance on register.

Rate limiting:

- Track failed attempts in UI.
- After 3 failed attempts, pause for 60 seconds.
- Server-side Firebase Auth also handles abuse, but UI rate limiting improves UX.

## 10. Biometric Login Standard

Follow IntelliAuto pattern for biometric login:

- Store email/password only if user opts in.
- Use `EncryptedSharedPreferences`.
- Use `MasterKey` with `AES256_GCM`.
- Use AndroidX Biometric.
- Clear stored credentials when user disables biometric login.

Files:

```text
util/BiometricLoginStore.kt
```

Rules:

- Do not store credentials in plain SharedPreferences.
- Do not enable biometric by default.
- Do not block normal password login if biometric fails.
- Biometric login is convenience, not the source of truth.

## 11. Security Baseline

Every app should implement:

- Firebase Auth.
- Firestore rules scoped by `request.auth.uid`.
- Storage rules scoped by `request.auth.uid`.
- Secret Manager for all AI/API keys.
- Cloud Functions as the only path to external AI APIs.
- App Check initialized in Android.
- App Check enforced in production callable functions.
- Debug App Check provider for debug builds.
- Play Integrity provider for release builds.
- Input validation in UI and backend.
- Sanitization of text sent to AI.
- No secrets in Android code, Gradle, resources, or Git.

Firestore rules pattern:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Storage rules pattern:

```js
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Temporary debug exception:

- It is acceptable to set `enforceAppCheck: false` while testing an APK manually.
- The docs must explicitly say this is temporary.
- Before production, re-enable `enforceAppCheck: true`.

## 12. Firebase Project Standard

Each app must have a clear Firebase ownership/account note.

Current known apps:

```text
IntelliAuto
  Firebase project: intelliauto-vehicle-app
  Firebase account: BarrexSoft@proton.me

IntelliFlow
  Firebase project: finances-c1fc2
  Firebase account: xbarrex02@gmail.com

IntelliNest
  Firebase project: intellinest-homeops
  Firebase account: BarrexSoft@proton.me
```

Document this in:

```text
docs/firebase-setup-status.md
```

Every Firebase command should specify:

```powershell
--project <project-id> --account <account-email>
```

Never rely on whichever Firebase account is currently active.

## 13. Firebase Setup Checklist

For a new app:

1. Create Firebase project.
2. Add Android app with package name.
3. Download `google-services.json`.
4. Enable Auth.
5. Enable chosen providers.
6. Create Firestore database.
7. Create Storage bucket.
8. Add Firestore rules.
9. Add Storage rules.
10. Add Secret Manager secrets.
11. Deploy Functions.
12. Register debug SHA-1/SHA-256.
13. Regenerate `google-services.json`.
14. Add release SHA-1/SHA-256 before production.
15. Configure App Check:
    - Debug provider during development.
    - Play Integrity for release.

Debug SHA command:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
keytool -list -v -alias androiddebugkey -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -keypass android
```

Add SHA:

```powershell
firebase apps:android:sha:create <app-id> <sha-hash> --project <project-id> --account <account-email>
firebase apps:sdkconfig ANDROID <app-id> --project <project-id> --account <account-email> > android/app/google-services.json
```

After redirecting `google-services.json`, rewrite as UTF-8 without BOM if Gradle complains about malformed JSON.

## 14. AI Architecture Standard

AI must never be the database.

The source of truth is:

- Room locally.
- Firestore for sync/backup.
- Deterministic domain models.
- User-confirmed actions.

AI should:

- Parse ambiguous input.
- Generate suggestions.
- Recalculate plans.
- Summarize complex data.
- Classify text.
- Normalize OCR output.
- Return structured JSON.

AI should not:

- Invent state.
- Directly mutate Firestore.
- Bypass validation.
- Return free-form data that the app blindly trusts.

Required pattern:

```text
Android app
  -> Firebase callable function
  -> DeepSeek API
  -> backend schema validation
  -> deterministic mapping
  -> Room/Firestore
```

Every AI function should have:

- Input DTO.
- Output schema.
- Prompt version.
- Model version.
- Backend validation.
- Fallback behavior.
- Usage logging.
- Clear timeout.
- Max token limit.

## 15. DeepSeek Model Policy

Use:

```text
deepseek-v4-flash
```

Do not use:

```text
deepseek-chat
deepseek-reasoner
```

Reason:

- The older names are compatibility aliases.
- V4 Flash is the lowest-cost current V4 model.
- It supports JSON workflows.
- It is good enough for app-facing daily tasks.

Use V4 Pro only when:

- The task is high-value.
- The user explicitly requests deeper reasoning.
- The output can be cached or batched.
- The feature is premium or admin-only.

Current pricing guidance from DeepSeek docs:

```text
V4 Flash cache-hit input:  $0.0028 / 1M tokens
V4 Flash cache-miss input: $0.14   / 1M tokens
V4 Flash output:          $0.28   / 1M tokens

V4 Pro is materially more expensive, especially output tokens.
```

## 16. AI Cache Strategy

DeepSeek context caching is automatic but prefix-sensitive.

Structure messages like:

```text
system: stable product/model/policy prefix
system/user: stable schema and rules
user: variable user data
```

Do:

- Keep the first system message stable.
- Keep JSON schema ordering stable.
- Put dates, inventory, transactions, OCR text, user content later.
- Log usage fields:
  - `prompt_cache_hit_tokens`
  - `prompt_cache_miss_tokens`

Do not:

- Put request IDs in the first system message.
- Put current date in the first system message unless necessary.
- Randomize examples.
- Shuffle schema fields without reason.

Each app should include:

```text
docs/deepseek-model-policy.md
```

or in Functions:

```text
functions/DEEPSEEK_MODEL_POLICY.md
```

## 17. Cloud Functions Standard

Use Functions 2nd gen.

Preferred TypeScript for new apps:

```text
functions/
  src/
    index.ts
    ai/
      deepseekClient.ts
      schemas.ts
      prompts.ts
    callable/
      generateSomething.ts
      parseSomething.ts
    shared/
      errors.ts
      logging.ts
  test/
```

Legacy JS is acceptable in existing apps:

- IntelliAuto uses `functions/index.js`.
- IntelliFlow uses `functions/index.js` plus `functions/lib`.

Every callable should:

- Check `request.auth` unless intentionally public.
- Validate input.
- Sanitize text.
- Use Secret Manager.
- Limit max input size.
- Limit max output tokens.
- Handle provider errors.
- Return stable error codes.
- Log request ID and usage.

Recommended callable options:

```ts
onCall({
  region: "europe-west1",
  secrets: [DEEPSEEK_API_KEY],
  enforceAppCheck: true, // false only during debug APK testing
  timeoutSeconds: 60,
  memory: "256MiB",
  maxInstances: 20,
}, async (request) => { ... })
```

## 18. AI JSON Contract Standard

Prompts must demand JSON and provide schema.

Backend must parse and validate.

Use Zod in TypeScript:

```ts
const responseSchema = z.object({
  ok: z.boolean(),
  data: z.object({...}),
});
```

If model output is invalid:

1. Try extracting JSON object.
2. Retry once without JSON mode if empty output occurs.
3. Return fallback or structured error.
4. Do not crash the app.

Android must treat AI as unreliable:

- Remote call can fail.
- JSON can be incomplete.
- Backend can time out.
- Use local fallback where possible.

## 19. Local-First Data Standard

Room is the source of truth on-device.

Firestore is for:

- Backup.
- Sync.
- Multi-device state.
- Server-side triggers if needed.

Local-first pattern:

```text
User action -> update Room -> enqueue/push sync -> Firestore
Cloud pull -> validate -> merge/upsert Room
```

Do not block core UX on Firestore.

Every entity should eventually have:

```kotlin
id: String
createdAt: Instant/Long
updatedAt: Instant/Long
deletedAt: Instant/Long?
sourceDeviceId: String
syncState: enum
```

IntelliNest currently has manual push/pull by ID. Future apps should add conflict metadata earlier.

## 20. Firestore Sync Standard

Recommended Firestore layout:

```text
users/{uid}
  profile/current
  inventory/{itemId}
  records/{recordId}
  settings/current
  sync/meta
```

Avoid one giant `snapshot/current` document for anything that can grow. Firestore documents have size limits.

Manual sync is acceptable for MVP:

- `Push to Firestore`.
- `Import from Firestore`.

Production sync should add:

- WorkManager background sync.
- Conflict metadata.
- Tombstones for deletes.
- Backoff/retry.
- Sync status UI.

## 21. Storage Standard

Use Firebase Storage for:

- Photos.
- Receipts.
- Documents.
- Generated exports.

Path convention:

```text
users/{uid}/<domain>/<entityId>/<fileName>
```

Examples:

```text
users/{uid}/receipts/{receiptId}/original.jpg
users/{uid}/recipes/{recipeId}/cover.jpg
users/{uid}/vehicles/{vehicleId}/documents/inspection.pdf
```

Never upload user files to public paths.

## 22. OCR and Documents

For apps with receipts/documents:

Android:

- CameraX.
- ML Kit Document Scanner.
- ML Kit Text Recognition.
- Manual review screen.

Backend:

- Normalize OCR text with DeepSeek V4 Flash.
- Validate output.
- Store raw OCR and normalized data.

Rules:

- OCR is never fully trusted.
- Always provide review/confirm flow.
- Keep raw text for debugging.
- Redact sensitive data where possible.

## 23. Settings and Preferences

Use DataStore for:

- Theme mode.
- Onboarding completion.
- Locale.
- Default filters.
- Local feature flags.
- UI density/font settings.

Use Firestore for:

- User profile.
- Cross-device preferences.
- Premium entitlement.
- Cloud sync metadata.

Do not use plain SharedPreferences for sensitive data. Use encrypted prefs for biometric credentials or secrets that must remain local.

## 24. Release Signing Standard

New apps should include a release signing plan early.

Recommended:

- Debug builds use debug keystore.
- Release builds use environment variables or local Gradle properties.
- Do not commit keystores or passwords.

Document:

```text
docs/release-checklist.md
```

Include:

- Version code/name update.
- Release keystore SHA-1/SHA-256 in Firebase.
- Play App Signing SHA-1/SHA-256 if using Play.
- App Check Play Integrity verified.
- Crash/analytics settings.
- Proguard/R8 check.
- Backup/data extraction review.

## 25. Build and Test Commands

Every app must document working commands.

Android:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug --no-configuration-cache
```

Functions:

```powershell
cd functions
npm run build
npm test
```

Legacy JS Functions:

```powershell
node --check functions/index.js
npm run build
```

Deployment:

```powershell
firebase deploy --only functions --project <project-id> --account <account-email>
```

Never deploy without specifying project and account.

## 26. Documentation After Every Pass

After implementation, update:

```text
IMPLEMENTATION_STATUS.md
docs/firebase-setup-status.md
docs/android-install.md
docs/deepseek-model-policy.md
```

The final assistant/user summary should include:

- What changed.
- What compiled.
- What deployed.
- What is still manual.
- What is intentionally deferred.

## 27. Manual Action Checklist For Users

When handing off a debug APK, tell the user:

- APK path.
- How to install.
- Whether Firebase Auth is required.
- Whether App Check is enforced.
- Whether DeepSeek secret is configured.
- Whether SHA debug/release is registered.
- What to do manually.

Example:

```text
APK:
android/app/build/outputs/apk/debug/app-debug.apk

Manual:
1. Install APK.
2. Login/register.
3. Test feature X.
4. If App Check is enforced, register debug token from Logcat.
5. For release, register release SHA-1/SHA-256.
```

## 28. App-Specific Reference Notes

### IntelliAuto

Use as reference for:

- Premium dark/cyan login.
- Biometric credential storage.
- Vehicle-focused AI proxy.
- OCR receipt parsing.
- Mechanic assistant style.
- Firebase account discipline with `BarrexSoft@proton.me`.

Important patterns:

- `BiometricLoginStore`.
- `SecurityUtils`.
- DeepSeek behind Functions.
- Usage logging.
- Premium/entitlement boundaries.

### IntelliFlow

Use as reference for:

- Finance-grade security.
- App Check initialization.
- Auth-gated AI proxy.
- Structured AI financial analysis.
- Prompting library separation.
- Usage/quota ledger.
- Firebase account discipline with `xbarrex02@gmail.com`.

Important patterns:

- `MainApplication.initializeAppCheckLazy`.
- `lib/ai/provider.js`.
- `lib/ai/prompting.js`.
- `usageLedger`.
- `entitlements`.

### IntelliNest

Use as reference for:

- New clean Kotlin/Compose/Room/Hilt structure.
- Intelli-family aligned login screen.
- App icon wiring.
- Manual Firestore push/pull MVP.
- DeepSeek V4 Flash TypeScript backend.
- Local deterministic fallback when AI fails.

Important patterns:

- `AuthRepository`.
- `CloudSyncRepository`.
- `IntelliNestRepository`.
- `functions/src/ai/deepseekClient.ts`.
- `docs/deepseek-model-policy.md`.

## 29. Common Mistakes To Avoid

Do not:

- Put API keys in Android.
- Trust AI output without validation.
- Make the first screen a marketing landing page instead of app workflow.
- Overload bottom navigation.
- Use giant Firestore documents for growing data.
- Skip manual review for OCR.
- Deploy with the wrong Firebase account.
- Leave App Check disabled without documenting it.
- Use deprecated DeepSeek aliases.
- Build a beautiful login and ugly internal screens.
- Let docs drift from reality.

## 30. Definition Of Done

A new app MVP is not done until:

- Android compiles.
- Unit tests pass.
- Firebase project exists.
- Auth works.
- Firestore rules deployed.
- Storage rules deployed if Storage is used.
- Functions deployed if AI/backend is used.
- DeepSeek key is in Secret Manager.
- App icon is wired.
- Login follows Intelli-family design.
- Local fallback exists for core workflow.
- `IMPLEMENTATION_STATUS.md` is current.
- Manual user steps are clear.

Production is not done until:

- Release signing configured.
- Release SHA registered.
- App Check enforced.
- Play Integrity verified.
- Firestore sync conflict handling exists.
- Crash/analytics policy is decided.
- Privacy/terms are published if external users will use it.
- Cost monitoring is in place for AI calls.

## 31. Recommended New App Bootstrap Sequence

1. Create folder.
2. Create `AGENTS.md`.
3. Create product docs.
4. Scaffold Android app.
5. Add theme, icon, login.
6. Add Room models for source of truth.
7. Add local MVP workflow.
8. Add Firebase project.
9. Add Auth.
10. Add Firestore/Storage rules.
11. Add Functions.
12. Add DeepSeek V4 Flash proxy.
13. Add local fallback.
14. Add manual Firestore sync.
15. Add docs.
16. Build/test.
17. Deploy.
18. Install APK.
19. Iterate UI and domain logic.
20. Only then add advanced AI/OCR/premium.

This order avoids building an impressive backend around a weak app workflow.


## 32. Git Server (Rock 5B via Tailscale)
**Server:** radxa@REDACTED
**Path:** ~/Git-Server/<repo-name>.git
**Auth:** SSH key (already configured on all devices)
**SSH URL format:** radxa@REDACTED:Git-Server/<repo-name>.git

### Creating a new repo
`ash
ssh radxa@REDACTED "git-create-repo my-new-project"
``n
### For an existing local project
`ash
git remote add origin radxa@REDACTED:Git-Server/<repo-name>.git
git push -u origin main
``n
### For a new local project
`ash
mkdir <name> && cd <name>
git init
git remote add origin radxa@REDACTED:Git-Server/<name>.git
echo '# <name>' > README.md && git add . && git commit -m "init"
git push -u origin main
``n
## 33. Git Identity
Name: SergiioB
Email: sergiobarrientose@outlook.com

**CRITICAL RULE:** NEVER commit as anyone else. Ensure git config user.name "SergiioB" and git config user.email "sergiobarrientose@outlook.com" are set before committing.

## 34. Git Ignores
**CRITICAL RULE:** NEVER commit .agentic/, .claude/, .zed/, AGENTS.md or other AI tool artifacts. Ensure these are added to .gitignore.

## 35. Amazon Affiliate CTA Buttons

### How it works

Blog posts with an `amazonUrl` frontmatter field show an orange "Buy on Amazon" CTA button automatically. The button renders at two positions:
- **Top**: right after Case Snapshot, before article content (`.amazon-cta-top`)
- **Bottom**: after article content, with FTC disclosure text (`.amazon-cta`)

### Adding the CTA to a post

In the post frontmatter:

```yaml
amazonUrl: https://go.sergiiob.dev/<path>
```

Only posts with `amazonUrl` show buttons. Posts without it are unaffected.

### Code locations

- Template: `src/pages/posts/[...slug].astro` (search for `amazonUrl`)
- Schema: `src/content/config.ts` (`amazonUrl: z.string().optional()`)
- Styles: `src/styles/global.css` (search for `.amazon-cta`)

### Cloudflare Worker: go.sergiiob.dev

All affiliate redirects run through a Cloudflare Worker (`amazon-redirects`) bound to `go.sergiiob.dev`.

**Architecture:**
- `go.sergiiob.dev` → Cloudflare Worker (proxied custom domain)
- `sergiiob.dev` → GitHub Pages (DNS only, no Cloudflare proxy)

**Worker details:**
- Account ID: see `~/.config/cloudflare/sergiiob-token`
- Script name: `amazon-redirects`
- Token: `~/.config/cloudflare/sergiiob-token`

**Current redirect paths:**
- `/arc-pro` → Amazon ES (barrysoft01-21, default)
- `/arc-pro-es` → Amazon ES (barrysoft01-21)
- `/arc-pro-us` → Amazon US (barrysoft-20)
- `/arc-pro-uk` → Amazon UK (barrysoft00-21)
- `/arc-pro-de` → Amazon DE (barrysoft0b-21)
- `/arc-pro-fr` → Amazon FR (barrysoft060-21)
- `/arc-pro-it` → Amazon IT (barrysoft05-21)

### Adding a new affiliate product

1. **Update the worker** with new path(s):

```bash
TOKEN=$(cat ~/.config/cloudflare/sergiiob-token | tr -d '[:space:]')
ACCOUNT_ID="fbde40c9c719e355f0e4a744b288a3a1"

# Write new worker code to /tmp/<name>.mjs with the updated REDIRECTS map, then:
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/amazon-redirects" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'amazon-redirects=@/tmp/amazon-redirects.mjs;type=application/javascript+module' \
  -F 'metadata={"main_module":"amazon-redirects.mjs"};type=application/json'
```

2. **Verify the redirect:**

```bash
curl -sI "https://go.sergiiob.dev/<new-path>" | grep -iE "^(HTTP|location)"
```

3. **Add to post frontmatter:**

```yaml
amazonUrl: https://go.sergiiob.dev/<new-path>
```

4. **Verify after deploy** that the button renders on the live post.

### Amazon Associates tags by region

| Region | Tag |
|--------|-----|
| ES (Spain) | barrysoft01-21 |
| US | barrysoft-20 |
| UK | barrysoft00-21 |
| DE (Germany) | barrysoft0b-21 |
| FR (France) | barrysoft060-21 |
| IT (Italy) | barrysoft05-21 |

### Rules

- NEVER put affiliate tags in the public repo. Always use `go.sergiiob.dev/<path>` redirects.
- ALWAYS include `rel="nofollow sponsored noopener"` on affiliate links.
- ALWAYS include the FTC disclosure text ("As an Amazon Associate I earn from qualifying purchases.") where the bottom CTA appears.
