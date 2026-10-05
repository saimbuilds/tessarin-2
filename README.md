# tessarin.studio

The Tessarin studio website. One immersive page built around a single idea: **the tessera**.
The red shard in the Tessarin logo tessellates (an upright shard plus an inverted one tile the
plane), so the whole site is made of those tiles: a wall that spells the headline, a template
that gets smashed, shapes that become a browser window, a thinking sphere and a portal, and a
physics pile in the footer.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (deploys to Vercel as-is)
```

## Edit the words

All copy lives in **`src/content/site.ts`**: headlines, services, process, contact, the parody
agency site, and the placeholder projects. Things to fill in before launch:

- `site.bookingUrl` — the real Cal.com link (currently `https://cal.com/tessarin`)
- `site.email` and `site.socials`
- `work.items` — real project names, types and years (`hue` tints the generated mosaic cover)
- Check the promises in `process.steps` and `contact.body` ("within a week", "within a day")
  are ones the team will keep

## How it's built

| Piece | Where | Notes |
| --- | --- | --- |
| Tile field (hero wall, sphere, ring…) | `src/components/gl/TileField.tsx`, `tileMaterial.ts` | One instanced mesh of ~4–7k shard tiles, morphing between formations in the vertex shader. Flips run on a per-tile spring on the CPU. |
| Tile shape and formations | `src/lib/tiles.ts` | Shard geometry, tessellation, text masks for the wall. |
| Scroll choreography | `src/lib/choreography.ts` | Maps scroll position to which formation is showing. Sections opt in with `data-scene`. |
| Sound | `src/lib/audio.ts` | Every sound is synthesised live with the Web Audio API: drone, FM bells, tile clacks, glass shatter, whooshes. No audio files. |
| Smashed template | `src/components/sections/Pattern.tsx` | Canvas 2D; scroll-scrubbed, so scrolling back reassembles it. |
| Footer physics | `src/components/gl/FooterPhysics.tsx` | Rapier, lazy-loaded only when the footer is in view. |
| Logo | `src/lib/logo.ts`, `public/brand/` | Traced from the JPEG. Swap in the designer's vector when it exists. |

Stack: Next.js 16, React 19, three.js via React Three Fiber, Rapier, GSAP ScrollTrigger, Lenis,
Tailwind CSS 4.

Fonts: **Anybody** (Google Fonts, OFL) for display, whose width axis (50–150%) the headlines
animate; **Switzer** (Fontshare, free for commercial use) for text.

## Accessibility and performance

- `prefers-reduced-motion`: no smooth scroll, tiles snap instead of flip, the smash becomes a fade.
- Sound is opt-in on entry and can be toggled in the nav. It pauses when the tab is hidden.
- The WebGL canvas drops its resolution automatically on slow GPUs, and stops drawing while an
  opaque section covers it.
- Everything readable is real HTML; the tile wall headline has an `h1` behind it.
