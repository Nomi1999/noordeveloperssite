## Context

See proposal.md for motivation. The 2 Kanal is data in `src/designs/2-kanal.ts`, with almost every exterior surface falling back to the schema's `plaster-white` default. The 1 Kanal's finishes are built with helpers, some shared in `helpers.ts` and some private to `1-kanal.ts`. The material library already has everything needed.

The approved stills come from an AI restyle, which keeps what its prompt names and invents what it doesn't, so its notes matter as much as the geometry.

## Goals / Non-Goals

**Goals:**
- Reach the 1 Kanal's richness of materials using the same library and the same construction techniques.
- Make the design data the only source of the terrace railing.

**Non-Goals:**
- New materials, textures or renderer features.
- Copying the 1 Kanal's composition, or changing the 2 Kanal's rooms or cameras.
- Cycles finals: the fast path is what the 1 Kanal and both Marla houses use.

## Decisions

### Finishes are facade panels, as on the 1 Kanal
Base wall materials give the plain areas (sand plaster, charcoal parapets, a travertine guard room). Detailed areas are panels on top, holed around openings. Windows and doors stay where they are, so plans and room facts are unaffected. *Alternative:* setting wall materials alone can't do tile joints, slats or partial-height changes.

| Part | Finish |
|---|---|
| Bedroom box, front and left wrap | Charcoal with LED lines; black metal fins |
| Drawing room front under the box | Travertine, wall lights, timber soffit with downlights |
| Pier and the wall above the entrance | Grey stone tile with joints and LED lines, past the roofline |
| Entrance | Beige tile, over the door too, wall lights |
| Porch back wall | Travertine |
| Porch | Deep charcoal beam, granite columns at the front corners |
| Terrace back wall | Travertine; two potted palms on the terrace |
| Roof over the terrace | Charcoal fascia overhang, timber soffit, wash lights |
| Lounge window wall | Stone-tile surround, black metal fins |
| Right side | Travertine, then a stone mass with LED lines, then sand plaster |
| Other walls; parapets, stair room and tanks | Sand plaster; charcoal |
| Guard room | Travertine with a charcoal cap |

### The boundary uses a low base with panels, and gates get their own height
The wall's structure drops to a 1.1 ft white base, with panels standing inside its thickness up to 7 ft. Panels can't sit on the outer face of a full-height wall, because the plot line is there and they would fall outside the plot. A closed gate takes its top from the boundary height, so it needs an optional `height`: the smallest change that keeps the closed 7 ft gate the maintainer chose. *Alternatives:* an open entrance like the 1 Kanal's (declined by the maintainer) or panels without a base (loses the white line that ties the wall together).

Thickness stays 0.75 ft, because the lawn and paving outlines start at that line.

The renderer adds stone posts at each end of a closed gate. These are sized in metres, 1'-2" across and centred on the wall, so they poked out of the granite piers in the first preview. A gate can therefore declare `posts: false`, and `site.py` skips the posts for it. Other designs' exports are unchanged. The piers overlap the leaf's ends, and the pedestrian gate widens to 5 ft for a clear opening of about 3'-8".

### Columns are flush with the walls and kept out of openings
At the maintainer's report, column D1 at x=56 ran through the porch's dining window and the terrace's sliding door. A check of every opening found the same fault at A3 (the lounge glass), A5 (a first-floor bedroom window), B6 (the store window) and C4 (the stair room door), so all five are omitted. The columns were also 1'-6" deep in a 9" wall, so they stood out as pilasters that would break through the cladding. They become 9" × 9", as on the 1 Kanal. The grid beams between columns sit under the slab, above the window heads, and the beam along the lounge's window wall falls inside the double-height void, so it isn't drawn. *Alternative:* moving the openings would change the elevations and plans.

### Revisions after the first review
After seeing the first sources and stills, the maintainer asked for these changes:
- black metal fins on both faces
- travertine only, behind the porch and the terrace, in place of the bronze tile, bronze marble and timber slats
- a charcoal porch beam in place of white
- beige tile over the front door in place of timber slats
- a black pedestrian gate
- a front boundary of grey stone throughout, with no timber slats, hoods, bronze plate or charcoal strip, and two extra wall lights to replace the slats' light
- two potted palms on the terrace

The white base and its coping stood a little proud of the granite piers' faces, so each gate now spans from pier to pier. The base then stops at the piers' outer faces, and the openings meet inside the middle pier, because the renderer insets each leaf 8" from its ends. A pier can't stand forward of the plot line, because the design checker refuses it.

The shaded porch wall renders much darker than the sunlit terrace wall, so the prompts say that both are the same travertine and that shade only darkens it a little. The model redrew the angled `front-dusk` view as a frontal one on all ten attempts, likely because a blank neighbouring wall filled a third of the frame. That camera now looks at the front from a little right of centre. A `street-open` shot uses the street camera without the front boundary. Hiding an edge's boundary now also drops that edge's gates. The 1 Kanal's renders are unaffected, because its gates on hidden edges are already open.

### More planting moves
`palm-1` and `palm-2` stood right in front of the lawn-side wall in the lead view, so they move towards the far side of the lawn.

### Share the helpers, keeping the 1 Kanal byte-identical
The face, hole, box, stone tile, downlight and boundary run helpers move into `helpers.ts`, parameterised by plinth height and plot edges (the 2 Kanal's plinth is 2 ft, the 1 Kanal's 1.5 ft). A byte-identical `render/data/1-kanal.json` proves the move changed nothing. *Alternative:* copying about 60 lines into `2-kanal.ts` would leave two copies to keep in step.

### The railing is geometry, and its AI edit goes
The railing's path runs from the bedroom box's side wall along the left edge, across the front and back along the right to the house wall. The `2-kanal` entry in `DESIGN_EDITS` goes, because it often failed: the current aerial still shows the side open. Each shot's note names the glass on all three sides, so the restyle keeps it.

### Fast sources, with the 1 Kanal's lighting
`2-kanal` leaves `CYCLES_FINAL`, so its sources are EEVEE previews. Its shots take the 1 Kanal's exposure, look, dusk tint and backplate values, because the defaults were set for white walls. A `2-kanal` dusk override allows the new lights, because the default dusk note forbids exterior lights.

### `tree-2` moves off the drawing room front
It would hide the new finishes in the lead image. Low shrubs go behind the lattice. Lawn area doesn't change, because its outline stays the same.

## Risks / Trade-offs

- [The closed gate still hides the lower ground floor in the street and dusk shots] → Accepted by the maintainer. Those shots rely on the upper floor, the top of the porch and the boundary wall.
- [More lights make an EEVEE dusk hang more likely] → Every render runs under `timeout`. If needed, cap room-light reach with `light.roomReach`.
- [The restyle may redraw materials or lose details] → Per-shot notes naming only what each shot sees, `--attempts 5`, and side-by-side review.
- [Charcoal and timber overlap the 10 Marla's palette] → Review all four lead stills side by side against the distinct-facades requirement.
