from pathlib import Path
from collections import deque
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "images" / "sponsors"
FILES = [
    "Sea & Earth.png",
    "Steep Soda Co.png",
    "Steve Davey Painting and Decorating.png",
    "The Beacon Inn.png",
    "UCR logo.png",
]


def is_edge_white(pixel):
    r, g, b, a = pixel
    if a <= 8:
        return True
    return min(r, g, b) >= 215 and max(r, g, b) - min(r, g, b) <= 28


def remove_connected_white(image):
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen = bytearray(width * height)
    queue = deque()

    def key(x, y):
        return y * width + x

    for x in range(width):
        for y in (0, height - 1):
            if is_edge_white(pixels[x, y]) and not seen[key(x, y)]:
                seen[key(x, y)] = 1
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_edge_white(pixels[x, y]) and not seen[key(x, y)]:
                seen[key(x, y)] = 1
                queue.append((x, y))

    changed = 0
    while queue:
        x, y = queue.popleft()
        r, g, b, a = pixels[x, y]

        if a > 0 and min(r, g, b) >= 215 and max(r, g, b) - min(r, g, b) <= 28:
            whiteness = min(r, g, b)
            alpha = max(0, min(255, int((245 - whiteness) / 30 * 255)))
            if alpha < a:
                pixels[x, y] = (r, g, b, alpha)
                changed += 1

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                k = key(nx, ny)
                if not seen[k] and is_edge_white(pixels[nx, ny]):
                    seen[k] = 1
                    queue.append((nx, ny))

    return rgba, changed


def trim_and_pad(image):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image

    cropped = image.crop(bbox)
    width, height = cropped.size
    padding = max(10, round(max(width, height) * 0.045))
    result = Image.new("RGBA", (width + padding * 2, height + padding * 2), (0, 0, 0, 0))
    result.alpha_composite(cropped, (padding, padding))
    return result


for name in FILES:
    path = SRC / name
    original = Image.open(path).convert("RGBA")
    cleaned, changed = remove_connected_white(original)
    cleaned = trim_and_pad(cleaned)
    cleaned.save(path, "PNG", optimize=True)
    print(f"{name}: {original.size} -> {cleaned.size}; cleaned_pixels={changed}")
