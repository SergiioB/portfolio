# Redesign resources (from Sergio via Hermes)

Source tweet: https://x.com/i/status/2079933926005682537 (Jakub Antalik)
"These will instantly make your vibe-coded projects look less generic."

Three free, open-source animated UI libraries from the same creator. All URLs verified 200.

## 1. Thinking Orbs

- Site: http://orbs.jakubantalik.com
- Install: `npm install thinking-orbs`
- Usage: `import { ThinkingOrb } from 'thinking-orbs';`
- What: animated "thinking/loading" orb component. States: Working, Searching, Solving, Listening, Composing, Shaping. Size + speed props.
- Portfolio fit: loading/processing states, AI-handbook or agent-themed sections, any "working..." indicator.

## 2. Border Beam

- Site: https://beam.jakubantalik.com
- Install: `npm install border-beam`
- Usage: `import { BorderBeam } from 'border-beam';`
- What: animated border-beam that travels around a component's edge. Types: Large, Small, Line. Color themes: Colorful, Mono, Ocean, Sunset. Strength prop.
- Portfolio fit: highlight active/focused project cards, hero CTA, featured case-study frames.

## 3. Liquid Metal (metal-fx)

- Site: http://metal.jakubantalik.com
- Install: `npm install metal-fx`
- Usage: `import { MetalFx } from 'metal-fx';`
- What: animated liquid-metal shader effect. Types: Button, Circle. Colors: Chromatic, Silver, Gold. Strength prop.
- Portfolio fit: distinctive buttons, badges, section accents.

## Constraints (from AGENTS.md — do not violate)

- Keep the dark terminal/executive aesthetic: `#0B1120`-class background, `var(--surface)` cards, thin borders, cyan/blue accents, high-contrast text.
- Use these libraries sparingly as living accents, not a wholesale restyle. They must sit on dark surfaces and stay readable.
- Verify with `npm run build` + `astro preview` + browser/vision inspection before pushing.
- Do not commit generated previews/screenshots/caches.
