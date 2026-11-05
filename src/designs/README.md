# Building designs

Each design is data: one TypeScript file per building, from which the site draws the floor plans, computes the facts and writes the render export. Move a wall in the data and the plan, the facts and the export all follow.

| File | What it holds |
|---|---|
| `1-kanal.ts`, `2-kanal.ts` | The designs |
| `sources.ts` | The list of designs, in site order |
| `model.ts` | The data model (zod schema), including the material and room type vocabularies |
| `helpers.ts` | Authoring helpers: grid references, walls, chains, doors, windows, rooms, levels |
| `geometry.ts` | Shared geometry: wall joins and splits, room areas, slabs, columns, stairs |
| `validate.ts` | Geometric rules (errors fail the build) and minimum room sizes (warnings) |
| `facts.ts` | Derived facts: covered area, bedrooms, bathrooms, porch cars, roof features |
| `plan.ts`, `plan-file.ts` | Floor plan SVGs, inline and full size |
| `export.ts` | The render export and its schema |

## Units and coordinates

Feet throughout. The origin is the plot's front-left corner as seen from the street; x runs along the street, y into the plot and z up from road level. Walls are drawn on their centrelines, and room outlines on wall centrelines. Lengths are shown as feet and inches, e.g. `16'-6"`.

## Adding or changing a design

1. Edit or add `src/designs/<slug>.ts` (and list a new one in `sources.ts`).
2. `npm test` checks the model, the geometric rules, each design's program and the plans.
3. `npm run build` validates again and fails with the design, level and element of any broken rule.
4. `npm run designs:export` rewrites `render/data/`. Commit it: the render pipeline reads these files without Node, and `npm test` fails while they are out of date.
5. Check the drawings at `/plans-preview/` (`npm run dev`), or print the A3 review sheet with `npm run designs:review`.

A new kind of building (an apartment block, say) needs no model changes: `kind` is free text and the room, fixture and material vocabularies are shared.

## Render export

`render/data/<slug>.json` follows `render/data/schema.json` (JSON Schema 2020-12). Every file carries `schemaVersion`; an incompatible format change raises `SCHEMA_VERSION` in `export.ts`, and the renderer refuses other versions.

Everything is resolved so the renderer only extrudes boxes and polygons:

- walls are split into solid, sill and lintel pieces around openings, with absolute bottoms and tops;
- openings give the hole each leaves, with hinge side and swing for doors;
- slabs are polygons with holes, voids already cut;
- columns, stair treads and landings, parapet and railing pieces, tanks, boundary wall pieces and gates are boxes;
- facade boxes have absolute heights;
- `facts` repeats the derived facts.

Key order follows the schema and numbers are kept to four decimal places, so an unchanged design always exports the same bytes. The ground floor slab sits at plinth level; filling the plinth down to the ground is left to the renderer.

## Approval

The plans must be approved by the maintainer before the `render-pipeline` change begins.

| Date | Reviewer | Sheet | Outcome |
|---|---|---|---|
| 2026-10-27 | Maintainer | `review/plans-review.pdf` (15 pages, all levels of all three designs) | Approved without changes |
