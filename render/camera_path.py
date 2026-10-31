"""Camera continuity check for keyed sequences (no Blender needed):

    python render/camera_path.py 1-kanal-hero-landscape 1-kanal-hero-portrait [--svg out.svg]

For each sequence, prints per-frame camera displacement (m/frame) and view-direction
rotation (degrees/frame), the largest frame-to-frame change in each (a spike shows
up as a large jump there), and the values around each phase boundary. With --svg it
writes a small-multiples chart: one row per measure, one column per sequence, phase
boundaries as grey rules.
"""

import math
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
for name in ("bpy", "mathutils"):  # shots.py imports them for the Blender-only helpers
    sys.modules.setdefault(name, types.ModuleType(name))
sys.modules["mathutils"].Vector = None

from noor_render.shots import load_sequence  # noqa: E402


def sub(a, b):
    return [x - y for x, y in zip(a, b)]


def norm(v):
    return math.sqrt(sum(x * x for x in v))


def series(name):
    seq = load_sequence(name)
    shots = [seq.shot(f) for f in range(seq.frames)]
    move, turn = [], []
    for a, b in zip(shots, shots[1:]):
        move.append(norm(sub(b["position"], a["position"])))
        da, db = sub(a["target"], a["position"]), sub(b["target"], b["position"])
        cos = sum(x * y for x, y in zip(da, db)) / (norm(da) * norm(db))
        turn.append(math.degrees(math.acos(max(-1.0, min(1.0, cos)))))
    return seq, move, turn


def report(name, seq, move, turn):
    print(f"\n{name}: {seq.frames} frames, path length {sum(move):.1f} m, total rotation {sum(turn):.1f} deg")
    for label, vals, unit in (("displacement", move, "m"), ("rotation", turn, "deg")):
        jumps = [abs(b - a) for a, b in zip(vals, vals[1:])]
        k = max(range(len(jumps)), key=jumps.__getitem__)
        print(f"  {label}: max {max(vals):.4f} {unit}/frame, largest frame-to-frame change {jumps[k]:.4f} "
              f"at {k + 1}->{k + 2} ({jumps[k] / max(vals) * 100:.1f}% of max)")
    print("  around phase boundaries (step f-1->f, f->f+1):")
    for b in range(seq.phase_frames, seq.frames, seq.phase_frames):
        print(f"    {b:3d}: move {move[b - 1]:.4f} {move[b]:.4f}  turn {turn[b - 1]:.4f} {turn[b]:.4f}")


def svg(results, path):
    pw, ph, ml, mr, mt, mb, gap = 520, 200, 56, 16, 40, 34, 28
    cols, rows = len(results), 2
    W = ml + cols * pw + (cols - 1) * gap + mr
    H = mt + rows * (ph + mb + mt) - mt + 20
    ink, muted, grid, line = "#1c1c1b", "#6b6963", "#d9d6cf", "#2a6fdb"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="Segoe UI, Arial, sans-serif">',
           f'<rect width="{W}" height="{H}" fill="#ffffff"/>']
    measures = (("Camera displacement (m per frame)", 1), ("View rotation (degrees per frame)", 2))
    for r, (title, idx) in enumerate(measures):
        ymax = max(max(res[idx]) for res in results) * 1.1
        for c, res in enumerate(results):
            name, seq, vals = res[0], res[0 + 3], res[idx]
            x0 = ml + c * (pw + gap)
            y0 = mt + r * (ph + mb + mt)
            n = len(vals)
            X = lambda i: x0 + i / (n - 1) * pw  # noqa: E731
            Y = lambda v: y0 + ph - v / ymax * ph  # noqa: E731
            out.append(f'<text x="{x0}" y="{y0 - 12}" font-size="13" fill="{ink}" font-weight="600">{name} — {title}</text>')
            for t in range(5):
                v = ymax * t / 4
                out.append(f'<line x1="{x0}" x2="{x0 + pw}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" stroke="{grid}" stroke-width="1"/>')
                out.append(f'<text x="{x0 - 6}" y="{Y(v) + 4:.1f}" font-size="10" fill="{muted}" text-anchor="end">{v:.2f}</text>')
            for b in range(seq.phase_frames, seq.frames, seq.phase_frames):
                out.append(f'<line x1="{X(b - 0.5):.1f}" x2="{X(b - 0.5):.1f}" y1="{y0}" y2="{y0 + ph}" stroke="{muted}" stroke-width="1" stroke-dasharray="3 3"/>')
                out.append(f'<text x="{X(b - 0.5):.1f}" y="{y0 + ph + 14}" font-size="10" fill="{muted}" text-anchor="middle">{b}</text>')
            pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals))
            out.append(f'<polyline points="{pts}" fill="none" stroke="{line}" stroke-width="2" stroke-linejoin="round"/>')
            out.append(f'<text x="{x0 + pw}" y="{y0 + ph + 28}" font-size="10" fill="{muted}" text-anchor="end">frame step (dashed: phase boundaries)</text>')
    out.append("</svg>")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"\nwrote {path}")


def main(argv):
    out = None
    if "--svg" in argv:
        i = argv.index("--svg")
        out = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    results = []
    for name in argv or ["1-kanal-hero-landscape", "1-kanal-hero-portrait"]:
        seq, move, turn = series(name)
        report(name, seq, move, turn)
        results.append((name, move, turn, seq))
    if out:
        svg(results, out)


if __name__ == "__main__":
    main(sys.argv[1:])
