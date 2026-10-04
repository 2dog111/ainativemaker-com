#!/usr/bin/env python3
"""Готовит жёлтую серию к загрузке в Яндекс Директ.

Из исходных макетов 1254x1254 убираются два элемента, из-за которых модерация
снимает изображение: тёмная псевдокнопка со стрелкой (элемент интерфейса,
который на картинке не нажимается) и адрес сайта. Всё остальное — заголовок,
подзаголовок, марка, иллюстрация — остаётся как было.

Дальше очищенный квадрат отдаётся в РСЯ как стандартное изображение 1:1.
Широкоформатный 16:9 из квадрата не делается: дорисованное поле оставляет шов
и пустую половину кадра. Широкий формат и баннерные размеры собирает
generate.mjs собственной раскладкой.
"""
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'original'
OUT = ROOT / 'rsya-original'
OUT.mkdir(exist_ok=True)

# Прямоугольники в координатах исходника 1254x1254: (left, top, right, bottom).
# button — тёмная плашка со стрелкой, url — строка ainativemaker.com.
LAYOUTS = {
    'src-01.png': {
        'name': '05-zhivyote-v-tekste',
        'wipe': [(72, 796, 690, 950), (868, 1128, 1196, 1200)],
        'anchor': 'left',
    },
    'src-02.png': {
        'name': '04-tekstov-mnogo',
        'wipe': [(62, 898, 740, 1028), (898, 80, 1196, 132)],
        'anchor': 'left',
    },
    'src-03.png': {
        'name': '03-rabochiy-instrument',
        'wipe': [(58, 838, 668, 984), (898, 84, 1200, 136)],
        'anchor': 'left',
    },
    'src-04.png': {
        'name': '02-pervaya-versiya',
        'wipe': [(52, 862, 614, 984), (62, 1132, 396, 1192)],
        'anchor': 'left',
    },
    'src-05.png': {
        'name': '01-rasshifrovka',
        'wipe': [(56, 744, 684, 896), (924, 48, 1200, 102)],
        'anchor': 'left',
    },
}

# Стандартное изображение РСЯ: 1:1, сторона от 450 до 5000 px.
RSYA = [(1200, 1200)]


def detect(im, box, grow=22, dark=330):
    """Уточняет прямоугольник по самим тёмным пикселям внутри него.

    Координаты кнопки и адреса снимались с макета на глаз, и промах в несколько
    пикселей оставляет тёмную полоску по краю. Поэтому границы пересчитываются
    по факту: берётся рамка вокруг тёмных пикселей в слегка расширенной области.
    """
    left, top, right, bottom = box
    x0, y0 = max(0, left - grow), max(0, top - grow)
    x1, y1 = min(im.width, right + grow), min(im.height, bottom + grow)
    region = im.crop((x0, y0, x1, y1))
    px = region.load()
    xs, ys = [], []
    for y in range(region.height):
        for x in range(region.width):
            if sum(px[x, y]) < dark:
                xs.append(x)
                ys.append(y)
    if not xs:
        return box
    return (x0 + min(xs) - 3, y0 + min(ys) - 3, x0 + max(xs) + 4, y0 + max(ys) + 4)


def row_colour(im, x0, x1, y):
    """Средний цвет короткой полосы пикселей в одной строке."""
    px = im.crop((x0, y, x1, y + 1)).resize((1, 1), Image.BOX)
    return px.getpixel((0, 0))


def wipe(im, boxes, margin=16, span=10):
    """Закрашивает прямоугольник построчно, подбирая фон слева и справа от него.

    Построчная заливка важнее, чем кажется: фон макета не идеально плоский, и
    один сплошной прямоугольник оставляет тонкий шов на границе. Если справа от
    прямоугольника не фон, а иллюстрация, правая проба отбрасывается.
    """
    out = im.copy()
    for box in boxes:
        left, top, right, bottom = detect(out, box)
        lx0, lx1 = max(0, left - margin - span), max(1, left - margin)
        rx0, rx1 = min(out.width - 1, right + margin), min(out.width, right + margin + span)
        for y in range(top, min(bottom, out.height)):
            lc = row_colour(out, lx0, lx1, y)
            rc = row_colour(out, rx0, rx1, y) if rx1 > rx0 else lc
            if sum(abs(a - b) for a, b in zip(lc, rc)) > 45:
                rc = lc                      # справа не фон — тянем левый цвет
            width = right - left
            for x in range(left, min(right, out.width)):
                t = (x - left) / max(1, width - 1)
                out.putpixel((x, y), tuple(round(lc[i] + (rc[i] - lc[i]) * t) for i in range(3)))
    return out


rows = []
for filename, layout in LAYOUTS.items():
    source = Image.open(SRC / filename).convert('RGB')
    cleaned = wipe(source, layout['wipe'])
    cleaned.save(ROOT / 'original' / f"{layout['name']}-clean.png")
    for w, h in RSYA:
        out = OUT / f"{layout['name']}-rsya-{w}x{h}.jpg"
        cleaned.resize((w, h), Image.LANCZOS).save(out, 'JPEG', quality=92, optimize=True)
        kb = out.stat().st_size // 1024
        size = Image.open(out).size
        rows.append((out.name, size, kb, size == (w, h) and kb <= 10 * 1024))

for name, size, kb, ok in rows:
    print(f"{'PASS' if ok else 'FAIL'} {name} {size[0]}x{size[1]} {kb} КБ")
print(f"{sum(1 for r in rows if r[3])}/{len(rows)} PASS")
