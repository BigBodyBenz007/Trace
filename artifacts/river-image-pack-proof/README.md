# Approved River image-pack proof

This is a standalone desktop/mobile proof. It is not imported by Trace and does
not replace the production River.

Open `index.html` in a browser. The proof reads the six unchanged PNGs directly
from `../../river-image-pack/`.

## Architecture demonstrated

- A fixed, data-driven library of six scenery sections; section count does not
  depend on Memory count.
- Per-section width, uniform `object-fit: cover` scaling, and explicit crop
  alignment. Wider and narrower reaches crop rather than squash.
- Neighboring sections overlap and use a short alpha mask at the join. The
  source pixels provide all terrain and water artwork.
- Memory cards live in a separate semantic overlay with ordinary buttons. The
  scenery layer is `aria-hidden` and has no pointer events.
- Horizontal navigation uses the same scroll-container model on desktop and
  mobile, with reduced-motion-aware programmatic scrolling.

## Production recommendation

Keep this section manifest separate from chronology layout. A production River
renderer should map the current Life Current camera window to a small constant
set of section instances, while the existing Timeline continues to own card
positioning, focus, filtering, and scroll restoration.

Before production integration, generate responsive WebP/AVIF derivatives from
the preserved PNG masters and load only the current and adjacent sections. The
six PNGs total about 19 MB and decode to roughly 38 MB of RGBA pixels, so using
all masters eagerly is appropriate for this proof but not the final iPhone PWA
delivery path.
