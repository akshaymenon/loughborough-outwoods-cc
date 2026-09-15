from pathlib import Path
from collections import deque
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "images" / "sponsors"
OUT = SRC / "cleaned"
OUT.mkdir(exist_ok=True)
FILES = [
    "Altitude Marketing.jpeg",
    "Sea & Earth.png",
    "Steep Soda Co.png",
    "Steve Davey Painting and Decorating.png",
    "The Beacon Inn.png",
    "UCR logo.png",
]

def dist(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)) ** 0.5

def remove_edge_white(img):
    rgba = img.convert("RGBA")
    rgb = rgba.convert("RGB")
    w, h = rgba.size
    corners = [rgb.getpixel((0,0)), rgb.getpixel((w-1,0)), rgb.getpixel((0,h-1)), rgb.getpixel((w-1,h-1))]
    bg = tuple(round(sum(p[i] for p in corners) / 4) for i in range(3))
    eligible = min(bg) >= 218 and max(bg)-min(bg) <= 24 and max(dist(p,bg) for p in corners) <= 34
    if not eligible:
        return rgba, False
    px = rgba.load(); seen = bytearray(w*h); q = deque()
    def key(x,y): return y*w+x
    def candidate(x,y):
        r,g,b,a = px[x,y]
        return a == 0 or (min(r,g,b) >= 194 and dist((r,g,b), bg) <= 42)
    for x in range(w):
        for y in (0,h-1):
            if candidate(x,y) and not seen[key(x,y)]: seen[key(x,y)] = 1; q.append((x,y))
    for y in range(h):
        for x in (0,w-1):
            if candidate(x,y) and not seen[key(x,y)]: seen[key(x,y)] = 1; q.append((x,y))
    changed = False
    while q:
        x,y = q.popleft(); r,g,b,a = px[x,y]; d = dist((r,g,b), bg)
        alpha = 0 if d <= 22 else min(a, int((d-22)/20*255))
        if alpha != a: px[x,y] = (r,g,b,alpha); changed = True
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h:
                k = key(nx,ny)
                if not seen[k] and candidate(nx,ny): seen[k] = 1; q.append((nx,ny))
    return rgba, changed

def trim_pad(img):
    bbox = img.getchannel("A").getbbox()
    if not bbox: return img
    crop = img.crop(bbox); w,h = crop.size; pad = max(10, round(max(w,h)*0.045))
    out = Image.new("RGBA", (w+2*pad,h+2*pad), (0,0,0,0)); out.alpha_composite(crop,(pad,pad)); return out

for name in FILES:
    image = Image.open(SRC/name).convert("RGBA")
    if image.getchannel("A").getextrema()[0] < 255:
        cleaned = image; removed = False
    else:
        cleaned, removed = remove_edge_white(image)
    cleaned = trim_pad(cleaned)
    out_name = Path(name).stem + ".png"
    cleaned.save(OUT/out_name, "PNG", optimize=True)
    print(f"{name}: {image.size} -> {cleaned.size}; background_removed={removed}")
