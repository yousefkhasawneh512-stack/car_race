-- Irbid Drive (Roblox) - traffic laws, the web game's rules and amounts (10_laws_player.js):
--   speeding: more than the street's limit + 10 km/h, counted after 1.5 s on that street             15 JD (at most every 5 s)
--   driving against traffic (one-way the wrong way, or the left lane of a two-way street, > 14 km/h)  20 JD (every 6 s)
--   running a red light at a signalised junction (> 14 km/h)                                          50 JD (every 3 s)
--   collision with traffic (Bump)                                                                     30 JD (every 2 s)
-- No limits and no fines in a drift zone. Like the web game, a fine ADDS to the JD balance (the wheel is paid with "law-breaking JD").
-- The server keeps the amounts and the cool-downs; this module detects the offences and shows them.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Ground = require(Client:WaitForChild("Ground"))
local Signals = require(Client:WaitForChild("Signals"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Laws = { LIMIT = 50, limit = 50 }
local st = State.st
local last = {}
local LIMT = { l = -1, t = 0 }
local curL = nil
local inZone = nil
local AMOUNT = { spd = 15, way = 20, red = 50, hit = 30 }

local function now()
	return Workspace.DistributedGameTime
end

function Laws.fine(k, msg, cd)
	if now() - (last[k] or -99) < cd then return end
	last[k] = now()
	Remotes.Fine:FireServer(k)
	-- road reputation (Reputation.event) hears every fine given
	if Laws.onFine then Laws.onFine(k) end
	Hud.toast(msg .. " — fine " .. AMOUNT[k] .. " JD")
end

function Laws.driftZoneAt(x, z)
	for _, q in ipairs(Rules.dzones) do
		if math.sqrt((x - q.x) ^ 2 + (z - q.z) ^ 2) < q.r then return q end
	end
	return nil
end

-- the web game's wrongWay(): only on one clear road (not alleys, service roads, campus roads, drift pads, roundabouts), not within
-- 18 m of either end; one-way: moving backwards along it; two-way: moving along it on the left half
local NOWRONG = { alley = true, svc = true, campus = true, drift = true, ring = true }
local function wrongWay(s)
	if not s or s.d > s.e.w / 2 or s.n ~= 1 then return false end
	local e = s.e
	if NOWRONG[e.fk] then return false end
	if s.u < 18 or e.len - s.u < 18 then return false end
	local al = st.vx * s.tx + st.vz * s.tz
	if e.ow then return al < -4 end
	return (al > 4 and s.side < -1) or (al < -4 and s.side > 1)
end

-- direction a car arriving along edge e travels into node nd (from the point 14 m back along the edge)
local function approachOf(nd, e)
	local atB = e.b == nd.id
	local s = atB and math.max(0, e.len - 14) or math.min(e.len, 14)
	local k = 1
	while k < e.n - 1 and e.cum[k + 1] < s do k += 1 end
	local t = math.clamp((s - e.cum[k]) / math.max(e.cum[k + 1] - e.cum[k], 1e-6), 0, 1)
	local bx, bz = e.x[k] + (e.x[k + 1] - e.x[k]) * t, e.z[k] + (e.z[k + 1] - e.z[k]) * t
	local dx, dz = nd.x - bx, nd.z - bz
	local l = math.max(math.sqrt(dx * dx + dz * dz), 1e-6)
	return dx / l, dz / l
end

local litNodes = nil
local function redLight(sp)
	if not litNodes then
		litNodes = {}
		for _, s in ipairs(Rules.signals) do litNodes[#litNodes + 1] = State.road.nodes[s.n] end
	end
	local near = nil
	for _, nd in ipairs(litNodes) do
		if (st.x - nd.x) ^ 2 + (st.z - nd.z) ^ 2 < 144 then
			near = nd
			break
		end
	end
	if near and curL == nil and st.y - Ground.TH(st.x, st.z) < 1.5 and sp > 14 then
		local v = math.max(math.sqrt(st.vx * st.vx + st.vz * st.vz), 1e-6)
		local vx, vz = st.vx / v, st.vz / v
		local best, bd = nil, -2
		for _, e in ipairs(near.inn or {}) do
			local hx, hz = approachOf(near, e)
			local dd = hx * vx + hz * vz
			if dd > bd then
				bd, best = dd, e
			end
		end
		if best and bd > 0.5 and Signals.at(near, best) == "r" then Laws.fine("red", "Ran a red light", 3) end
	end
	curL = near and near.id or nil
end

-- after the car has moved; sp = speed in km/h
function Laws.step(sp)
	local RI = State.road and Road.at(State.road, st.x, st.z, 6)
	State.ri = RI
	local lim = (RI and RI.d <= RI.e.w / 2 + 0.3) and RI.e.lim or 0
	Laws.limit = lim > 0 and lim or Laws.LIMIT
	if lim ~= LIMT.l then
		LIMT.l = lim
		LIMT.t = now()
	end
	local dzo = Laws.driftZoneAt(st.x, st.z)
	if dzo ~= inZone then
		inZone = dzo
		Hud.toast(dzo and ("🏁 " .. dzo.n .. " — no speed limit, no fines") or "Leaving the drift zone")
	end
	State.inDrift = dzo ~= nil
	if dzo then return end
	if st.gnd and lim > 0 and sp > lim + 10 and now() - LIMT.t > 1.5 then
		Laws.fine("spd", "Speeding (" .. math.floor(sp + 0.5) .. " km/h)", 5)
	end
	if st.gnd and sp > 14 and wrongWay(RI) then Laws.fine("way", "Driving against traffic", 6) end
	redLight(sp)
end

return Laws
