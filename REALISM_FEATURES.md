# Vehicle realism (v39)

Player-facing description. Technical detail: `AUDIT_REPORT.md`; numbers per car: `manifest/cars.json`.

## Damage modes (key **I** or the Damage button)

| | Off (default) | Cosmetic | Full |
|---|---|---|---|
| Dents, scuffs, broken lights, cracked glass | – | yes | yes |
| Tyre wear and temperature tracked | – | yes | yes |
| Burnouts (throttle + brake at a standstill) | – | yes | yes |
| Signs / poles bend or break, dumpsters move | – | yes | yes |
| Engine, cooling, gearbox, steering, brakes, suspension, alignment | – | – | yes |
| Worn / hot / punctured tyres lose grip | – | – | yes |
| Driving physics | identical to earlier versions | identical | changes with damage |

Each car keeps its own damage. Switching cars never moves damage from one car to another. Everything is saved in the browser
(`irbid-drive-realism-v1`); older saves are converted automatically.

## Where you hit matters

The game finds the point on your car's outline that touched the obstacle and the speed along the direction of the hit (a glancing
scrape counts far less than a head-on hit). That decides:
- **which body area** is damaged (front-left, front-right, left side, right side, rear-left, rear-right, plus underbody from landings),
  and the dent appears there on the car;
- **which light** breaks (only the one on that side) and **which glass** cracks (windscreen, rear screen, or that side's windows);
- **what is inside** that area. A front hit can reach the radiator and, if deep, a front engine. A rear hit damages a rear- or
  mid-engined car's engine (for example the Porsche 911). A hit near a wheel can puncture that tyre, bend that corner's suspension
  and knock the alignment out, so the car pulls.

Low-speed touches do almost nothing. Damage grows with speed, and another car absorbs part of the energy, so it hurts less than a wall.
Every car has its own strength profile: pickups and SUVs shrug off more, race cars and supercars crumple sooner.

## Tyres

Each of the four tyres has its own tread, carcass, temperature and load. Wear comes from what that tyre actually does:
- **Burnout:** only the driven wheels spin. A powerful rear-drive car burns out on the foot brake; a front-drive car needs
  throttle + handbrake; all-wheel-drive and low-power cars mostly can't. A long burnout wears much more than a short one.
- **Drifting:** the loaded outside rear tyre heats and wears most.
- **Ordinary driving:** almost no wear.
- Worn tyres (below half tread), overheated tyres (above 110 °C) and damaged carcasses lose grip progressively in Full mode.
  A **punctured** tyre is far worse: little grip, the car pulls to that side, shakes, and top speed is limited.

## Diagnostics (key **O**)

Body map, every component with its condition, how it affects the car, a card per wheel, recent impacts, and free
**Repair all** / **Replace tyres** buttons. Warning lights for engine temperature, punctures, worn tyres, brakes and steering show under
the Damage button in Full mode.

## Honest limits

- Masses, drive layouts, strengths and thresholds are **gameplay estimates**. Drive layouts follow what is commonly published for each
  model name; some names cover several versions. There is no manufacturer crash-test data.
- The cars are simple procedural shapes, not exact 3D models, so dents deform that shape. Panels do not fall off.
- The tyre model estimates slip from the car's motion. It is not a full tyre simulation, and with damage Off the original
  handling is used unchanged.
- The speed bumps are **estimated** positions near mapped schools, clinics and parks (OSM has no traffic-calming data here).
