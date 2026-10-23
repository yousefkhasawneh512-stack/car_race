# Asset manifest

The game uses **no uploaded meshes, textures or images**. Everything visible is built from Roblox parts by the scripts at run time, from the
generated data. The only external asset is the sound file, which the owner must upload once.

## Included in this project

| Asset | File / place location | Made by | Licence | State |
|---|---|---|---|---|
| Place file (all scripts + data) | `IrbidDrive.rbxlx` (12.5 MB) | `tools/make_roblox.js` | project code + ODbL data | ready |
| Luau sources | `src/` | project code | project | ready |
| Map + rules data | `data/` (ServerStorage.IrbidData), `shared/` (ReplicatedStorage.IrbidShared) | generated from the web build | ODbL (OSM-derived) + public domain (SRTM) | ready |
| 217 car definitions | `shared/Meta.lua` (`Config.CARS`) | web game `PORS` numbers, generic names (`CAR_NAMES.md`) | project data | ready |
| Car bodies | `Modules/CarBody` (wedges + blocks from the web profile) | project code | project | ready, look not seen in Studio |
| Landmarks | `data/Landmarks.lua` (625 parts) | exported from the web game's builders | project code, placed on OSM points | ready, approximate shapes |
| Street furniture, trees, sign plates | `shared/Props_*`, `shared/Signs.lua` (~80,000 items) | exported from the web game | project code + OSM-derived positions | ready |
| Roadside colliders | `shared/Objects_*` (24,883) | exported from the web game | project code | ready |
| Sound atlas | `audio/IrbidDriveSounds.wav` (146 s, 22,050 Hz, 6.5 MB, 74 sounds) + `AudioAtlas.lua` | rendered offline from the web game's synthesiser (`tools/make_roblox_audio.js`) | project-made, original | file ready, **upload needed** |
| Car encyclopedia | `catalog/*.lua` (30,511 versions) | `tools/vehicle_catalog/` from an open vehicle database | ODbL (`catalog/LICENSE-DATA.md`) | ready |
| Rain particle | `rbxasset://textures/particles/SquareParticle.png` | Roblox built-in | ships with Roblox | ready |
| Materials | Roblox built-in materials (Asphalt, Concrete, Grass, Metal, Glass, Neon, Wood...) | Roblox | ships with Roblox | ready |
| Lighting effects | Atmosphere, Clouds, ColorCorrection, Bloom, SunRays (created by scripts) | Roblox | ships with Roblox | ready |

## Missing (needs the owner)

| Asset | Why it is missing | What happens without it |
|---|---|---|
| Uploaded sound ID (`Config.AUDIO_ATLAS_ID`) | a sound can only be uploaded from the owner's Roblox account | the game is silent |
| Robux pass / product IDs | created in the owner's Creator Dashboard | the purchase buttons do nothing |
| Licensed 3D car models | Sketchfab downloads need the owner's account and a licence / trademark decision (176 CC BY candidates listed in the repository's `manifest/car_model_candidates.json`) | cars are part-built shapes |
| Facade / car detail textures | the web game draws them on canvases at run time, and Roblox cannot. They would have to be uploaded as images | plain coloured materials |
| Photos of real places | none with a usable licence was found (see `DATA_SOURCES_AND_LICENCES.md`) | none shown |

Nothing from Forza Horizon, BeamNG.drive or any other commercial game is included or was used as a reference asset.
