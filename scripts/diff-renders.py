"""Compare two renders of the same view: how many pixels differ, and by how much.

    python scripts/diff-renders.py <before.png> <after.png> [--tolerance 1]

Cycles on a GPU is not bit-identical from run to run, so the regression gate is a tolerance (the add-1-kanal-walkthrough
change measured about 1,100 pixels differing by one level between two renders of the same code). Exit 1 when any pixel
differs by more than the tolerance.
"""
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    tol = int(argv[argv.index("--tolerance") + 1]) if "--tolerance" in argv else 1
    a = np.asarray(Image.open(argv[0]).convert("RGB"), dtype=np.int16)
    b = np.asarray(Image.open(argv[1]).convert("RGB"), dtype=np.int16)
    if a.shape != b.shape:
        print(f"different sizes: {a.shape} vs {b.shape}")
        return 1
    d = np.abs(a - b).max(axis=2)
    over = int((d > tol).sum())
    print(f"{argv[0]} vs {argv[1]}: {int((d > 0).sum())} pixels differ, max {int(d.max())} levels, "
          f"{over} beyond the tolerance of {tol}")
    return 1 if over else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
