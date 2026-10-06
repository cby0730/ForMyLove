# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A single-page interactive love-letter site (zh-TW UI). Static HTML/CSS/vanilla JS with a vendored GSAP 3.12.5 — no build step, no package manager, no test suite, no linter.

## Commands

```bash
# Serve locally — bind to localhost only, never 0.0.0.0; use port 31060
python3 -m http.server 31060 --bind 127.0.0.1

# Syntax check (the only automated check available)
node --check script.js && node --check ambient.js && node --check firework.js

# Add a photo: originals go in photos/originals/, the site loads 1280px WebP.
# +profile '!icc,*' keeps the ICC profile so iPhone Display-P3 photos don't wash out.
convert photos/originals/9.jpg -resize '1280x1280>' +profile '!icc,*' -quality 80 photos/9.webp
```

Git: this machine has no global git identity — commit with
`git -c user.name=Billy -c user.email=85448144+cby0730@users.noreply.github.com commit ...` (don't change git config).
Push only when a batch of work is finished, and always through the proxy:
`git -c http.proxy=http://127.0.0.1:31100 push origin main`.
Clean up any screenshots / temp harness files and stop the server afterwards.

## Architecture

**Content vs. logic split.** `content.js` defines `window.CONTENT` (memories, Stage-2 messages, timer, firework `secret` lines). `script.js` only reads `window.CONTENT`; copy/date/photo changes should never require touching `script.js`. Dates must be `YYYY-MM-DDTHH:mm:ss` (local midnight) — bare `YYYY-MM-DD` parses as UTC. Optional per-memory fields: `theme` (`blush`/`gold`/`warm`), `focus`, `kenBurns: false`, `anniversary: true`.

**Script load order matters** (classic globals, no modules): `vendor/gsap.min.js` → `content.js` → `ambient.js` → `firework.js` → `script.js`. `ambient.js` and `firework.js` are IIFEs exposing `window.Ambient` / `window.Firework`; `script.js` drives them.

**Five-stage state machine in `script.js`** — `currentStage` 0 scattered hearts → 1 gathered heart → 2 burst + message → 3 scrollable timeline → 4 timer; restart returns to 0. Every transition follows the same pattern, and new features must too so everything stays interruptible:
1. `if (isAnimating) return; killTransition(); isAnimating = true;`
2. build a GSAP timeline, store it in `activeTimeline`
3. in `onComplete`: set `currentStage`, `applyStageClass()`, `snapIdleStageVisuals()`, `updateHint()`, `isAnimating = false`
4. a `prefersReduced()` branch that skips straight to the end state

`killTransition()` is the single teardown point (tweens, particles, modal, timer, rAF, firework). Anything new that spawns DOM nodes, tweens, intervals or rAF loops must be cleaned up there. GSAP owns `transform`/`opacity` on animated nodes; CSS stage classes (`.stage-N`) only toggle `pointer-events`/visibility.

**Hearts** are all `<svg><use href="#heart-shape"/></svg>` referencing one hidden sprite in `index.html` (`.svg-sprite` is hidden by size, not `display:none`, which would break gradient lookup in Safari/Firefox). Use `createHeartSvg()`.

**Memory dialog**: `showInfoModal(index, pointEl)` opens; `stepMemory(±1)` navigates (buttons, ←/→, horizontal swipe) and keeps the timeline scrolled/revealed behind it. `modalSession` guards stale async image loads. The photo frame takes the photo's own ratio via the `--ratio` CSS var. Focus is trapped while open and returned to the originating timeline point on close.

**Firework easter egg** (`firework.js`): long-press the big heart 1.5s in Stage 1/2 (deliberately no hint in the UI). The "camera" is a `translateY` on `.container`; the firework canvas and message live *outside* `.container` so they don't move with it. The releasing pointer is swallowed via `suppressPointerId` so it doesn't also advance the stage. Afterwards the story stays in the same stage.

**Anniversaries**: `upcomingAnniversaries()` lists the next yearly anniversary of each memory flagged `anniversary: true` (currently 在一起 and 結婚). On the day it shows "today" and rains hearts; the next day it rolls over to the following year by itself.

**Reply burst** (Stage 4 "回你一顆愛心" button): driven by the persistent visible count `replyCount`, not a per-visit counter. When `replyCount % reply.burst.pop` exceeds `swell` the button scales up (`swellScale()`, also applied on entry by `snapIdleStageVisuals()`), and every multiple of `pop` calls `burstReplyButton()` — a screen-filling heart that fades out, then the button regrows. Clicks are ignored while `burstTimeline` runs; `resetReplyBurst()` in `killTransition()` aborts it. Because the count never resets, milestones like 520/1314 still fire. Skipped under `prefers-reduced-motion`.

**Fonts**: stack prefers system 標楷體 with LXGW WenKai TC (Google Fonts) fallback. 標楷體 has no kana, so Japanese lines get `lang="ja"` and a WenKai-first stack to avoid mixed glyphs.

## Headless visual verification

`google-chrome --headless=new` works for screenshots, with caveats learned the hard way:
- Minimum window width is 500px — emulate phones by loading the page in a sized `<iframe>` inside a throwaway harness page.
- Under `--virtual-time-budget`, rAF and CSS transitions don't advance normally: fast-forward GSAP (`gsap.globalTimeline.getChildren(true,true,true).forEach(t => t.progress(1))`) or `seek()` a paused timeline frame by frame, and disable CSS transitions.
- Top-level `const`s in `script.js` are not `window` properties; reach them via `iframe.contentWindow.eval(...)`.
- Sound, real timing feel, and touch gestures (long-press, swipe) can't be verified headless — say so and ask the user to check on a phone.

## Docs

`README.md` (user-facing, 繁中) and `develop.md` (architecture and implementation notes) should be updated alongside feature changes.
