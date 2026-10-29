#!/usr/bin/env python3
"""WJ DB Studio — generate build/icon.png (512x512) with pure stdlib.
(c) 2026 Weeradech Jessadarom — MIT"""
import zlib, struct, math, os

SS = 2                 # supersample factor
OUT = 512
W = OUT * SS

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

C1 = (79, 140, 255)    # #4f8cff
C2 = (123, 92, 255)    # #7b5cff

def rounded_rect_dist(x, y, size, r):
    """<=0 inside rounded rect [0,size]x[0,size]."""
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    return math.hypot(x - cx, y - cy) - r

def render():
    px = bytearray(W * W * 4)
    cx, rx, ry = W / 2, 0.255 * W, 0.092 * W
    top_y, bot_y = 0.355 * W, 0.70 * W
    bands = [(0.475 * W, 0.505 * W), (0.585 * W, 0.615 * W)]
    for j in range(W):
        y = j + 0.5
        for i in range(W):
            x = i + 0.5
            # background gradient rounded square (full bleed: flat gradient tile)
            t = y / W
            col = lerp(C1, C2, t)
            d = rounded_rect_dist(x, y, W, 0.185 * W)
            a = 255
            if d > 0.75:
                a = 0
            elif d > -0.75:
                a = int(255 * (0.5 - d / 1.5))
            # cylinder fill (white)
            inside = False
            if top_y <= y <= bot_y and abs(x - cx) <= rx:
                inside = True
            if (y - top_y) ** 2 / ry ** 2 + (x - cx) ** 2 / rx ** 2 <= 1:
                inside = True
            if (y - bot_y) ** 2 / ry ** 2 + (x - cx) ** 2 / rx ** 2 <= 1 and y >= top_y:
                inside = True
            # band cuts (gradient color again)
            inband = any(b0 <= y <= b1 for b0, b1 in bands) and abs(x - cx) <= rx
            if inside and not inband:
                col = (255, 255, 255)
            o = (j * W + i) * 4
            px[o] = col[0]; px[o+1] = col[1]; px[o+2] = col[2]; px[o+3] = a
    return px

def downsample(px):
    out = bytearray(OUT * OUT * 4)
    for j in range(OUT):
        for i in range(OUT):
            r = g = b = a = 0
            for dj in range(SS):
                for di in range(SS):
                    o = ((j * SS + dj) * W + (i * SS + di)) * 4
                    r += px[o]; g += px[o+1]; b += px[o+2]; a += px[o+3]
            n = SS * SS
            o2 = (j * OUT + i) * 4
            out[o2] = r // n; out[o2+1] = g // n; out[o2+2] = b // n; out[o2+3] = a // n
    return out

def write_png(path, data, w, h):
    def chunk(tag, payload):
        c = tag + payload
        return struct.pack('>I', len(payload)) + c + struct.pack('>I', zlib.crc32(c))
    raw = b''.join(b'\x00' + bytes(data[y*w*4:(y+1)*w*4]) for y in range(h))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    target = os.path.join(here, '..', 'build')
    os.makedirs(target, exist_ok=True)
    px = downsample(render())
    write_png(os.path.join(target, 'icon.png'), px, OUT, OUT)
    print('OK build/icon.png', OUT, 'x', OUT)
