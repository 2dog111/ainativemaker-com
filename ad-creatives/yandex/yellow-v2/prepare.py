#!/usr/bin/env python3
"""Вторая жёлтая серия: снять плашку-кнопку и сбросить вес. Больше ничего.

Макеты нарисованы в ChatGPT, размер 1254x1254 уже подходит для РСЯ. Правится
ровно одно: тёмная плашка со стрелкой. Для Директа это элемент интерфейса,
который на картинке не нажимается, и модерация снимает креатив именно за него.

Границы плашки не задаются руками, а ищутся по картинке: в строке кнопки идёт
длинный непрерывный ряд тёмных пикселей, какого не бывает в строке текста.
Найденный прямоугольник закрашивается построчно цветом стены слева и справа от
него, поэтому шва на границе не остаётся.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'original'
OUT = ROOT / 'rsya'
OUT.mkdir(exist_ok=True)

NAMES = {
    'src-01.png': '01-chitaete-bolshe',
    'src-02.png': '02-lyubite-horoshie-mysli',
    'src-03.png': '03-sredi-svoih',
    'src-04.png': '04-chtenie-nachalo',
    'src-05.png': '05-menshe-shuma',
}

DARK = 300          # сумма RGB, ниже которой пиксель считается тёмным
MIN_RUN = 250       # длина непрерывного тёмного ряда, выдающая плашку
PAD = 6


def find_pill(im):
    """Прямоугольник плашки или None, если её на макете нет."""
    px = im.load()
    rows = {}
    for y in range(int(im.height * 0.25), int(im.height * 0.65)):
        run = cur = 0
        start = best_start = None
        for x in range(20, int(im.width * 0.72)):
            if sum(px[x, y]) < DARK:
                cur += 1
                if cur == 1:
                    start = x
                if cur > run:
                    run, best_start = cur, start
            else:
                cur = 0
        if run > MIN_RUN:
            rows[y] = (best_start, best_start + run)
    if not rows:
        return None
    ys = sorted(rows)
    return (min(v[0] for v in rows.values()) - PAD, ys[0] - PAD,
            max(v[1] for v in rows.values()) + PAD, ys[-1] + PAD)


def col_colour(im, x, y0, y1):
    return im.crop((x, y0, x + 1, y1)).resize((1, 1), Image.BOX).getpixel((0, 0))


def grow_box(im, box, limit=26, dev=16, run_needed=180):
    """Расширяет прямоугольник на светлую кромку и тень плашки.

    Тёмное ядро кнопки находится по порогу, но у неё есть светлый ободок и
    мягкая тень: если их не захватить, на месте кнопки остаётся тонкая полоса.
    Строка считается частью кнопки, пока в ней много пикселей, отличающихся от
    фона этой же строки.
    """
    px = im.load()
    left, top, right, bottom = box
    for direction, limit_y in ((-1, top), (1, bottom)):
        y = limit_y
        for _ in range(limit):
            y += direction
            if not (0 <= y < im.height):
                break
            bg = col_colour(im, (left + right) // 2, max(0, box[1] - 30), max(1, box[1] - 20))
            off = sum(1 for x in range(left, min(right, im.width))
                      if sum(abs(a - b) for a, b in zip(px[x, y], bg)) > dev * 3)
            if off < run_needed:
                break
            if direction < 0:
                top = y
            else:
                bottom = y
    return (left, top, right, bottom)


def row_colour(im, x0, x1, y):
    return im.crop((x0, y, x1, y + 1)).resize((1, 1), Image.BOX).getpixel((0, 0))


def wipe(im, box, margin=12, span=10):
    """Закрашивает плашку стеной, взятой по столбцам сверху и снизу от неё.

    Именно по столбцам, а не по строкам: сбоку от кнопки в кадре может стоять
    предмет — лампа, книги, кружка, — и боковая проба тогда красит прямоугольник
    чужим цветом. Сверху над кнопкой всегда стена. Если проба снизу отличается от
    верхней, значит там предмет, и берётся только верхняя.
    """
    out = im.copy()
    left, top, right, bottom = box
    ty0, ty1 = max(0, top - margin - span), max(1, top - margin)
    by0, by1 = min(out.height - 1, bottom + margin), min(out.height, bottom + margin + span)
    height = bottom - top
    for x in range(max(0, left), min(right, out.width)):
        tc = col_colour(out, x, ty0, ty1)
        bc = col_colour(out, x, by0, by1) if by1 > by0 else tc
        if sum(abs(a - b) for a, b in zip(tc, bc)) > 40:
            bc = tc                        # снизу предмет, а не стена
        for y in range(max(0, top), min(bottom, out.height)):
            t = (y - top) / max(1, height - 1)
            out.putpixel((x, y), tuple(round(tc[i] + (bc[i] - tc[i]) * t) for i in range(3)))
    return smooth(out, box)


def smooth(im, box, pad=18, radius=14):
    """Размывает заплатку и её края.

    Стена в кадре снята с мягкими тенями, и заливка по столбцам оставляет едва
    заметные вертикальные полосы. Размытие внутри заплатки убирает их и делает
    переход к нетронутой стене незаметным; сама стена деталей не теряет, потому
    что их там нет.
    """
    left, top, right, bottom = box
    area = (max(0, left - pad), max(0, top - pad),
            min(im.width, right + pad), min(im.height, bottom + pad))
    patch = im.crop(area).filter(ImageFilter.GaussianBlur(radius))
    mask = Image.new('L', (area[2] - area[0], area[3] - area[1]), 0)
    ImageDraw.Draw(mask).rectangle(
        (left - area[0] - 4, top - area[1] - 4, right - area[0] + 3, bottom - area[1] + 3), fill=255)
    im.paste(patch, area[:2], mask.filter(ImageFilter.GaussianBlur(7)))
    return im


for filename, name in sorted(NAMES.items()):
    im = Image.open(SRC / filename).convert('RGB')
    box = find_pill(im)
    box = grow_box(im, box) if box else None
    cleaned = wipe(im, box) if box else im
    out = OUT / f'{name}-{im.width}x{im.height}.jpg'
    cleaned.save(out, 'JPEG', quality=92, optimize=True, progressive=True)
    kb = out.stat().st_size // 1024
    print(f"{out.name}: плашка {box if box else 'не найдена'}, {kb} КБ")
