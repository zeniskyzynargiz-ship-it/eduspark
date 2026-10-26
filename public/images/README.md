# Images

| File | Use | Source size | Transparency check | Processing |
|---|---|---|---|---|
| `hero-garden-london.webp` | Home hero background (garden + London) | 1672×941 RGB | No alpha channel (photo background, as intended) | Converted to WebP q84. A white gradient veil is added in CSS so text stays readable. |
| `hero-book-composition.webp` | Hero illustration, right side (open book) | 1536×1024 RGBA | Real alpha: ~39% of pixels fully transparent, no black background stored | Trimmed empty transparent edges, resized to 1100 px wide, WebP with alpha. |
| `interest-sport-ball.webp` | Sport card | 1536×1024 RGBA | Real alpha (~63% transparent) | Trimmed, 520 px wide, WebP with alpha. |
| `interest-music-headphones.webp` | Music card | 1536×1024 RGBA | Real alpha (~64% transparent) | Trimmed, 520 px wide, WebP with alpha. |
| `interest-travel-globe.webp` | Travel card | 1536×1024 RGBA | Real alpha (~56% transparent) | Trimmed, 520 px wide, WebP with alpha. |
| `interest-tech-robot.webp` | Technology card | 1536×1024 RGBA | Real alpha (~60% transparent) | Trimmed, 520 px wide, WebP with alpha. |
| `demo-teacher-cover.webp` | Demo video cover | 1672×941 RGB | No alpha channel (photo, as intended) | Resized to 960 px, WebP. Always shown with a "Demonstration sample" badge; it is not evidence of a real lesson. |

Transparency was checked by reading the alpha channel histogram of each PNG (not by looking at the preview), so a stored black background would have been detected. None was found.
The full homepage mockup was used only as a visual reference; it is not placed on the site as a picture.
