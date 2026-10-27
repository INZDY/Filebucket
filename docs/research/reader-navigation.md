# Reader navigation research: manga/comic paging, chrome, and carousel libraries

Research notes. Sources are primary (official docs, source files, npm registry, W3C/MDN). Nothing here is an
ADR; it is background for future reader work. Scope requested: (A) how established manga/comic readers handle
navigation and chrome, (B) whether Swiper.js fits a React/Next reader and what the alternatives are.

## What this means for our reader

Our reader is a hand-built overlay, not a library: `components/manga-reader.tsx` (layout modes `webtoon` /
`paged-ltr` / `paged-rtl`, zoom via CSS `transform: scale`, tap zones <30% / >70% / center, arrow keys,
next/prev prefetch, `IntersectionObserver` lazy load in webtoon) and `components/reader-shared.tsx`
(`useReaderOverlay`, `useReaderSwipe`, header/footer opacity toggle, `Escape` to close). It already matches
the established conventions for reading direction (LTR/RTL), tap-to-turn, and swipe-to-turn.

What it does **not** have, versus the readers below:

- **No page-jump affordance.** Only a non-interactive progress bar plus a "Page X of Y · filename" label
  (`ReaderFooter`). Doujins and long chapters need a scrub slider (Mihon, Kavita) and/or a go-to-page input
  (Kavita) and/or a thumbnail explorer (Komga).
