# Damage and tyre-wear report (v41, 2026-10-17)

How vehicle damage, tyre wear and world-object damage work, which requirement each part covers, and the measured test results. The systems
were built in v39 (`07c_realism.js`, `07d_tyres.js`, `07e_objects.js`, `07f_diag.js`); v41 adds Realistic handling (`07g_drive.js`), which
feeds wheelspin and load into the same tyres. All strengths, thresholds and wear rates are **gameplay estimates**. There is no
manufacturer or crash-test data behind them.

## 1. Damage modes (key I)

| Mode | Visual damage | Mechanical effects | Physics |
|---|---|---|---|
| Off (default) | none recorded | none | identical to v38 (`tests/off_trace.js`, collider-free hash `b4f220ee…`) |
| Cosmetic | dents, scuffs, broken lights, cracked glass, tyre wear shown | none (all multipliers 1) | identical to Off except burnouts / object give-way |
| Full | as Cosmetic | engine, cooling, transmission, driveline, steering, brakes, per-corner suspension and alignment, tyres | progressive penalties |

Records are per car **name** (`irbid-drive-realism-v1`, schema v2; v38 records migrate). Switching cars never carries damage across.
**Repairs (v42)** are paid per part in the Apex Drift Customs repair bay (§10); repairing one part never touches another.

## 2. Per-car durability profile (`carSpec`, `manifest/cars.json`)

217 distinct profiles: estimated mass (body-type density × L × W × H), drivetrain (181 documented layouts, 36 estimates), engine position, crush
stiffness per face (Campbell linear crush model v = b0 + b1·C, coefficients by body type, scaled by durability), light/glass thresholds, component
durability (engine, cooling, transmission, driveline, steering, suspension) and tyre wear/heat factors.
Measured: the same 54 km/h wall hit costs an F-150 51.7, a Focus RS 72.5 and a Porsche 917 103.1 zone-% (`damage_test`).

## 3. Impact detection (no repeated damage)

`registerPlayerImpact(v, collider, nx, nz)` is called once per collision from `colB` (walls, poles, buildings) and from the traffic/bot
contact code. It uses:
- **contact point** on the car's outline (car frame) and the struck **face**;
- **relative normal speed** (the speed along the collision normal, so a glancing scrape counts far less), converted to an equivalent barrier
  speed for car-to-car hits (energy shared by the two masses);
- a **re-hit guard** (same spot within a short time is not counted again) and a minimum speed; landings and speed bumps have their own once-only
  logic (bump: armed/cooldown; landing: once per touchdown).

## 4. What is damaged

- **Zones** fl, fr, l, r, rl, rr, roof, underbody, with the crush depth spread around the contact point.
- **Mesh dents:** the player's body and glass are tessellated and vertices near the contact are pushed in (depth limited per face). Dented
  vertices stay where they were hit; the rest of the car is untouched (`damage_test`: front vertices moved up to 0.22 m, rear 0.000 m).
- **Lights:** only the light on the struck side breaks (material swap). **Glass:** windscreen, rear screen or that side's windows crack
  (crack decals). **Scuffs:** strips at the contact.
- **Internals by location:** a front hit reaches the radiator and, if deep, a front engine; a rear hit damages a rear/mid engine (911: rear hit
  engine −74 %, front hit 0 %); a hit near a wheel bends that corner's suspension, changes toe/camber (the car pulls) and can puncture that tyre.
- **Detached panels: not supported.** The procedural car mesh has no separate panels to detach.

## 5. Full-mode effects (`damageEffects` → `DFX`)

Top speed (≥ 40 %), acceleration (≥ 30 %), steering (≥ 45 %), grip (≥ 35 %), brakes (≥ 50 %), lateral grip (≥ 45 %), pull (bent alignment /
puncture), vibration (flat tyre, bent driveline), limp mode, engine temperature (a damaged radiator overheats under sustained throttle, then
the engine loses power and smokes). In Realistic handling these act through the powertrain (torque and limiter speed) as well.

## 6. Tyres (`07d_tyres.js`), per wheel

Each wheel has tread, carcass health, temperature, peak temperature, distance driven on it, load, longitudinal and lateral slip, surface grip and a
wear breakdown (burnout / slide / spin / lock / rolling). Diagnostics flag a wheel that is spinning or locked (longitudinal slip > 3 m/s).
- **Load:** static weight split + longitudinal and lateral load transfer (centre-of-gravity height, wheelbase and track from the car's
  dimensions).
