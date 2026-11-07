# FLUX prompts for the delivered hero videos

Model: `black-forest-labs/flux-video-edit`, through OpenRouter's `POST /api/v1/videos`, with the rendered clip as a `video_url` entry in `input_references`. The model has no seed, so running these again gives a different video. Output: 960×512 and 512×960.

## Landscape

```text
Turn this CG construction timelapse of a modern two-storey house into realistic photographic footage. This is a strict material and lighting upgrade, not a redesign: every shape, edge, colour and position stays as in the source video, frame for frame, with the same camera, the same timing and no cuts. Every part appears at the same moment as in the source, and no slab appears before its columns.
Opening: dark blue-hour light, plain bare earth with no pattern, and thin warm golden glowing plan lines. Then clear daylight on plain tan bare earth. Neighbouring houses stay plain and pale. Ground slabs are grey concrete, brick is red-orange, porch columns are black.
Finished house, exactly as in the source, from the moment each finish appears:
Top roof band: dark charcoal, with a wood soffit and small downlights.
Upper left, behind the glass terrace over the car porch: a solid wall of vertical warm wood slats with one plain grey panel, a thin dark floating ledge with small warm lights under it, and at its left end a charcoal pier with two white vertical light lines.
Centre: a tall dark grey granite panelled pier with white vertical light lines along both edges. Beside it, a pale stone wall with two small wall lights and a tall brown wood front door with a dark metal band.
Car porch: white slab edge, two black columns, a large polished brown marble gate with gold veining at the left, and a back wall of tan square tiles.
Right side: walls are taupe-grey plaster. Terrace railings are grey-green glass. The large upper and lower windows have thin dark frames and glow warm cream from inside. Two wall lights beside the lower window.
Front: low white kerb, green lawn bed, small shrubs, one slim tree. Left boundary wall is smooth pale grey-mauve plaster. Grey paved road, and the same empty street behind the house.
Ending: dusk with a darkening mauve-grey cloudy sky, with all facade lights glowing warm. Add nothing that is not in the source.
```

## Portrait

```text
Turn this CG construction timelapse of a modern two-storey house into realistic photographic footage, with the same camera, the same timing and no cuts. Keep every shape, edge and position of the source, and use exactly this look for each stage.
Opening: dark blue-hour light, dark plain ground, thin warm golden glowing plan lines, plain blue-grey neighbouring houses.
Daylight stages: bare brown earth with sparse green weeds, plain cream neighbouring houses with small dark windows, bright green trees, a soft hazy sky. Foundation and floor slabs are smooth pale grey-white concrete. Columns are black.
Structure and walls: smooth flat orange walls between the black columns and pale slabs. As the walls finish, the ground floor at the front is clad in dark speckled stone, followed by the upper finishes.
Light turns warm and dim as the finishes complete, ending at dusk with a pink-peach sky and soft dark clouds.
Finished house: top roof band dark charcoal, wood soffit with small downlights. Upper left, behind the terrace over the car porch: dark wood vertical slats with one tall glowing glass panel near the middle, a thin dark floating ledge with small warm lights under it, and at the left end a charcoal pier with two warm gold vertical light lines. Dark green-grey glass railings on both terraces. Centre: a tall dark speckled stone pier with warm gold light lines along both edges. Beside it a pale wall with small wall lights and a tall brown wood front door with a dark metal band. Car porch: white slab edge, two black columns, a large marble gate with gold veining glowing warm at the left, and a back wall of warm tan square tiles. Right side: upper wall grey plaster, ground-floor wall dark speckled stone. Large windows with thin dark frames show warm softly lit interiors. Two wall lights beside the lower window. Front: low white kerb, dark green lawn bed, small shrubs with soft warm uplights, one slim dark tree, warm light on the driveway. Plain pale boundary wall at the left. Add nothing else.
```

## Landscape upscale

Model: `black-forest-labs/flux-video-upscale`, with the approved landscape run as the `video_url` reference, `upscale_factor: 2` and `creativity: 0`. Output: 1920×1024.

```text
Upscale this clip. Keep every shape, colour, material, light, frame and camera move exactly as in the source. Only increase resolution and fine detail. Add nothing.
```
