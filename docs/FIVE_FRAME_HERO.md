# Agent-built canvas and five-frame hero

## Product presentation

The hero starts with an empty content area over a generated graphite background. Three simulated design cursors draw a frame, then assemble seven real DOM pieces: eyebrow, headline, explanation, actions, assurance, terminal example and illustrated story. It is an original visual effect, not actual agents modifying the visitor's page. Navigation and motion controls remain available.

The short sales message positions this as an on-demand security skill for an AI coding agent. It is not background antivirus, malware removal or EDR. The five-image sequence is a conceptual illustration of approved scope, local inspection, a finding, a proposed human-reviewed fix and a bounded retest. Live network scanning remains on the roadmap.

## Five coherent generated scenes

All five edits used `apps/site/public/assets/defense-network-emerald.webp` as their reference. The generated frames preserve the same central processor, four graphite modules and camera layout; they are separate generated images, not one image with changing captions. Minor surface variations are expected in generated artwork. Images crossfade while captions and stage controls remain real HTML. Stage selection pauses the sequence; replay resumes. Motion stops offscreen, while the document is hidden, under reduced motion and through the shared pause control.

| Asset in `apps/site/public/assets/` | Meaning | Delivery bytes |
|---|---|---:|
| `defense-scope.webp` | Quiet approved boundary, no scan plane or amber fault | 54,052 |
| `defense-scan.webp` | Scan plane over the left modules, light packets | 61,670 |
| `defense-finding.webp` | Amber upper-right finding, diagnostic ring and evidence markers | 57,142 |
| `defense-patch.webp` | Proposed patch tile, violet alignment bracket and pending amber indicator | 49,442 |
| `defense-verified.webp` | Clean green check on the same module and completed retest ring | 50,810 |
| `defense-backdrop.webp` | Quiet graphite contour texture, green edge and faint violet reflection | 41,372 |

The five frames are delivered at 1200×800; the background is 1600 pixels wide. Combined delivery is 314,488 bytes (about 315 KB), without a video decoder or real-time 3D engine. Built-in imagegen produced the source PNGs; Sharp only resized/encoded delivery copies. Originals remain in local generated-image storage. Every image was visually reviewed for the consistent five objects, phase-specific diagnostic state, lack of generated lettering, and restrained color.

## Final imagegen prompt set

All edits below used the same original reference image. The sixth image was a new generation.

### 1. Scope

Edit this exact illustration into FRAME 1 of a five-frame premium Cyber Defense animation: APPROVED SCOPE / IDLE. Preserve the exact same five physical objects, their positions, proportions, materials, camera angle, dark graphite background, lens and framing. One central smoked-glass emerald processor and four identical surrounding charcoal server modules must be unchanged. Remove the tall scanning plane entirely. Replace the amber indicators on the upper-right module with neutral desaturated pale-green indicators. Keep the connecting green traces dim, almost standby. Add one thin flat emerald rectangular boundary on the floor enclosing the four modules, an elegant approved-scope perimeter. A quiet baseline before scanning. Do not add text, labels, numbers, logos, locks, shields, humans, extra devices, or change camera. Photorealistic 3D product illustration, restrained emerald and a faint violet reflection, 3:2 landscape.

### 2. Scan

Edit this exact image into FRAME 2 / ACTIVE INSPECTION of the same five-frame sequence. STRICTLY preserve the five identical physical objects, positions, geometry, camera, proportions and framing of this reference: emerald glass processor in center, four surrounding graphite modules. Change only the diagnostic light state. Remove amber fault coloring from the upper-right module for now. Move the translucent green vertical scanning sheet toward the LEFT pair of modules, illuminating them with a narrow bright emerald inspection edge. Add a delicate circular scan contour on the floor around the central core and small green light packets in the existing connecting traces. Show active searching, not an explosion or attack. The right modules remain comparatively dim. Premium photorealistic isometric product render, dark graphite background, emerald accent, faint violet edge on bottom-right module. No text, numbers, logos, extra objects, humans, shields. Same 3:2 composition.

### 3. Finding

