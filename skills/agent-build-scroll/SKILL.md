---
name: agent-build-scroll
description: Add named AI cursors that draw frames and assemble real page sections as the visitor scrolls. Use for agent-built landing pages, swarm-style website reveals and reusable scroll choreography with reduced-motion and pause controls.
---

# Agent Build Scroll

Build an original staged construction effect over a functioning page. Preserve its real DOM, content order, focus and controls. This effect is a visual demonstration, not evidence of real agents editing the visitor's page.

## Inspect and select

Read the project's instructions, stack, page and existing motion. Identify 3–8 meaningful regions. Define a short keep/change list and one coherent visual direction. Do not remove working interaction or add a framework only for animation.

For React/Next.js, reuse `assets/AgentBuildScroll.tsx` and `assets/agent-build-scroll.css`. The component uses React, IntersectionObserver, WAAPI and bounded requestAnimationFrame; no additional package, extension or service is required. For other stacks, port this contract without introducing React.

## Integrate

1. Copy both asset files to the target project's own source and import the CSS globally. In a Next App Router app keep the component as a client boundary.
2. Add `data-agent-target="Builder"` and optional `data-agent-label="Assembling the report"` to visible sections/cards. Use Scout, Builder and Verifier as the default roles; adapt names and colors to the brand.
3. Mount `<AgentBuildScroll locale="en" />` once near the root. Polish is supported with `locale="pl"`.
4. The overlay is fixed, `pointer-events:none` and `aria-hidden`. It draws a temporary wireframe, assembles real child elements and moves three labelled cursors along independent randomized Bézier paths with brief inspection pauses. These are synthetic visual roles, not connected agents. Paths are bounded to the viewport; bursts end after about three seconds. Under coarse pointers/small viewports use one cursor and no target translation. Keep fallback content fully visible even before JavaScript runs.
5. The component writes `data-motion="running|paused"` on the document and dispatches `agent-build:motion`. Subscribe decorative video/canvas controllers to this event; pause those renderers when paused, reduced-motion, hidden or offscreen. CSS pauses keyframes, but renderer APIs need explicit pause calls.

Use the same surface palette and typography as the target page. Place the dock away from main actions. Do not announce decorative movement to screen readers. Do not hide content behind a clone or screenshot. Do not install or copy an unlicensed extension's implementation. `DhvanilPatel/swarm-cursors` and `califa/swarm-site` are conceptual references only; verify their current licenses before considering any reuse. This package's code is original and MIT licensed by the containing project.

## Verify in the rendered page

- At 1440, 768, 390 and 320 px: no horizontal overflow; dock/cursors cannot block controls.
- Scroll through each chosen region: frames and labels align with the actual viewport bounds. Motion stops after a short burst; no idle infinite RAF.
- Keyboard: all real controls remain reachable; the pause button works. Check pause → scroll → resume.
- Change reduced motion while mounted: no overlay or reveal motion; text and controls stay visible. Pause video separately. With JS disabled, every section and anchor remains readable.
- Check background tab/offscreen behavior and cleanup on route navigation. No leaked observers, listeners, animations or continuous polling.
- Capture actual desktop/mobile frames and a short motion recording. A build alone does not verify choreography or physical-device performance.

Report implementation location, preview, controls and tested limitations. Do not claim a live multi-agent system or guaranteed frame rate.

The new choreography also observes `[data-motion-region]` and sets `data-in-view` for optional diagram and marquee animations. Pause offscreen regions. Focus entering an active target cancels its construction effect immediately; resize and backgrounding cancel it too. Do not hide the page by default.

## Empty-frame construction

Sections that are still below the fold when the effect starts are marked `data-build-pending` and shown as an empty dashed frame. When one scrolls into view the cursors arrive first, then its direct children fade in one by one. Content already on screen at load is never hidden. If the cursors are busy elsewhere the section reveals itself after about 1.3 seconds; focus inside a section, the pause control, a resize or reduced motion show its content immediately. Without JavaScript nothing is hidden.
