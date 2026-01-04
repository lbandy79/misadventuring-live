# Visual Upgrade Asset Manifest

## Don Bluth / Disney Robin Hood Aesthetic

This document tracks the visual assets needed for the "hand-drawn animation style" upgrade.
Assets should feature **thick, confident outlines**, **warm limited palettes**, and **cel-shaded coloring**.

---

## Typography (✅ Implemented)

### Soggy Bottom Pirates
- **Display**: "Luckiest Guy" / "Titan One" - chunky, cartoonish
- **Body**: "Patrick Hand" - warm, handwritten feel
- **Accent**: "Permanent Marker" - pirate scrawl

### Neon Nightmares  
- **Display**: "Monoton" - neon tube lettering
- **Body**: "VT323" - CRT terminal monospace
- **Accent**: "Orbitron" - bold 80s sci-fi

---

## Soggy Bottom Pirates Assets

### Vote Icons (✅ Placeholder SVGs Created)
| Icon | File | Status | Notes |
|------|------|--------|-------|
| Anchor | `/assets/themes/soggy-bottom-pirates/icons/anchor.svg` | ✅ Placeholder | Golden anchor, cel-shaded |
| Treasure | `/assets/themes/soggy-bottom-pirates/icons/treasure.svg` | ✅ Placeholder | Treasure chest with coins |
| Skull | `/assets/themes/soggy-bottom-pirates/icons/skull.svg` | ✅ Placeholder | Jolly Roger skull |
| Sword | `sword.svg` | ❌ Needed | Cutlass sword |
| Ship Wheel | `wheel.svg` | ❌ Needed | Captain's wheel |

### Card Frame
| Asset | File | Status |
|-------|------|--------|
| Wood Frame Border | `/frames/card-frame.svg` | ✅ Placeholder |
| Parchment Texture | `/frames/parchment-texture.png` | ❌ Needed |
| Rope Divider | `/frames/rope-divider.svg` | ❌ Needed |

### Progress Bar
| Asset | File | Status |
|-------|------|--------|
| Rope Track | `/frames/rope-track.svg` | ❌ Needed |
| Gold Fill Texture | CSS gradient | ✅ Implemented |

### Winner Banner
| Asset | File | Status |
|-------|------|--------|
| Scroll Banner | `/banners/winner-scroll.svg` | ❌ Needed |

---

## Neon Nightmares Assets

### Vote Icons (✅ Placeholder SVGs Created)
| Icon | File | Status | Notes |
|------|------|--------|-------|
| Watching Eye | `/assets/themes/neon-nightmares/icons/eye.svg` | ✅ Placeholder | Neon glowing eye |
| VHS Tape | `/assets/themes/neon-nightmares/icons/vhs.svg` | ✅ Placeholder | Horror tape cassette |
| Static TV | `/assets/themes/neon-nightmares/icons/static.svg` | ✅ Placeholder | TV with static |
| Skull Neon | `skull-neon.svg` | ❌ Needed | Neon outline skull |
| Phone | `phone.svg` | ❌ Needed | 80s rotary phone |

### Card Frame
| Asset | File | Status |
|-------|------|--------|
| CRT Frame Border | `/frames/card-frame.svg` | ✅ Placeholder |
| CRT Overlay | `/frames/crt-overlay.png` | ❌ Needed |
| Scanline Divider | `/frames/scanline-divider.svg` | ❌ Needed |

### Progress Bar
| Asset | File | Status |
|-------|------|--------|
| VHS Track | `/frames/vhs-track.svg` | ❌ Needed |
| Neon Fill | CSS gradient + glow | ✅ Implemented |

### Winner Banner
| Asset | File | Status |
|-------|------|--------|
| Glitch Banner | `/banners/winner-glitch.svg` | ❌ Needed |
| Lottie Animation | `/banners/winner-glitch.json` | ❌ Optional |

---

## Animation Guidelines

### Idle States
- **Pirates**: Gentle bob/float (like floating on water)
- **Neon**: Subtle glow pulse, occasional flicker

### Select States  
- **Both**: Squash/stretch (classic animation principle)
- **Pirates**: Splash effect
- **Neon**: Glitch distortion

### Winner Banner
- GSAP entrance: scale from 0 + rotation + elastic ease
- Glow pulse loop
- Theme-appropriate confetti/particles

---

## Art Style Reference

### Key Characteristics
1. **Thick outlines** - 3-4px stroke, confident lines (not thin vectors)
2. **Limited palette** - 4-6 colors max per element
3. **Cel-shaded gradients** - Hard edge highlights/shadows
4. **Imperfect shapes** - Slightly wobbly, hand-drawn feel
5. **Personality** - Characters/objects have "acting" poses

### Reference Films
- Don Bluth: *An American Tail*, *The Secret of NIMH*
- Disney: *Robin Hood*, *The Rescuers*
- Modern: *Cuphead* (for the hand-drawn game aesthetic)

---

## Implementation Status

- [x] Theme typography updated
- [x] Theme type system extended with `assets` property
- [x] Asset folder structure created
- [x] ThemeAssets loader component built
- [x] Vote card styling (thick outlines, cel-shading)
- [x] Progress bar styling (themed per campaign)
- [x] ThemeIcon component with idle/select animations
- [x] WinnerBanner component with GSAP
- [ ] Final production assets (artist deliverables)