- **Slip:** longitudinal (wheelspin under power, lock-up under braking) and lateral (slip angle from the car's motion) per axle, with the
  drivetrain deciding which wheels receive torque.
- **Wear** ∝ (slip power)² × a temperature factor; heat from slip, cooling with speed.
- **Burnouts:** throttle + brake at a standstill. They only happen if the driven axle's torque beats its grip plus the brake hold: a powerful
  RWD on the foot brake, a FWD on throttle + handbrake (the handbrake holds the rears only). AWD and weak cars mostly cannot.
- **Effects (Full):** below 50 % tread, above 110 °C or with carcass damage, grip falls progressively; a puncture is worse than a bald tyre
  (grip, pull, vibration, top speed ≤ 62 %). The diagnostics panel shows a card per wheel (tread, temperature, carcass, puncture) and the
  dashboard warns (`⚠ TYRE FL PUNCTURED`).

Measured (`damage_test`):

| Scenario | Front-left | Front-right | Rear-left | Rear-right |
|---|---|---|---|---|
| Mustang GT burnout 3 s (foot brake) | 0.000 % | 0.000 % | ~1.0 % | ~1.0 % (rears 108 °C, fronts 25 °C) |
| Mustang GT burnout 30 s | | | 20.6 % | 20.6 % |
| Fiesta ST burnout (throttle + handbrake) | 0.41 % | 0.41 % | 0.000 % | 0.000 % |
| Focus RS (AWD) / Ford Model T | no burnout possible | | | |
| 10 s power slide (left turn) | 0.00 % | 0.73 % | 1.18 % | **16.67 %** (loaded outside rear) |
| 51 s ordinary driving | ≤ 0.18 % on every tyre | | | |

Drifting therefore wears the tyres that actually slide, mostly the loaded outside rear, not all four equally.

## 7. World objects (`07e_objects.js`, `OBJ_CLASS`)

| Class | Examples | Behaviour |
|---|---|---|
| Breakable (energy-based) | street lights (break at 36 km/h for a 1,500 kg car), utility poles, signs (bend at 11, knock down at 29 km/h) | bend first, then break; a heavier car breaks them at a lower speed (E = ½mv²); the car loses only a little speed; the collider is removed; attached arms/heads/sign plates hide with the pole |
| Movable | dumpsters/bins (160 kg) | shoved along the hit, collider re-added where it stops |
| Rigid | walls, buildings, guardrails, bus shelters, trees, monuments | never give way; normal crash damage |
| Vehicle | traffic / bots | relative-speed car-to-car damage |

Debris is a small pooled set (no allocation per impact, no explosions). `damage_test`: every collider classifies (rigid 50,853 · breakable
12,984 · movable 757).

## 8. Tests (2026-10-17, v41 build)

- `node tests/damage_test.js dist/irbid-drive.html`: **50/50** (localization, modes, per-car durability, location-aware internals, burnouts,
  drift wear, grip effects, landings, repairs, switching, world objects, diagnostics).
- `node tests/handling_test.js dist/irbid-drive.html`: **all pass**. Realistic handling, drivetrain launch (AWD Focus RS no spin, FWD Fiesta ST
  and RWD Mustang GT spin), RWD power oversteer / FWD understeer, braking 0.98 g, bump hop 0.00 m/s at 30 km/h and 0.32 m/s at 70 km/h, suspension
  heave 2.5–5.3 cm, suspension damage on a fast crossing and **no repeated damage** after it.
- `node tests/off_trace.js dist/irbid-drive.html`: Off + Arcade physics identical to v38.
- `python tests/damage_pw.py dist/irbid-drive.html`: **7/7** in Chromium (dents, broken light, cracked glass, punctured wheel, diagnostics, repair).
- `node tests/realism_test.js dist/irbid-drive.html`: 29/29 (breakable poles on terrain, speed bumps on terrain, hop).

## 9. Honest limits

No detachable panels, no deformation of traffic cars, no per-wheel suspension geometry, no Pacejka tyre curves or wheel rotation state.
Strengths are relative between cars (pickup > hatch > supercar > race car), not certified values. Dents are checked visually on the Focus RS
only, not on every one of the 217 body shapes.

## 10. Repair bay (v42, `08d_repair.js`)

Apex Drift Customs (Baghdad Street, U/P near it) lists every damaged item separately:

| Item | Repairs | Price (JD, × rarity tier 1 / 1.25 / 1.6 / 2.1 / 2.8) |
|---|---|---|
| Body zone (front-left … underbody) | zone condition to 100 % and the dents nearest that zone (other zones' dents stay) | 30 + 4 per % lost |
| Light (each) / window (each) | that light / that window | 35 / 90 (windscreen, rear screen), 50 (side) |
| Engine, cooling, transmission, driveline, steering, brakes | that component (engine/cooling also reset the temperature) | 60+6/%, 25+2.5/%, 50+5/%, 30+3/%, 30+3/%, 20+2.5/% |
| Suspension per corner | that corner + its alignment | 25 + 2.5 per % (+20 if the toe is bent) |
| Tyre per wheel | that tyre only (new tread, carcass, no puncture) | 45 |

Payment comes from the JD balance (`fines − spent`); an order is refused unless the balance covers all of it. Prices are **gameplay
estimates**; no local workshop price data was used. Tests: `damage_test` §14 (7 checks) and `damage_pw` (the shop buttons clicked in Chromium):
- the list is itemised;
- with no balance nothing changes;
- tyre RL only: RL new, RR still punctured, front body unchanged, exactly its price charged;
- one front panel: only its dents removed, the rear stays dented;
- repair all is refused 1 JD short, then fixes everything for the listed total;
- prices rise with the rarity tier.

## v43 (2026-10-17)

The repair bay gained a **full inspection**: all 30 parts (8 body zones, 4 lights, 4 windows, engine, cooling, gearbox, driveline, steering,
brakes, 4 suspension corners, 4 tyres) with their condition. Damaged parts keep their own paid Repair button; undamaged ones show
"OK · no charge". `damage_test` 59/59 (new: inspection list; repairing one tyre leaves the other tyres, panels and suspension untouched),
`damage_pw` 11/11. The simulation itself is unchanged: it is a gameplay approximation (no wheel-force tyre model, no suspension geometry).

## v44 addendum (2026-10-19)

Visible component damage (bumpers, mirrors, bonnet/boot, doors, per-pane glass cracks, rims, torn-off parts), material-based environment damage, the
quarter-car speed-bump response and flat-tyre rolling resistance are described in `V44_REPORT.md` §2–4; sources in `docs/REALISM_RESEARCH.md`.
All thresholds remain gameplay estimates.