- **Chrome toggles only by center tap.** No scroll-based auto-hide (Mihon has a "sensitivity for hiding menu
  on scroll" setting), no keyboard toggle (Komga `m`), and the footer is hidden entirely in webtoon mode.
- **Zoom is cosmetic, not navigable.** The image is `pointer-events-none` and the page is a CSS `scale`, which
  does not grow the scroll area, so a zoomed "Original" page cannot be panned. Established readers treat
  "page too large" as pan + fit + split (Mihon "Pan wide images", Kavita hand tool / image splitting).
- **No double-page spreads** and no page-grouping rules (Komga/Kavita define them explicitly).
- **Accessibility gaps**: no `role="region"`/`aria-roledescription`, no live-region page announcement, the
  progress bar is not a real `role="slider"`, and the zoom buttons (`ZoomIn`/`ZoomOut`) carry no `aria-label`.

**Recommendation.** Extend the existing component instead of adopting a carousel library. The features we are
missing (jump slider, thumbnails, pan, spreads, auto-hide, ARIA) are exactly the parts general-purpose
carousels either don't provide (zoom/pan, per-page virtualization for variable-height webtoon images) or fight
with (Swiper's zoom module vs. its own swipe paging; SSR friction in Next App Router; `sideEffects: true`).
Swiper is the closest fit if we ever want batteries-included paging + thumbs quickly, but it would be a rewrite
of working gesture/keyboard/RTL code, not an addition. See [§B](#b-is-swiperjs-a-good-fit) for the comparison.

---

## A. How established readers do it

### A1. Page-jump affordances (slider / input / thumbnails)

| Reader | Affordance | What it is good for |
| --- | --- | --- |
| Mihon | Chapter navigator slider; a **vertical** variant was added for long-strip mode ([v0.20.0 changelog](https://mihon.app/changelogs/v0.20.0)); height is configurable ([v0.20.1](https://mihon.app/changelogs/v0.20.1)) | Coarse scrub across a chapter without leaving the page |
| Kavita | Progress bar: **drag to find a page, click to jump**; on PC `G` opens a jump-to-page modal; the book reader prompt is literally *"There are {{totalPages}} pages. Which page would you like to go to?"* ([comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/), [source model](https://github.com/Kareadita/Kavita/blob/develop/UI/Web/src/app/_models/preferences/reading-profiles.ts)) | Exact page number (slider + input) |
| Komga | **Thumbnails explorer**: "an overview of all the pages in the book, and to quickly navigate to a particular page" ([DIVINA webreader](https://komga.org/docs/guides/webreader-divina/)) | Visual landing, covers, spreads; expensive for very long chapters because it renders many images |
| Reader chrome | Mihon also shows the current page number as a display option ("Show page number") and briefly overlays the tap zones on open ([reader settings](https://mihon.app/docs/guides/reader-settings)) | Orientation feedback |

Takeaway: slider = continuous scrub, input = exact target, thumbnails = visual and chapter-scale. Large
chapters favour the slider + input; thumbnails should be lazy (see A6/our `IntersectionObserver`).

### A2. Hiding / revealing chrome

- **Mihon**: tapping the centre of the page opens the menu (gear, viewer per series). Settings include
  "Show reading mode", "Show tap zones overlay", "Animate page transitions", and for long strip a
  "Sensitivity for hiding menu on scroll" (Highest/High/Low/Lowest). Tap-zone presets are
  Default / L-shaped / Kindle-ish / Edge / Right and Left / Disabled, with an "Invert tap zones" option
  ([reader settings](https://mihon.app/docs/guides/reader-settings)).
- **Kavita**: "Immersive mode hides [chrome] behind click on reader, combines with tap-to-paginate"; there is
  also an "Auto Close Menu — close the menu automatically after a timeout without interaction"
  ([comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/)).
- **Komga**: toolbars toggle with `m`, settings with `s`, thumbnails with `t`, help with `h`, fullscreen with
  `f` ([bookreader shortcuts source](https://github.com/gotson/komga/blob/master/komga-webui/src/functions/shortcuts/bookreader.ts)).

Pattern: centre/long tap toggles chrome; long-strip gets scroll-based auto-hide with a sensitivity control.

### A3. Continuous-scroll vs paged modes

- **Mihon**: Paged (right to left), Paged (left to right), Paged (vertical), Long strip, Long strip with gaps
  ([reader settings](https://mihon.app/docs/guides/reader-settings)).
- **Komga**: Left to right, Right to left, Vertical, and Webtoon ("displays all the pages in a continuous
  vertical strip") ([DIVINA webreader](https://komga.org/docs/guides/webreader-divina/)).
- **Kavita**: reading modes `left-to-right`, `up-to-down`, `webtoon`; pagination areas "Right is forward, Left
  is backwards / Down is forward, Up is backwards / Infinite Scroll/Webtoon mode"
  ([comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/)).
- **Suwayomi / Tachidesk**: Single/Double Page, Continuous Vertical/Horizontal, Webtoon; page scale modes;
  auto-scrolling; infinite chapter scrolling ([WebUI README](https://github.com/Suwayomi/Tachidesk-WebUI/blob/master/README.md)),
  and the continuous horizontal reader was split into explicit `ContinuesHorizontalLTR/RTL`
  ([Tachidesk-Server PR #110](https://github.com/Suwayomi/Tachidesk-Server/pull/110)).

Pattern: paged is the default for traditional manga (RTL); webtoon/long-strip is a first-class alternative,
often auto-selected per series.

### A4. Reading direction (RTL)

- **Mihon**: default is **Paged (right to left)** — "Swipe right for next page, swipe left for previous page";
  the viewer can be overridden per series ([reader settings](https://mihon.app/docs/guides/reader-settings)).
- **Komga**: the webreader "will automatically use the *Reading direction* specified in the Book metadata";
  shortcuts `l` LTR, `r` RTL, `v` vertical, `w` webtoon ([DIVINA webreader](https://komga.org/docs/guides/webreader-divina/),
  [shortcuts source](https://github.com/gotson/komga/blob/master/komga-webui/src/functions/shortcuts/bookreader.ts)).
- **Kavita**: `ReadingDirection` is `LeftToRight | RightToLeft`; tap-zone forward/back flips with it; the source
  model lists both (`reading-directions`) ([reading-profiles.ts](https://github.com/Kareadita/Kavita/blob/develop/UI/Web/src/app/_models/preferences/reading-profiles.ts)),
  and the paginator swaps direction in code (`handleReaderClick` → `readingDirection === LeftToRight ? FORWARD : BACKWARDS`).

Our reader already mirrors tap zones and swipe for `paged-rtl` in `manga-reader.tsx` / `useReaderSwipe`, which
matches this convention.

### A5. Double-page spreads

- **Komga** (paged reader): "display two pages on the same screen, like an open book", with two hard rules —
  **first and last page are always shown single**, and **a landscape page (width > height) is shown single**.
  It requires page dimensions, so books analyzed before v0.51.0 must be re-analyzed
  ([DIVINA webreader](https://komga.org/docs/guides/webreader-divina/), [libraries/analyze page dimensions](https://komga.org/docs/guides/libraries/)).
- **Kavita**: layout modes **Single / Double / Double (Manga)** ("2 images side by side, oriented around
  Manga's reading style"); plus "**Double Page Offset** — Offset page by 1 for Double Spread reading of
  Chapters (no cover image)", "**Emulate Comic Book**" spine shadow, and "**Image Splitting**" for stitched
  double-page scans ([comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/)).
- **Mihon**: dual-page is deliberately absent, with a documented rationale — "Creating an effective dual-page
  reader that accommodates scanlator page inconsistencies and other complexities poses challenges"
  ([reader FAQ](https://mihon.app/docs/faq/reader)).

Takeaway: spreads need per-page width/height, a first/last-single rule, a landscape-single rule, and a
cover/offset toggle. That is real data and real logic, not a CSS toggle.

### A6. Zoom / pan when a page is too large

- **Mihon**: Scale type (Fit screen / Stretch / Fit width / Fit height / Original size / Smart fit), "Zoom
  start position" (Automatic/Left/Right/Center), "Automatically zoom into wide images", "**Pan wide images**",
  "Split wide pages", "Rotate wide pages to fit", and double-tap zoom with a configurable animation speed
  ([reader settings](https://mihon.app/docs/guides/reader-settings)).
- **Kavita**: Image Scaling (Height / Width / Original), Image Splitting (Fit to Screen / Right to Left /
  Left to Right / No Split), Width Override; note "When in fullscreen you cannot zoom"
  ([comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/)).
- **Komga**: Scale type Fit to screen / Fit to width / Fit to height / Original
  ([DIVINA webreader](https://komga.org/docs/guides/webreader-divina/)).

Takeaway: every reader handles "too large" with **fit modes + pan + split**, implemented on top of native
scrolling/gestures, not with a separate zoom library. Our current CSS `scale` on a `pointer-events-none` `<img>`
inside `overflow-auto` cannot pan, because `transform` does not affect layout size.

### A7. Accessibility & keyboard patterns

- **Kavita**: a documented "Shortcut Keys" button for PC, `G` for go-to-page, and tap-to-paginate described as
  "Click on the edges of the screen to paginate" ([comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/)).
- **Komga**: a **context-aware help dialog** that "will only show shortcuts that are relevant to the current
  reading mode"; keyboard support for reading direction, scale cycling, fullscreen, and show/hide
  toolbars/settings/thumbnails/help/close ([DIVINA webreader](https://komga.org/docs/guides/webreader-divina/),
  [shortcuts source](https://github.com/gotson/komga/blob/master/komga-webui/src/functions/shortcuts/bookreader.ts));
  book navigation uses `pageUp`/`arrowUp` at the beginning and `pageDown`/`arrowDown`/`Space` at the end
  ([commit ac3d969](https://github.com/gotson/komga/commit/ac3d969a0f79bc1888be8d356caf364dd1e568cb)); setting
  shortcuts were requested and shipped via [issue #172](https://github.com/gotson/komga/issues/172).
- **Mihon**: volume keys turn pages (with an invert option) and an E-ink "Flash on page change" option
  ([reader settings](https://mihon.app/docs/guides/reader-settings)).

Web reference: the [W3C WAI-ARIA APG Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
defines what a web reader should expose — container `role="region"`/`group` with
`aria-roledescription="carousel"`, each slide `role="group"` with `aria-roledescription="slide"` and an
accessible name ("3 of 10"), native `<button>` prev/next/picker controls, and `aria-live="polite"` on the slide
wrapper when not auto-rotating. `Tab`/`Shift+Tab` move focus through the interactive elements; activating
prev/next must not move focus. None of the native readers above expose this, but it is the pattern a
Next.js reader should target.

---

## B. Is Swiper.js a good fit?

### B1. Package facts

| | Swiper | Embla (react) | react-zoom-pan-pinch | react-pdf | PhotoSwipe |
| --- | --- | --- | --- | --- | --- |
| npm version | `swiper@14.3.0` | `embla-carousel-react@8.6.0` | `react-zoom-pan-pinch@4.2.0` | `react-pdf@11.0.0` | `photoswipe@5.4.4` |
| License | MIT | MIT | MIT | MIT | MIT |
| Runtime deps | 0 | 2 (`embla-carousel`, `-reactive-utils`) | 0 | 9 (incl. `pdfjs-dist`) | 0 |
| React peer | none declared | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19` | `*` | `^19.0.0` | n/a (vanilla) |
| Maintained | pushed 2026-10-06, 41.9k★ | pushed 2026-10-12, 8.4k★ | pushed 2026-10-12, ~2.0k★ | pushed 2026-10-07, 11.2k★ | pushed 2025-12-04, 25k★ |
| Min/gzip (entry) | 66.1 KB / 20.2 KB¹ | 18.0 KB / 7.3 KB | 51.7 KB / 15.5 KB | 689.8 KB / 196.8 KB¹ | 59.1 KB / 17.0 KB |
| `sideEffects` | `true` (limits tree-shaking) | `false` | `true` | `["*.css"]` | `true` |

¹ Bundlephobia entry measurement; treat as approximate. Versions/licences/deps/peers read from the npm registry
(`https://registry.npmjs.org/<pkg>/latest`); stars/`pushed_at`/`sideEffects` from the GitHub API and package
metadata. Raw minified file sizes served by jsDelivr: Swiper core module ≈ 67.5 KB min, `swiper-react.min.mjs`
≈ 6.9 KB, bundle CSS ≈ 14.6 KB, core CSS ≈ 4.4 KB; Swiper modules min: Zoom ≈ 12.8 KB, A11y ≈ 7.2 KB, Virtual
≈ 5.5 KB, Thumbs ≈ 3.6 KB, Keyboard ≈ 2.0 KB; Embla core ESM ≈ 48 KB raw, React binding ≈ 1.4 KB.

Swiper is modular: install `swiper` once, then import only `swiper/react` and the modules you use —
`Zoom`, `Thumbs`, `Keyboard`, `A11y`, `Virtual`, `Navigation`, `Pagination`, `FreeMode`
([Swiper React docs](https://swiperjs.com/react)). `sideEffects: true` means bundlers are conservative about
dropping unused code, but the per-module entry points keep an unused module out of the graph.

### B2. React / Next.js integration constraints

- **No `"use client"` directive.** `swiper-react.mjs` imports `react` hooks/`createContext` with no `"use client"`
  banner (verified in the published file), and the package exposes no `"use client"` export condition. In the
  Next.js App Router the React entry must therefore be imported from a module that is itself a client component;
  the RSC boundary error is the long-standing symptom users report
  ([swiper discussion #7165](https://github.com/nolimits4web/swiper/discussions/7165),
  [issue #7689](https://github.com/nolimits4web/swiper/issues/7689),
  [next.js discussion #43755](https://github.com/vercel/next.js/discussions/43755)).
- **SSR renders every slide, then hydrates.** There is no viewport virtualization on the server; slides render
  stacked until Swiper initialises on the client, causing the well-known full-width jump/flicker. `width`/`height`
  params exist specifically for "SSR and Test environments for correct Swiper initialization"
  ([Swiper API](https://swiperjs.com/swiper-api)). The workaround is a mount guard + `dynamic(..., { ssr: false })`
  ([discussion #7578](https://github.com/nolimits4web/swiper/discussions/7578)).
- **React 19**: no peer gate, and 14.x explicitly fixed React 19 in the element wrapper ("keep element class
  fields type-only so `init="false"` works in Vue/React 19") ([CHANGELOG](https://github.com/nolimits4web/swiper/blob/master/CHANGELOG.md)).
- **Slides are real DOM.** Each `SwiperSlide` is an element; `Virtual` recycles a fixed pool and, in React,
  requires `virtual: true` + a `virtualIndex` per slide, with content supplied by the app
  ([Swiper React docs](https://swiperjs.com/react)). It is designed for a large number of **same-sized** slides.
  Manga webtoon pages are variable height, so the virtual module does not remove the need for our
  `IntersectionObserver` sizing/lazy strategy.
- **Zoom vs. paging.** `zoom` is a module that owns pinch/double-tap gestures and sets its own container
  transitions; page-swiping and zooming compete for the same pointer events, so real readers normally zoom with
  a separate pan/zoom layer (see B3) or restrict zoom to a non-swipe element.
- **RTL, keyboard, thumbs, a11y are built in**: `direction: 'horizontal' | 'vertical'` plus
  `rtl` / `changeLanguageDirection('rtl')` for RTL ([Swiper API](https://swiperjs.com/swiper-api)); the
  `Keyboard` module handles arrow-key paging; the `Thumbs` module syncs a second Swiper to the main one;
  the `A11y` module injects labels/live-region (`a11y: { prevSlideMessage, nextSlideMessage, ... }`), and
  v14.3.0 fixed `Tab` escaping a looping carousel ([CHANGELOG](https://github.com/nolimits4web/swiper/blob/master/CHANGELOG.md)).
  RTL still needs the content marked `dir="rtl"` and slides laid out accordingly.

### B3. Alternatives compared

- **Embla Carousel** (`embla-carousel-react@8.6.0`, MIT, 7.3 KB gzip, `sideEffects: false`). Headless: it ships
  the scroll physics only. Accessibility is **opt-in** via `embla-carousel-accessibility` (`carouselRole`
  defaults to `region`, `slideRole` to `group`, optional `announceChanges` live region, `setupPrevAndNextButtons`
  / `setupDotButtons` / `setupLiveRegion`) ([Accessibility plugin](https://www.embla-carousel.com/docs/plugins/accessibility)).
  RTL is `direction: 'rtl'` **and** the HTML `dir="rtl"` attribute ([Options](https://www.embla-carousel.com/docs/api/options)).
  Keyboard navigation is not built in — you drive the API from your own buttons
  ([Embla accessibility guidance](https://embla-carousel.superdocs.cloud/accessibility-706c5632)). There is an
  SSR plugin (`embla-carousel-ssr`) that emits percentage-width styles to avoid hydration layout shift, but it
  requires percentage slide widths and the padding method for gaps ([SSR guide](https://www.embla-carousel.com/docs/guides/server-side-rendering)).
  No zoom and no virtualization module. React 19 is an explicit peer.
- **react-zoom-pan-pinch** (`4.2.0`, MIT, 15.5 KB gzip, 0 deps). A focused `TransformWrapper` /
  `TransformComponent` with `useControls()` (`zoomIn`/`zoomOut`/`resetTransform`), wheel/pinch/drag and mobile
  gestures ([repo README](https://github.com/BetterTyped/react-zoom-pan-pinch)). It solves only the "page too
  large" problem; it has no paging, RTL, keyboard, or a11y. Pairs cleanly with Embla or a no-library pager.
- **react-pdf** (`11.0.0`, MIT, React 19 peer, 196.8 KB gzip). Wraps `pdfjs-dist` (which this repo already
  depends on via `pdfjs-dist@^6.2.108`) to render `<Document>/<Page>/<Thumbnail>/<Outline>`, with text/annotation
  layers and a `Thumbnail` component for a page picker ([repo README](https://github.com/wojtekmaj/react-pdf)).
  It is for **PDF only**, needs SSR skipped and a configured PDF.js worker, and is unrelated to image chapters —
  relevant to us only as the existing PDF path, not as a manga carousel.
- **PhotoSwipe** (`5.4.4`, MIT, 17.0 KB gzip, 0 deps). A lightbox gallery with its own UI, deep zoom, gestures
  and responsive `srcset` support, but it **requires predefined image width/height**, is "not designed to display
  very large images" (max recommended 3000×3000) and has no continuous/webtoon mode
  ([Getting started](https://photoswipe.com/getting-started/)). It also ships its own chrome, which conflicts
  with a reader that hides/reveals toolbars.
- **No library (CSS scroll-snap + IntersectionObserver).** `scroll-snap-type` + `scroll-snap-align` (+
  `scroll-snap-stop`) gives paged, decelerating, native scroll with zero JS on the hot path
  ([MDN scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type)), and
  `IntersectionObserver` gives active-page tracking and lazy loading
  ([MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)).
  This is close to what `manga-reader.tsx` already does for webtoon. Costs: you write RTL paging, keyboard,
  focus, and ARIA yourself (target the [APG carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)).

### B4. Recommendation for this codebase

- **Do not introduce a carousel library.** Swiper's value here is paging + thumbs + keyboard + a11y, all of
  which we already have or can add cheaply; its costs land directly on our stack (Next App Router SSR friction
  with no `"use client"`, real-DOM slides, a `Virtual` module built for uniform slides, and a `Zoom` module that
  competes with our swipe paging). The remaining gaps are better closed in place.
- **Add in `manga-reader.tsx` / `reader-shared.tsx`:**
  1. A page-jump affordance: a real `role="slider"` scrub bar (Mihon) plus a `G`-style go-to-page input (Kavita);
     lazy thumbnails drawer later (Komga).
  2. Pan for oversized pages: make the paged image interactive inside a scroll container or add
     `react-zoom-pan-pinch` for wheel/pinch/drag, instead of a non-navigable CSS `scale`.
  3. Double-page grouping with the Komga rules (first/last single, landscape single) and a Kavita-style
     "Double (Manga)" + cover-offset option.
  4. Chrome polish: scroll-based auto-hide with a sensitivity control (Mihon) and keyboard toggles
     (`m`/`t`/`f`/`g`, Komga), keeping the existing centre-tap toggle.
  5. Accessibility: `role="region"` + `aria-roledescription`, per-slide group labels, a polite live region for
     page changes, and `aria-label`s on the zoom buttons (APG).
- **If a library is later wanted**, the smallest coherent stack is **Embla + react-zoom-pan-pinch** (headless
  paging with real SSR/a11y plugins + dedicated pan/zoom), or plain **scroll-snap + IntersectionObserver**;
  choose **Swiper** only if bundling a batteries-included paging + thumbs UI and paying the SSR cost is
  acceptable.

## Sources

- Mihon: [reader settings](https://mihon.app/docs/guides/reader-settings), [reader FAQ](https://mihon.app/docs/faq/reader),
  [changelog v0.20.0](https://mihon.app/changelogs/v0.20.0), [v0.20.1](https://mihon.app/changelogs/v0.20.1).
- Komga: [DIVINA webreader](https://komga.org/docs/guides/webreader-divina/), [libraries](https://komga.org/docs/guides/libraries/),
  [bookreader shortcuts source](https://github.com/gotson/komga/blob/master/komga-webui/src/functions/shortcuts/bookreader.ts),
  [issue #172](https://github.com/gotson/komga/issues/172), [commit ac3d969](https://github.com/gotson/komga/commit/ac3d969a0f79bc1888be8d356caf364dd1e568cb).
- Kavita: [comic/manga reader](https://wiki.kavitareader.com/guides/readers/comic-manga/),
  [epub reader](https://wiki.kavitareader.com/guides/readers/epub/),
  [reading profiles](https://wiki.kavitareader.com/guides/user-settings/reading-profiles/),
  [reading-profiles.ts source](https://github.com/Kareadita/Kavita/blob/develop/UI/Web/src/app/_models/preferences/reading-profiles.ts).
- Suwayomi / Tachidesk: [WebUI README](https://github.com/Suwayomi/Tachidesk-WebUI/blob/master/README.md),
  [server PR #110](https://github.com/Suwayomi/Tachidesk-Server/pull/110),
  [JUI issue #78](https://github.com/Suwayomi/Suwayomi-JUI/issues/78).
- Accessibility: [W3C ARIA APG Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
- Swiper: [React](https://swiperjs.com/react), [API](https://swiperjs.com/swiper-api),
  [CHANGELOG](https://github.com/nolimits4web/swiper/blob/master/CHANGELOG.md),
  [discussion #7165](https://github.com/nolimits4web/swiper/discussions/7165),
  [issue #7689](https://github.com/nolimits4web/swiper/issues/7689),
  [discussion #7578](https://github.com/nolimits4web/swiper/discussions/7578).
- Embla: [Options](https://www.embla-carousel.com/docs/api/options), [Accessibility](https://www.embla-carousel.com/docs/plugins/accessibility),
  [SSR guide](https://www.embla-carousel.com/docs/guides/server-side-rendering).
- [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch), [react-pdf](https://github.com/wojtekmaj/react-pdf),
  [PhotoSwipe](https://photoswipe.com/getting-started/).
- Platform: [MDN scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type),
  [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
- Package metadata: npm registry (`registry.npmjs.org/<pkg>/latest`), GitHub API, jsDelivr file sizes,
  Bundlephobia (approximate entry min/gzip).
