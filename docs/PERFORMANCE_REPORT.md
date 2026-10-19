# Performance report (v47, 2026-10-19)

## What can and cannot be measured here

All numbers below come from **Playwright Chromium with SwiftShader (software GL) on this Windows PC**. The CPU does the rasterising, so the
cost scales with pixels and draw calls, which makes it good for **comparing presets**. It is **not** a frame time on any real graphics
card. The owner's RTX 3050 at 1080p has not been measured; earlier reports (`V45_REPORT.md`) describe the same limit.
Reproduce with `python tests/perf_v47_pw.py dist/irbid-drive.html`; it prints one JSON line and a table.

## Graphics presets: render cost per frame (start view, 12 frames after 3 warm-up frames, two runs)

| Preset | Render buffer | Post chain (HDR, bloom, grade) | ms per frame (run 1 / run 2) | vs Auto | Draw calls | Triangles |
|---|---|---|---|---|---|---|
| Low | 1280x720 | off (CSS grade) | 575 / 602 | **0.40–0.43×** | 908 / 979 | 242k / 247k |
| Auto (= High) | 1920x1080 | on | 1335 / 1509 | 1× | 973 / 1044 | 254k / 261k |
| Ultra | 2560x1440 | on, supersampled | 2179 / 2465 | **1.63×** | 1038 / 1109 | 298k / 305k |

Medium (no bloom, 2048 shadow map) was not timed in this run. Draw-call counts vary between runs because random traffic is in view.
Low also shortens the detail range to 0.7× (fewer props drawn); Ultra extends it to 1.3×. On a GPU the pixel share of the cost is smaller
than in software, so the real gap between presets will be smaller than this table shows; it depends on the device.

## Traffic density: CPU cost of the traffic simulation (`updTraffic` for every car, 300 steps of 1/60 s, two runs)

| Density | Cars simulated | ms per step |
|---|---|---|
| High (v46 default) | 80 | 0.236 / 0.294 |
| Low | 28 | 0.128 / 0.120 |

Parked cars cost nothing: they are hidden, not updated, and moved 200 km away, so the distance checks skip them. Traffic AI is a small share of
the frame either way. Low density mainly helps by drawing fewer cars and running fewer collision checks.

## Earlier measurements (unchanged in v47)

`V45_REPORT.md`: game logic about 1.7–1.9 ms of CPU per frame with 80 cars. Real-GPU frame rates are still unverified.

## Rules that keep it fast (`CLAUDE.md` constraint 9)

No per-frame allocation; nothing per frame that grows with the number of places; props go through chunked `InstancedMesh` with LOD radii; merged
road meshes; one shared engine voice for traffic; `lodTick` only after 3 m of camera travel; the adaptive drop in Auto (bloom off, then post off
when frames stay slow).
