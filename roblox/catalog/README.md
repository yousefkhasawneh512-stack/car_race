# Vehicle catalogue (Roblox car encyclopedia)

Generated data. Don't edit it by hand. It is packed into `ReplicatedStorage.IrbidCatalog` by `tools/make_roblox.js`, read by
`src/ReplicatedStorage/Modules/Catalog.lua`, and shown by `src/StarterPlayerScripts/Client/CarCatalog.lua`. To open it, go to
**Settings → 📖 Car encyclopedia**, or press **ℹ** next to a car in the garage.

**Browse only.** These cars have no 3D model and cannot be driven. Nothing is sent to the server, and the 217 drivable cars keep their
own numbers. The owner chose real brand names for this screen on 2026-10-23, accepting the trademark-moderation risk on Roblox. The
drivable cars keep their generic names.

## Source

- **vehicle-makes-models** (https://github.com/gor3a/vehicle-makes-models), release v1.0.2 (commit of 2026-09-25):
  - `data/csv/engines.csv`, 5,286,009 bytes, downloaded 2026-10-23;
  - its facts were collected from autoevolution.com;
  - licence: Open Database License 1.0 (see `LICENSE-DATA.md`).
- Built with the owner-supplied `tools/vehicle_catalog/build_car_database.py`, which converts units and adds game estimates.
- Then `tools/vehicle_catalog/make_roblox_catalog.py`.

## Contents (2026-10-23 build)

| | |
|---|---|
| Source rows | 30,535 |
| Variants kept | 30,511 (24 exact duplicates dropped: same identity and the same numbers) |
| Makes / make-model pairs | 134 / 2,458 |
| Modules | `CatalogDict` (makes, fuels, gearboxes, drivetrains, field list, suspect rules, credit), `Catalog1`–`Catalog19` (4.5 MB, one variant per line), `CarLinks` |
| Rows with a suspect value | 334 |
| Game cars linked | 171 of 217 (`CAR_LINKS.md`) |

**Missing values stay missing.** An empty field means the source has no value, and the game shows it as "Unknown", never as 0. The
fields missing most often:

| Field | Missing |
|---|---|
| Body type | 100 % (the source column is empty, so the screen says "Not in the source data") |
| 0–100 km/h | 16.9 % |
| Fuel economy | 15.5 % |
| Top speed | 15.0 % |
| Kerb weight | 9.9 % |
| Displacement | 4.6 % |
| Torque | 4.1 % |

**Suspect values.** Some source values are physically impossible: 190,150 hp, a kerb weight of 17,331,661 kg, 0–100 km/h in 806 s or
in 0 s, top speeds of 2,343 km/h. These are kept exactly as given. The game shows them with "(suspect source value)" and leaves them
out of the filters and the sorting. The ranges are in `SUSPECT` (`make_roblox_catalog.py`) and are wider than any production car.
Counts:

| Field | Suspect rows | Field | Suspect rows |
|---|---|---|---|
| Power | 17 | Fuel economy | 34 |
| Torque | 13 | Length | 23 |
| 0–100 km/h | 11 | Width | 71 |
| Top speed | 19 | Height | 43 |
| Weight | 41 | Wheelbase | 89 |
| Displacement | 2 | | |

**Game estimates.** Handling, grip, braking and drift suitability come from the builder's heuristic v1 (weight, drivetrain and
power-to-weight), with suspect values left out. They are labelled "game estimate" on screen. They are not measurements, and they do not
change how any car drives.

## Links to the game's cars (`CarLinks.lua`, `CAR_LINKS.md`)

How a game car is linked:
1. The web car name gives the make.
2. The make's catalogue models give the model. Model names that list several cars ("ix35 / Tucson", "288 GTO/F40/F50/Enzo/LaFerrari")
   are split, and a make prefix such as "SKODA Octavia" is removed.
3. If the name has a generation code (E36, W211, Mk7, R34, C8, …), only generations that started in that code's production years count
   (`GEN_YEARS`).
4. "Hybrid" or "EV" in the name prefers those versions.
5. Of what is left, the variant with the nearest top speed and 0–100 km/h wins.

The screen calls the result a reference. It doesn't claim the game car is that exact variant.

46 game cars have no link because the catalogue lacks the model or generation: old Porsche racers, the Ford Model T/A and GT40, the
Mercedes W211/W203/W221 generations, Changan, GAC, Hongqi and others. Those cars say "not in the vehicle catalogue".

## Rebuild

```
python tools/vehicle_catalog/build_car_database.py --out-dir tools/vehicle_catalog/generated      # downloads the source (needs internet)
python tools/vehicle_catalog/make_roblox_catalog.py tools/vehicle_catalog/generated/irbid_drive_vehicle_database.json
node tools/make_roblox.js dist/irbid-drive.html
node roblox/tests/catalog_test.js <luau.exe> tools/vehicle_catalog/generated/irbid_drive_vehicle_database.json
```

`tools/vehicle_catalog/generated/` (the 5 MB download and the 55 MB JSON/CSV) is git-ignored. The source is updated weekly upstream, so
a rebuild can change the counts above.
