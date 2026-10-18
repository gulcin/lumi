"""Turn storybook paintings into sized WebP cutouts, theme scenes, icons, and splashes."""

from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path("/opt/cursor/artifacts/assets")
OUT = Path(__file__).resolve().parents[1] / "public"
ART = OUT / "art"
CREAM = (255, 243, 228, 255)


def is_screen(r: int, g: int, b: int) -> bool:
    if g < 110 or r > 210 or b > 210:
        return False
    return (g - r) > 55 and (g - b) > 45 and g > 150


def key_cutout(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    pixels = image.load()
    width, height = image.size
    out = Image.new("RGBA", (width, height))
    dest = out.load()
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            if is_screen(r, g, b):
                dest[x, y] = (0, 0, 0, 0)
                continue
            # Pull green spill off fur edges without eating gold or leaves.
            if g > r + 18 and g > b + 12 and g > 80:
                g = max(r, b)
            dest[x, y] = (r, g, b, 255)
    # Soften harsh key edges.
    alpha = out.getchannel("A").filter(ImageFilter.GaussianBlur(radius=0.6))
    out.putalpha(alpha)
    bbox = out.getbbox()
    if not bbox:
        raise SystemExit(f"nothing left after key: {path}")
    pad = 8
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(width, bbox[2] + pad)
    bottom = min(height, bbox[3] + pad)
    cropped = out.crop((left, top, right, bottom))
    print(
        f"key {path.name:28} bbox {bbox[0] / width:.2f},{bbox[1] / height:.2f} "
        f"{bbox[2] / width:.2f},{bbox[3] / height:.2f} -> {cropped.size}"
    )
    return cropped


def fit(image: Image.Image, max_side: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return copy


def save_pair(image: Image.Image, dest: Path, two_x: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    large = fit(image, two_x)
    small = fit(image, max(1, two_x // 2))
    large.save(dest.with_name(dest.stem + "@2x.webp"), "WEBP", quality=78, method=6)
    small.save(dest.with_suffix(".webp"), "WEBP", quality=78, method=6)
    print(f"  {dest.relative_to(OUT)} {small.size} / {large.size}")


def save_scene(path: Path, dest: Path, two_x: int) -> None:
    image = Image.open(path).convert("RGB")
    save_pair(image, dest, two_x)


def extend_corners(image: Image.Image) -> Image.Image:
    """Fill near-white rounded corners with the neighbouring wash so the icon is full bleed."""
    image = image.convert("RGB")
    pixels = image.load()
    width, height = image.size

    def pale(x: int, y: int) -> bool:
        r, g, b = pixels[x, y]
        return r > 246 and g > 242 and b > 236

    if not pale(0, 0):
        return image
    for y in range(height):
        for x in range(width):
            if not pale(x, y):
                continue
            # Walk toward the centre until a painted pixel.
            cx = width // 2
            cy = height // 2
            dx = cx - x
            dy = cy - y
            steps = max(abs(dx), abs(dy), 1)
            found = pixels[cx, cy]
            for step in range(1, steps):
                nx = x + dx * step // steps
                ny = y + dy * step // steps
                if not pale(nx, ny):
                    found = pixels[nx, ny]
                    break
            pixels[x, y] = found
    return image


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, CREAM[:3])
    src = image.convert("RGB")
    scale = max(size[0] / src.width, size[1] / src.height)
    resized = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    canvas.paste(resized.crop((left, top, left + size[0], top + size[1])))
    return canvas


def main() -> None:
    poses = {
        "happy": "lumi-happy-ref.jpg",
        "think": "lumi-think-ref.jpg",
        "listen": "lumi-listen-ref.jpg",
        "cheer": "lumi-cheer-ref.jpg",
        "sleep": "lumi-sleep-ref.jpg",
    }
    for name, file in poses.items():
        save_pair(key_cutout(SRC / file), ART / "lumi" / f"{name}.webp", 880)

    wear = {
        "hat-cap": "wear-hat-cap-only.jpg",
        "hat-leaf": "wear-hat-leaf.jpg",
        "hat-star": "wear-hat-star.jpg",
        "scarf-teal": "wear-scarf-teal.jpg",
        "scarf-gold": "wear-scarf-gold-only.jpg",
        "glasses-round": "wear-glasses-round.jpg",
        "glasses-star": "wear-glasses-star.jpg",
    }
    for name, file in wear.items():
        save_pair(key_cutout(SRC / file), ART / "wear" / f"{name}.webp", 640)

    themes = [
        "who-we-are",
        "where-we-are",
        "how-we-express",
        "how-the-world-works",
        "how-we-organise",
        "sharing-the-planet",
    ]
    for name in themes:
        save_scene(SRC / f"theme-{name}.jpg", ART / "themes" / f"{name}.webp", 1280)

    spots = [
        "maths",
        "reading",
        "science",
        "history",
        "geography",
        "art",
        "music",
        "animals",
        "dinosaurs",
        "space",
        "oceans",
        "cooking",
        "sports",
        "building",
        "nature",
        "acorn",
    ]
    for name in spots:
        save_scene(SRC / f"spot-{name}.jpg", ART / "spots" / f"{name}.webp", 512)

    save_scene(SRC / "den-stars.jpg", ART / "dens" / "den-stars.webp", 1280)
    save_scene(SRC / "den-leaves.jpg", ART / "dens" / "den-leaves.webp", 1280)

    # Reference sheet: five poses on warm paper.
    sheet = Image.new("RGB", (1800, 520), CREAM[:3])
    x = 24
    for name in ("happy", "think", "listen", "cheer", "sleep"):
        pose = Image.open(ART / "lumi" / f"{name}@2x.webp").convert("RGBA")
        pose.thumbnail((320, 460), Image.Resampling.LANCZOS)
        sheet.paste(pose, (x, (520 - pose.height) // 2), pose)
        x += 356
    sheet_path = ART / "lumi" / "sheet.webp"
    sheet.save(sheet_path, "WEBP", quality=80, method=6)
    print("sheet", sheet.size)

    icon = extend_corners(Image.open(SRC / "icon-face-full.jpg"))
    icons = OUT / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    for size, filename in ((180, "icon-180.png"), (192, "icon-192.png"), (512, "icon-512.png")):
        icon.resize((size, size), Image.Resampling.LANCZOS).save(icons / filename, "PNG", optimize=True)
    # Maskable keeps the face inside the centre safe zone.
    mask = Image.new("RGB", (512, 512), (255, 214, 196))
    face = icon.resize((400, 400), Image.Resampling.LANCZOS)
    mask.paste(face, (56, 56))
    mask.save(icons / "icon-512-maskable.png", "PNG", optimize=True)
    icon.resize((32, 32), Image.Resampling.LANCZOS).save(OUT / "favicon.png", "PNG", optimize=True)

    portrait = Image.open(SRC / "splash-portrait.jpg")
    landscape = Image.open(SRC / "splash-landscape.jpg")
    splash = OUT / "splash"
    splash.mkdir(parents=True, exist_ok=True)
    sizes = {
        "ipad-11-portrait.jpg": (portrait, (1668, 2388)),
        "ipad-11-landscape.jpg": (landscape, (2388, 1668)),
        "ipad-13-portrait.jpg": (portrait, (2048, 2732)),
        "ipad-13-landscape.jpg": (landscape, (2732, 2048)),
    }
    for filename, (source, size) in sizes.items():
        path = splash / filename
        cover(source, size).save(path, "JPEG", quality=82, optimize=True)
        print(filename, path.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
