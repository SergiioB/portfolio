---
title: "Modernizing Android UX: High Refresh Rates & App Shortcuts"
description: "How to request 90Hz/120Hz rendering and implement static deep-linked app shortcuts to improve mobile application usability."
situation: "An Android application felt sluggish on modern flagship devices and lacked quick-access entry points for power users."
issue: "The app was locked to standard 60Hz rendering, causing sub-optimal scrolling experiences on devices capable of 90Hz or 120Hz. Additionally, users had to navigate through multiple screens to perform frequent actions."
solution: "Detected 90Hz+ display modes and configured window post-processing preferences for smoother rendering, then implemented static XML-based app shortcuts routed via deep links."
usedIn: "Used to modernize an Android mobile application built with Jetpack Compose."
impact: "Significantly improved perceived performance and fluidity, while reducing friction for core user journeys."
pubDate: 2026-02-26
category: "kotlin"
tags: ["android", "ux", "performance", "kotlin"]
draft: false
---

## Situation
As mobile hardware advances, user expectations for fluidity and accessibility increase. An Android application was functioning correctly but felt distinctly "last generation."

Two main issues were identified:
1.  **Scrolling felt jittery:** Despite running on modern flagship devices capable of 120Hz refresh rates, the app was rendering at the baseline 60Hz.
2.  **High friction for frequent tasks:** Power users wanting to quickly add a record or view a specific dashboard had to launch the app, wait for the home screen, and navigate the UI manually.

## Implementing High Refresh Rate Support

Historically, Android managed refresh rates strictly at the system level. However, newer APIs allow applications to request higher rendering priorities.

### The Technical Fix
To request 90Hz/120Hz support, a utility manager was created to configure refresh-rate-related window/display settings at Activity launch.

The implementation relies on Android 11+ (API 30+) / Android 12+ (API 31+) APIs:

```kotlin
// Example concept for enabling high refresh rate
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    // Detect the best supported display mode (90Hz+), and let the system choose it
    // (preferredDisplayModeId often requires system-level privileges in practice)
    val modes = activity.display?.supportedModes.orEmpty()
    val best = modes.filter { it.refreshRate >= 90f }.maxByOrNull { it.refreshRate }
    android.util.Log.d("RefreshRate", "Best available mode: ${best?.refreshRate}Hz")
}

// For Android 12+ (API 31+), configure post-processing preference
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    activity.window.attributes.preferMinimalPostProcessing = false
}
```

By configuring post-processing preference and ensuring window rendering is optimized (e.g., hardware acceleration), high refresh rate devices can render smoother Compose scrolling and animations when the system selects a 90Hz/120Hz mode.

## Implementing Static App Shortcuts

To solve the friction issue, Android's App Shortcuts feature was utilized. This allows users to long-press the application icon on their home screen to reveal a quick-action menu.

### XML Definition and Deep Links
Static shortcuts were defined in an XML resource file (`shortcuts.xml`), pointing to specific deep links rather than just launching an Activity.

```xml
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
    <shortcut
        android:shortcutId="add_record"
        android:enabled="true"
        android:icon="@drawable/ic_shortcut_add"
        android:shortcutShortLabel="@string/shortcut_add_record">
        <intent
            android:action="android.intent.action.VIEW"
            android:data="myapp://add-record" />
    </shortcut>
</shortcuts>
```

### Routing the Action
When a user taps the shortcut, the OS fires the intent with the associated deep link (`myapp://add-record`). The main Activity catches this intent and passes the URI directly into the application's navigation router (e.g., Jetpack Compose Navigation), immediately jumping the user exactly where they need to be.

This combination of rendering performance and rapid accessibility transformed the application from feeling like a basic utility to a premium, deeply integrated system citizen.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Modernizing Android UX: High Refresh Rates & App Shortcuts execution diagram](/portfolio/images/diagrams/post-framework/kotlin-mobile.svg)

This diagram supports **Modernizing Android UX: High Refresh Rates & App Shortcuts** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Improve perceived responsiveness and reduce tap-to-task friction.**

### Implementation decisions for this case
- Chose a staged approach centered on **android** to avoid high-blast-radius rollouts.
- Used **ux** checkpoints to make regressions observable before full rollout.
- Treated **performance** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
adb shell dumpsys SurfaceFlinger | findstr refresh
adb shell am start -a android.intent.action.VIEW -d "myapp://..."
adb shell dumpsys gfxinfo <package>
```

## Validation Matrix
| Validation goal | What to baseline | What confirms success |
|---|---|---|
| Functional stability | frame pacing, startup path, and interaction latency | critical user flows complete without navigation regressions |
| Operational safety | rollback ownership + change window | performance traces show smoother frame delivery |
| Production readiness | monitoring visibility and handoff notes | shortcut/deeplink paths remain deterministic across app states |

## Failure Modes and Mitigations
| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |
|---|---|---|
| Device-specific behavior | UX differs across OEM implementations | Test across at least one mid and one high-tier device |
| Navigation edge case | Deep links break when app state is partial | Normalize entry routing through a single handler |
| Performance regression | Small UI changes impact frame pacing | Track frame timing in CI/perf checks |

## Recruiter-Readable Impact Summary
- **Scope:** improve mobile UX without introducing lifecycle regressions.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

