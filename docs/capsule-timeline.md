# Time Capsule cards and return navigation

This change addresses two separate Timeline problems: focused capsule cards losing their lower content, and returning from a capsule losing the originating Timeline position.

## Clipping and card layout

The production baseline at commit `587545e`, measured in Chromium at 390×844 with Haunted Forest and standard motion, had a 315px natural capsule visual scaled to 409.5px at maximum focus. The visual extended **78.5px** below the Timeline viewport; the **View Time Capsule** action's bottom extended **62.9px** below it and the action was entirely hidden. The overflowing content was not reachable by vertical scrolling inside the Timeline. Sealed, ready, and opened cards had the same problem.

`TimeCapsuleTimelineCard` places a 72px vault thumbnail beside the type and status. It retains the existing title and label sizes, full opening date, visible View action, and the whole-card interaction target. Long names and dates wrap without truncation. Detail vault artwork and ceremony presentation are unchanged.

Haunted Forest keeps its outline around the focused capsule visual. Its separate outer-slot highlight is suppressed for capsules, avoiding an empty outlined rectangle below short cards; Memory highlights remain unchanged.

The capsule button anchors its visual at the top. Because CSS transforms do not reserve layout height, it measures the natural visual and reserves its maximum focused height plus room for the focus outline. A ResizeObserver, window resize handling, and image-load measurement account for wrapping and layout changes. Reduced motion reserves the unscaled height. Ordinary cards retain the existing 310px minimum slot; longer capsule cards can grow that slot. Shared scenery dimensions, horizontal focus containment, and Memory card geometry remain unchanged.

## Returning to the source card

Opening a capsule from its Timeline card captures the source ID, nearby item order, document scroll axes, Timeline scroll axes, relative card position, Past/Present mode, search, category, and favorite filter. Home remains mounted and inactive during this visit.

**Back to Timeline** and browser history use that visit's context. Restoration waits for usable layout, restores filters and position, then returns keyboard focus to the source card without scrolling it again. If the source disappeared, the nearest surviving item provides a fallback. A bounded settling period accommodates image/font layout changes and stops when the user interacts or the view becomes obsolete.

Context belongs to the originating visit and is consumed after return. Opening Time Capsules through its module or a reminder starts a fresh visit without inheriting an earlier card position. These changes do not alter capsule privacy, recording, ceremony, persistence, or backup formats. Timeline previews continue to exclude private text and attachment metadata/playback.

The existing search/category/favorite filters show Memory results only and hide capsule cards. That behavior is preserved. Return context records these controls and Past/Present mode, with a nearby-item fallback when the source is unavailable. Repeated Back clicks enqueue only one history traversal.

## Pending physical iPhone checks

Run these in Safari and the installed PWA, recording the iOS version. These are manual checks to complete, not validation results.

- In Haunted Forest, focus sealed, ready, and opened cards with ordinary and long names. Verify full artwork, wrapped opening dates, status, and View action in standard and reduced motion.
- Open a card after horizontal Timeline scrolling and vertical page scrolling. Return with Back to Timeline and browser Back; check the same card, page position, and Past/Present mode. Repeat with browser Forward. Apply and clear Memory filters, then verify a new capsule visit restores its own position.
- Enter through the Time Capsules module afterward and confirm it does not restore a stale card visit.
- Check portrait/landscape layouts and neighboring Memory cards. Use VoiceOver and, where available, a hardware keyboard to activate the card and verify return focus.

## Automated validation on September 12, 2026

Affected service/component and App regressions passed serially without watch mode using a 4 GB heap. Coverage includes all three public card states, wrapped-content height reservation, reduced motion, return context and nearby fallback, layout settling and cancellation, Home auto-scroll suppression, browser history, repeated Back, direct module/reminder entry, existing Memory navigation, Settings/legal navigation, and recorder App flows. The older capsule navigation assertions now await visible Home after asynchronous history traversal.

The production build passed with a 6 GB heap. Existing dependency source-map, Node deprecation, and bundle-size warnings remain. Validation logs and browser artifacts are stored locally in the ignored `artifacts/capsule-timeline-20260912` directory.

Chromium passed all seven themes at 390×844 and 1440×1000: 42 sealed/ready/opened state checks plus short-title checks in Haunted Forest. Artwork, full names, wrapped dates, status, and the View action stayed within Life Current, with no document horizontal overflow. The capsule remains one large native button; the View label activates that same target. Center and corner hit tests verified a usable 44×44px square around the action in every theme at both sizes. Mobile and desktop screenshots were inspected, including the corrected short-card outline.

Every theme/size return measured zero horizontal and vertical drift. In Haunted Forest, mobile returned to page Y=1069 and Life Current X=2028; desktop returned to Y=393 and X=2032. Both also passed Past mode, archive-to-other-capsule navigation, browser Back and Forward, focus restoration, ordinary Memory navigation, source deletion with a nearby Memory fallback, fresh module entry, and filter clearing before a new capsule visit. A real Memory image released after restoration caused no later scroll movement.

The preserved audio recorder passed a fresh Chromium synthetic-microphone check after these journeys: record, stop, play the preview without autoplay, and Keep the same persisted media reference. Existing recorder App regressions also passed. The full recorder implementation and earlier validation remain documented in [capsule-audio-recording.md](capsule-audio-recording.md).

Windows WebKit also passed Haunted Forest at both viewport sizes: all three states and short titles, 44×44px action hit areas, the corrected focused-card outline, zero-drift return, and the navigation cases above. This desktop WebKit port does not establish physical iPhone Safari/PWA behavior. Its recorder capability limitation from the earlier recorder task remains unchanged; microphone and lock-screen checks still require a physical device.
