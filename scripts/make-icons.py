from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / "public" / "icons"


def draw(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.06)
    draw.rounded_rectangle((pad, pad, size - pad, size - pad), radius=int(size * 0.22), fill=(239, 93, 60, 255))
    cx, cy, r = size // 2, int(size * 0.56), int(size * 0.24)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 215, 191, 255))
    eye = max(2, size // 28)
    draw.ellipse((cx - r // 2, cy - eye, cx - r // 2 + eye * 2, cy + eye), fill=(59, 36, 24, 255))
    draw.ellipse((cx + r // 5, cy - eye, cx + r // 5 + eye * 2, cy + eye), fill=(59, 36, 24, 255))
    draw.arc((cx - r // 2, cy, cx + r // 2, cy + r // 1.4), 20, 160, fill=(59, 36, 24, 255), width=max(2, size // 28))
    ear = int(size * 0.16)
    draw.polygon([(cx - r, cy - r), (cx - r - ear // 2, cy - r - ear), (cx - r // 3, cy - r)], fill=(239, 93, 60, 255))
    draw.polygon([(cx + r, cy - r), (cx + r + ear // 2, cy - r - ear), (cx + r // 3, cy - r)], fill=(239, 93, 60, 255))
    return img


root.mkdir(parents=True, exist_ok=True)
for size, name in ((180, "icon-180.png"), (192, "icon-192.png"), (512, "icon-512.png")):
    draw(size).save(root / name)
print("wrote icons")
