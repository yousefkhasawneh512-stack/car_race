# Vehicle Realism Additions

## Controls
- Click **Damage: Off** in the upper-right corner to cycle through Off, Cosmetic, and Full damage modes.
- Press **I** to cycle modes.
- Use **Repair car** when it appears to restore the current vehicle.

## Modes
1. **Off:** disables vehicle damage and collision-based pole breaking.
2. **Cosmetic:** vehicle body condition changes and scratch/dent overlays appear; handling and power remain unchanged.
3. **Full:** cosmetic condition plus gameplay effects for engine, tyres, suspension, and brakes. Poor conditions reduce top speed, acceleration, grip, steering response, and braking.

Damage state is stored per car in browser local storage. Durability differences are gameplay-balancing estimates based on vehicle category and an individual variance, not claims about real-world crash-test ratings.

## Speed bumps
The bundled OSM road extract does not include mapped `traffic_calming` features. To avoid presenting estimates as surveyed facts, this build estimates a limited number of low-profile speed bumps on local/service roads near mapped schools, hospitals/clinics, and parks. Those positions are gameplay estimates, not verified real-world bump locations. Crossings at high speed apply a restrained upward impulse and can affect suspension/tyre condition in Full mode.

## Collisions and effects
- Impacts with static obstacles, traffic, and AI cars are assessed using the incoming collision speed.
- Utility poles and streetlights are set as breakable at higher impact speeds. Other walls and most roadside objects remain solid.
- High-energy impacts may show a brief, subtle spark effect. Severe engine condition may show a small smoke puff.
- Cosmetic damage is represented by simple overlay geometry, not true deformation of the vehicle's original mesh.

## Sources and attribution
The underlying map and points of interest are bundled from OpenStreetMap contributors. See https://www.openstreetmap.org/copyright. The game includes OSM attribution in its UI. For verified speed-bump locations, update the map data from an OSM extract that includes `traffic_calming` tags and review them against local sources before describing them as real.

## Verification status
- Rebuilt `dist/irbid-drive.html` from the project's source parts.
- The combined JavaScript passes `node --check`.
- Full browser/gameplay validation could not be completed in this environment: browser navigation to the local test server is blocked, and the project's Node boot test requires the `three` npm dependency which is not installed here.