Edit this exact image into FRAME 3 / VULNERABILITY FOUND. Preserve exactly the same central emerald processor, four charcoal modules, positions, proportions, camera and 3:2 framing. Remove the tall green scanning plane. Highlight ONLY the upper-right server module in a precise amber-orange diagnostic outline, with a very subtle red-orange fault seam across its glass code display. Add a thin hovering magnifying lens / transparent circular diagnostic ring around that module, showing this is the identified problem. Make its existing connection to the center amber, with two tiny amber evidence markers on that trace. Other three modules stay quiet green and the processor remains green. This is a controlled diagnostic finding, not damaged burning hardware. No text, letters, numbers, UI panels, warning triangles, giant shields or humans. Photorealistic luxury technology illustration, dark graphite, emerald primary accents, amber localized only to the suspect node, same composition as reference.

### 4. Patch

Edit this exact reference into FRAME 4 / PROPOSED PATCH of the same Cyber Defense sequence. STRICT invariants: same five physical devices, identical positions, sizes, materials, fixed isometric camera, 3:2 composition. Remove the tall scanning plane. On the upper-right module, show a precisely aligned small translucent emerald patch tile hovering just in front of its code-glass pane, a conceptual repair awaiting human approval. One thin violet alignment bracket surrounds this tile; a tiny amber indicator remains below it until approval. An elegant segmented emerald stream travels from the central processor to that upper-right module along its existing connection. The other modules remain unchanged and dim green. This is an engineered repair proposal, not magical healing, no hands or extra robots. Luxury CGI graphite surfaces, glass, controlled emerald rim light, faint violet accents. No words, letters, labels, numbers, logos, shields or extra scene objects. Preserve geometry and camera exactly.

### 5. Verified

Edit this exact illustration into FRAME 5 / VERIFIED RETEST, the final state of a five-image sequence. Preserve ALL five physical devices exactly: same camera, positions, materials, proportions, layout and 3:2 framing. Remove the tall scanning plane. Remove EVERY amber/red diagnostic light and line from the upper-right device; its former faulty glass code panel now shows a clean crisp green checkmark with two subtle green horizontal data bars, no words. All four existing connections are calm continuous emerald, not overbright neon. Add a delicate completed verification ring on the floor around the central processor, with four tiny green verification points. The bottom-right glass already has checkmarks; retain it. Keep dark graphite surfaces, realistic brushed-metal highlights, smoked glass, faint violet edge on lower-right server and generous dark margins. No labels, letters, numbers, branding, shields, humans or extra devices. A calm resolved product scene after an authorized human-reviewed change, no magical explosions.

### 6. Background

Generate a premium minimal dark website background texture, wide 16:9 landscape, for an emerald/graphite AI security product. Macro view of a finely machined graphite surface with a subtle abstract topographic contour flowing from bottom right toward upper right. Very thin engraved circuit-like curves and tiny restrained emerald light at the far RIGHT edge, a faint violet reflection deep in the bottom-right corner. Left 60 percent is nearly plain near-black graphite #090e0c for overlaid headline text; right remains dark enough for a product image. Photoreal luxury material, tactile fine grain and very soft atmospheric depth. Extremely restrained contrast, no bright center, no green fog, no rainbow gradient, no glowing orbs, no hardware objects, no writing, text, logos, icons or frames. A quiet architectural surface that adds richness to a landing page without competing with the content.

## Progressive enhancement and reusable skill

`skills/agent-build-scroll` remains the canonical implementation. The new `buildFromBlank` option is explicit opt-in. Its optional `build-intro.ts` bootstrap runs before the hero HTML is painted. No JavaScript means the temporary attribute is never set, so content stays visible. Reduced motion bypasses hiding. Missing application bundles fail open after 6.5 seconds; a key press immediately reveals content. Focus, pause, resize and cleanup cancel the real-element animations.

The controller uses SVG stroke drawing, bounded random cursor paths and temporary Web Animations on real content. It does not replace the page with screenshots or click any control. This new requested choreography does not claim an additional transitions-agent hosted fix or a Business license.

## Reproducible verification

- `scripts/construction-acceptance.js`: blocked-bundle first paint, timeout recovery, seven empty pieces, frame before content, staggered assembly, keyboard, pause, reduced motion and no JavaScript.
- `scripts/hero-acceptance.js`: five stages/images, manual and automatic playback, replay, pauses, loading and text/reflow checks.
- `scripts/ui-acceptance.js`: complete EN/PL demo, keyboard, clipboard, policies, no-JS content and 320–1440 layouts; explicit headline bounds now catch text clipped inside a non-overflowing container.
- `scripts/motion-acceptance.js`: original cursor routes, compact behavior and host strip.

Observed results and deployment evidence belong in VERIFICATION.md and RELEASE.md. Physical phones and sustained graphics-performance measurements remain unverified.
