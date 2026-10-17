# Vehicle realism (v39, handling v41)

Player-facing description. Technical detail: `AUDIT_REPORT.md`, `DAMAGE_AND_TIRE_WEAR_REPORT.md`, `CAR_ASSETS_AND_SPECS.md`; numbers per car:
`manifest/cars.json` (damage profile) and `manifest/car_powertrain.json` (handling).

## Handling (key **H**)

| | Arcade (default) | Realistic |
|---|---|---|
| Driving | exactly as before | engine torque curve, automatic gearbox (1–7 gears; EVs single-speed), traction limit with weight transfer, drag, rolling resistance, engine braking |
| Drive layout | same feel for all | rear-drive cars can spin up and oversteer under power; front-drive cars understeer when the fronts spin; AWD launches cleanly |
| Speed bumps | small hop | the suspension soaks them up; only a limited hop when you take them too fast |
| Body motion | simple lean | spring-damper pitch, roll and heave, softer for SUVs and pickups, stiff for race cars |
| HUD | speed | speed + gear + rpm (+ "wheelspin") |

Each car is calibrated so it still reaches the top speed and 0–100 time the game already listed for it. Torque, gearing, tyre grip and spring
rates are **estimates** built from that, not manufacturer data. The diagnostics panel (O) shows the numbers for the current car. Keyboard, touch
pads and the G29 wheel work in both modes (analog throttle and brake are used as-is).

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
- The tyre model estimates slip from the car's motion. It is not a full tyre simulation (no Pacejka curves, no wheel rotation state), and
  with damage Off and Arcade handling the original physics is used unchanged.
- Realistic handling has no clutch, no manual gearbox, no differential model, no EV regenerative braking and no per-wheel suspension
  geometry; the body springs are visual plus the bump hop.
- Speed bumps: 2 are mapped in OpenStreetMap and placed as real; the other 88 are **estimated** positions near mapped schools, clinics and parks.
