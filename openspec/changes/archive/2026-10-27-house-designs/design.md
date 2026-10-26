## Context

Three consumers need the same buildings:
- floor plans (Astro, build time, TypeScript);
- the Blender render pipeline (Python, headless);
- the construction-phase animation, which needs structure (columns, beams, slabs), not just room outlines.

See proposal.md for motivation and specs/ for requirements. Plots: 1 Kanal 50′×90′, 2 Kanal 75′×120′ (225 sq ft marla), commercial 50′×90′.

## Goals / Non-Goals

**Goals:**
- A model that is easy to write by hand and rich enough for a convincing exterior render.
- Geometry reasoning (splitting walls at openings, areas, validation) done once, in TypeScript.

**Non-Goals:**
- Construction-grade drawings: no structural design, MEP layouts, sections or elevations as drawings.
- Interiors beyond what an exterior render glimpses through windows, and what a plan shows as fixtures.
- Regulatory compliance modelling. Setbacks are chosen for good design, not cited.

## Decisions

### TypeScript + zod model, JSON export for Python
Designs are `.ts` files (`src/designs/<slug>.ts`) typed by a zod schema (`src/designs/model.ts`). TypeScript gives autocomplete and refactoring while authoring. zod gives runtime validation and a JSON Schema export (`render/data/schema.json`) the Python side can check against.
*Alternatives:* YAML/JSON authored directly, which lacks types, helpers and computed values like grid references; or a Python model, which would put plans in Python and split the logic.

### Grid-first authoring
Each design declares structural grid lines (`grid.x = [0, 14, 28, ...]`, `grid.y = [...]`) and helper functions place walls and columns on grid references (`wall(g('A',1), g('A',4), 9/12)`). Columns sit at grid intersections inside each level's footprint. This mirrors how RCC frame houses are actually laid out, keeps walls aligned between levels, and gives the hero's structure phase a real column-and-beam frame.

### Pre-resolved geometry
`src/designs/geometry.ts` computes, per level:
- wall segments split at openings (solid pieces, plus lintel and sill pieces for windows);
- room areas and bounding dimensions;
- slab polygons minus voids;
- covered area.

Floor plans and the export both use these results, so the renderer only extrudes the given boxes.

### Material tag vocabulary
A fixed enum is shared with the renderer: `plaster-white`, `plaster-warm-grey`, `stone-cladding`, `wood-panel`, `exposed-concrete`, `metal-dark`, `glass-clear`, `glass-tinted`, `porcelain-paving`, `brick-structure`, `paving-stone`, `grass`, `planter-soil`. The model only names materials, and the renderer owns their look.

### Design briefs (starting point, refined in review)
- **1 Kanal** (50′×90′):
  - Ground: front lawn and a 2-car porch with a cantilevered canopy on one side, entrance foyer, drawing room with a guest bathroom, dining, TV lounge, main kitchen plus back kitchen, one bedroom with attached bath (for elders), servant room with bath at the rear, and a dog-leg stair.
  - First: 4 bedrooms with attached baths (master with dressing), a family lounge, and a front terrace over the porch.
  - Roof: stair room (mumty), water tanks, parapet.
  - Facade: stacked offset boxes, a stone-clad vertical element, wood-panel soffits, slender metal fins over the first-floor glazing, and a deep slab overhang over the porch.
- **2 Kanal** (75′×120′):
  - Same language, wider.
  - Ground: 2 bedrooms, formal drawing and dining, a double-height lounge with a full-height window wall to the side lawn, kitchen plus back kitchen, a 3-car porch, servant quarter, and a guard room by the gate.
  - First: 4+ bedrooms and a family lounge overlooking the double-height void.
- **Commercial plaza** (50′×90′):
  - Ground: 3–4 shops with full-height glazed frontage behind a slim canopy band.
  - Floors 1–3: open-plan offices with a curtain-wall street facade framed by a thick exposed-concrete border, and a core with stair, lift shaft and washrooms on every floor.
  - Roof: parapet, water tanks, lift machine room.

### Minimum room sizes (warnings, not errors)
| Room | Min (smaller side × area) |
|---|---|
| Master bedroom | 14′ × 224 sq ft |
| Bedroom | 12′ × 168 sq ft |
| Attached bathroom | 5′ × 40 sq ft |
| Kitchen | 9′ × 100 sq ft |
| Drawing / lounge | 14′ × 224 sq ft |
| Car porch, per car | 9′ wide × 18′ deep |
| Shop | 12′ frontage |

### Floor plan rendering
`FloorPlan.astro` takes `design`, `level` and `theme` and emits SVG with `viewBox` in feet (1 unit = 1 ft) for exact geometry.
- Line weights are set with `vector-effect: non-scaling-stroke`.
- Labels use the monospace face, positioned at each room's pole of inaccessibility (the point furthest from its walls, which handles L-shaped rooms better than the centroid).
- Dimension strings are drawn outside the footprint.
- Small screens: a wrapper with `min-width: 640px` inside an `overflow-x: auto` region with a fade-edge scroll hint, plus a "View full size" link to a standalone SVG emitted for each plan.
- Room schedule: `<table>` generated from the same data.

### Export
`npm run designs:export` writes `render/data/<slug>.json` with stable key order and fixed number precision, so output is reproducible, with `schemaVersion: 1`. The site build runs validation too, so an invalid design can never deploy.

## Risks / Trade-offs

- [Designing believable houses is architecture work, and an AI-drawn plan may have awkward circulation] → The review sheet goes to the maintainer (and ideally the client's developer) before rendering. Fixing a plan is cheap now and expensive after overnight renders.
- [The model grows too complex to author] → Grid helpers and sensible defaults (wall thickness 9″ exterior, 4.5″ interior; storey height 11′; slab 6″) keep design files readable.
- [Facade detail for photoreal renders exceeds what the model captures] → The facade-element list is open-ended (boxes, fins, panels, railings with material tags). Pure decoration can be added in the renderer, keyed by design slug, without touching floor-plan data.
- [Plans unreadable on phones] → Minimum drawing width with horizontal scroll, a full-size view, and the room schedule table.

## Open Questions

- Whether the client's developer wants to review the plans. This doesn't change the work. It only adds a reviewer at the approval checkpoint.
