# Multiplayer, content updates and public release: what is needed (v48, 2026-10-20)

**Status: BLOCKED. Nothing in this file is implemented.** Each item needs infrastructure or accounts that only the owner can create
or pay for. This file is the design, so the work can start as soon as those exist. Nothing here has been tested with real network clients,
because none exist.

## Multiplayer (brief Part 9)

**Why it cannot be done now:** public servers must run on a machine that stays online (the brief says so). Private rooms between friends
still need a small always-on service to introduce the players (WebRTC "signalling") and usually a TURN relay for players behind strict NATs.
This PC is not a server, and testing "with at least two real network-connected clients" needs that service to be reachable from the internet.

**Recommended design** (it fits the existing single-script game, and the physics stays on each player's own machine):
1. **Server:** one small Node.js process using WebSockets (`ws`), in one region to start (for players in Jordan, a provider's
   Middle-East or EU-South location). It handles rooms, room codes, player lists, kicks and bans, and validation.
2. **Room codes:** 6 random digits by default (the brief's 4 digits allows 10,000 guesses), plus a per-IP rate limit and a lockout after 5
   wrong codes. Private rooms can also require a host-approved join.
3. **State sync:** each client sends its car state 15 times a second (`x, z, h, speed, steer, brake, lights`). Others are drawn with ~100 ms
   interpolation and short extrapolation. The server checks the physics envelope: a position jump faster than the car's top speed, or a
   teleport outside the map, is rejected.
4. **Traffic:** stays local per player (not synced), as in most browser racers. Races and events are synced through the server clock.
5. **Moderation:** mute, block and report (reports go to a server log for the owner). No chat at first (less moderation risk).
6. **Privacy:** a display name only. No email, location or device data is sent.
7. **Game side:** a new part `11e_net.js` (connect, ghost cars as extra traffic meshes, room UI in the pause menu). It is off and invisible
   until a server URL is configured, so the offline game is unchanged (constraint 8).

**What the owner must provide:** a hosting account (a small VPS or a container platform), a domain with HTTPS (needed for secure WebSockets
from an HTTPS page), and acceptance of the provider's terms. Running costs depend on the provider and player count. A small VPS is a few
dollars a month, but check current prices before choosing. **No account was created and nothing was paid.**

## One-button content updates (brief Part 10)

**What exists:** the data pipeline (`osm/overpass/fetch.py` → `osm/overpass/build.py --game`, with corrections in `corrections.py`, a review
log in `manifest/name_review.json`, and an audit in `place_audit.py` / `h21`) already does steps 1–7 of the brief offline: fetch, compare,
detect duplicates and conflicts, flag uncertain records, check the licence (ODbL) and validate. It runs on the owner's PC, not as a button in the game.

**What is missing, and why:**
- A "Check for updates" button in the game would have to download from a server. That adds a network host, which is against constraint 8
  until the owner approves it, and it needs a hosted, versioned content file.
- An administrator-only publish button needs a login on that server. Ordinary players must not be able to publish, so it cannot be a
  client-side button in a public HTML file.
- Today's admin route, which works now: run the pipeline, review `manifest/name_review.json`, then `python tools/check.py --full`; on success,
  commit, push and publish to the artifact link. The previous version stays in git (`backup/v4x` tags) and in `dist/last-good/`.

## Public website (brief Part 15)

| Step | State |
|---|---|
| Runs locally (double-click the offline HTML) | **Works** (tested). |
| Shared link | **Works**: the claude.ai artifact link (anyone with the link). It is not a website of your own. |
| Hosted as your own website | Not done. Needs hosting (for example GitHub Pages from the existing repo: free, but the owner must enable it in the repository settings) and a decision to make the game public. |
| Own domain | Not done. Needs a registrar account and a yearly fee. |
| Found on Google | Not done. Needs the public site, then Google Search Console verification and a sitemap. Indexing is Google's decision and takes time. |
| App stores | Not done. `app/` is ready (Capacitor 8). Needs Android Studio or Xcode builds and paid developer accounts; review is Apple's and Google's decision. |

## Ray tracing (brief Part 11)

The game uses three.js r128 with WebGL. WebGL has **no hardware ray-tracing API** (the three.js `WebGLRenderer` documentation mentions none),
and WebGPU in browsers does not expose the RTX ray-tracing cores either. Path tracers that run in a browser accumulate an image over many
frames; they are not a 45 fps driving renderer for a 30,000-building city on an RTX 3050 Laptop GPU. So **genuine ray tracing at 45 fps is
not feasible here**, and nothing in the game is labelled as ray tracing. The realistic upgrades are the current ones (PBR materials,
environment-map reflections, shadow maps, wet-road gloss), and possibly a WebGPU migration later (a three.js upgrade, which needs the owner's
approval because of constraint 8).
