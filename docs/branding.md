# Branding and Assets

Icon files live in `assets/`. The source icon is `assets/branding/selftend-icon-source-2048.png` at 2048 x 2048; use it for future exports.

## Generated sizes

All other icon files are resized from the source above:

| File                       | Size      | Use                              |
| -------------------------- | --------- | -------------------------------- |
| `assets/icon.png`          | 1024×1024 | iOS app icon                     |
| `assets/adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `assets/splash-icon.png`   | 1024×1024 | splash screen                    |
| `assets/favicon.png`       | 192×192   | web favicon                      |
| `assets/favicon-512.png`   | 512×512   | web PWA icon                     |

If you update the source icon, regenerate all sizes using the script below, or an equivalent image-resizing tool.

## Regenerating icon sizes

```bash
python3 << 'EOF'
from PIL import Image

source_path = './assets/branding/selftend-icon-source-2048.png'
img = Image.open(source_path).convert('RGBA')

sizes = {
    'assets/icon.png': 1024,
    'assets/adaptive-icon.png': 1024,
    'assets/splash-icon.png': 1024,
    'assets/favicon.png': 192,
    'assets/favicon-512.png': 512,
}

for output_path, size in sizes.items():
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(output_path, 'PNG')
EOF
```

The script requires Python 3 and Pillow (`pip install pillow`).

## Theme tokens

Brand colors are derived from the icon palette and live in `src/lib/theme/styles.ts`, the single source of truth for the token contract. The default palette (`quiet-lilac`) uses a purple primary, a gray secondary, and subtle purple-tinted surfaces.

Changing a brand colour means editing `styles.ts` and the matching value in the `global.css` fallback pair — `test/theme-contract.test.ts` fails the build if the two disagree, so neither can move alone. `tailwind.config.js` maps variable names to classes and only changes when a name does. See [docs/architecture.md](architecture.md#theme-and-color-scheme) for the full layout and [docs/stack.md](stack.md) for how the React Native Reusables theme glue fits in.
