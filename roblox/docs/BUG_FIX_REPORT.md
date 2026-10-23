# Bug fix report

## Fixed in 4.4 (2026-10-24)

### 1. A DataStore outage could wipe a player's progress (serious)

- **Found by:** reading `Game/PlayerData.lua` during the security review for this round.
- **Cause:** `PlayerData.load` read the record with one `pcall(GetAsync)`, and on a failure (DataStore down, throttled, or a network error) it
  fell through to `d = {}`, the same as a brand-new player. The session got 500 JD and the starter car, and the next `commit` (any purchase)
  or the save on leaving / every 2 minutes **`SetAsync`ed that fresh record over the real one**. `save` also tried only once.
- **Fix:** the load is tried 3 times (waits of 1 s and 2 s). An empty result (`nil`) is still a new player. If all 3 tries fail, the session plays on
  a fresh record marked `noSave`, which `save` never writes, and the player is told so (attribute `SaveOff` → a 10 s message: "this session will
  NOT be saved. Rejoin later"). Each save is tried 3 times, and every failure is logged with `warn`.
- **Test:** the mock DataStore can now fail on demand (`M.storeFail`). New scenario checks: 3 failed reads → `SaveOff` and starting cash;
  leaving that session leaves the real record unchanged (cash and owned cars); 1 failed read → retried and the progress loads.
  Results: `TEST_REPORT.md`.

### 2. No graphics presets (missing feature, from the starter pack)

The port had one fixed look on every device. Added Auto / Low / Medium / High / Ultra plus manual rows (`FEATURE_MERGE_REPORT.md`). There was
no bug behind it. It is listed here because the brief treats performance on modest PCs as a defect.

## The brief's known bug class: "the steering axis is detected but the car does not turn"

Checked, and not present in the Roblox port:
- The gamepad / wheel value goes through one path: `Client/Gamepad` (invert, centre, sensitivity, dead zone, curve, smoothing) →
  `Client/Controls` writes it into the same input object as the keyboard (`inp.steer`, analog flag `inp.an`) → `Modules/CarPhysics`.
  There is no second controller to miss it.
- The scenario does not stop at "axis detected": it drives with simulated stick input and checks that the car's **heading changes** in the right
  direction both ways ("gamepad steering: right turns right, left turns left"). It also checks that unplugging the pad returns control to the keyboard.
- On a real G29 the usual cause is the mapping layer (Steam Input / x360ce) putting the wheel on an axis Roblox does not read as a stick. The
  setup panel's live readout ("raw … · steering …") shows this at once. `BUILD_AND_IMPORT.md` gives the mapping.

## Fixed in earlier conversion rounds (from `CONVERSION_PROGRESS.md` / git history)

| Version | Bug | Cause | Fix | Test |
|---|---|---|---|---|
| 3.1 | Roads buried under the ground (owner's Studio run) | the ground did not follow the web height field `TH` the roads sit on (commit `bd98d91`) | ground from tilted parts under `TH`, roads on top | scenario "roads not buried" |
| 3.1 | Clock ran while the map was still building | it started at server start | starts at 15:00 when `MapReady` | scenario |
| 4 | Damage equivalence off by 1e-8 | the web game stores wheel loads in a `Float32Array` | reproduced the float32 rounding | `damage_equiv` 92/92 at 1e-13 |
| 4 | Rain never starts (web bug, v49) | the web easing snaps any rain < 0.003 to 0, including the first step | only a fading shower snaps (port only; web unchanged) | scenario rain checks |
| 4.1 | Touch run: a slide check failed | a random traffic car blocked the test road | the test clears the road first | 24/24 sound block |
| 4.2 / 4.3 | Right-hand-lane check flaky | cars inside junctions measured against the crossing street | junction cars left out, measurable floor 30 % | repeated runs |
