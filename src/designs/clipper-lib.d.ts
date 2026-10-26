// Minimal typings for the parts of clipper-lib that src/designs/geometry.ts uses
declare module "clipper-lib" {
  interface IntPoint {
    X: number;
    Y: number;
  }
  type Path = IntPoint[];
  type Paths = Path[];

  const ClipperLib: {
    Clipper: {
      new (): {
        AddPaths(paths: Paths, polyType: number, closed: boolean): void;
        Execute(clipType: number, solution: Paths, subjFill: number, clipFill: number): boolean;
      };
      Area(path: Path): number;
      Orientation(path: Path): boolean;
      CleanPolygons(paths: Paths, distance: number): void;
    };
    ClipperOffset: new (miterLimit: number, arcTolerance: number) => {
      AddPaths(paths: Paths, joinType: number, endType: number): void;
      Execute(solution: Paths, delta: number): void;
    };
    Paths: new () => Paths;
    ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
    PolyType: { ptSubject: number; ptClip: number };
    PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
    JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
    EndType: { etClosedPolygon: number; etClosedLine: number; etOpenButt: number; etOpenSquare: number; etOpenRound: number };
  };
  export default ClipperLib;
}
