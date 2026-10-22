-- Irbid Drive (Roblox) - road reputation and rival memory (the web game's 11c_assist.js). Fixed, documented rules (no learning):
--   reputation 0-100, starts at 70: -6 hitting a traffic car, -4 a red light, -2 driving against traffic, -1 a speeding fine;
--   +1 for every 45 s of driving above 15 km/h with no incident (and no menu open).
--   Effects: below 50 the traffic behind you keeps a longer gap (6.5 m -> 12 m at 0); a traffic car stuck right behind you while you stand
--   still honks after its patience runs out (6 s at >= 60, 3 s at >= 30, 1.5 s below); a traffic car you hit always honks.
--   The three named racers (Samer, Layth, Omar) remember races, wins, losses and hits; at the start of a race each one's skill moves with
--   its record against you (wins - losses x 0.004, at most -0.02 / +0.03, +0.01 after 3 hits; between 0.94 and 1.05).
-- Saved with the progress (the server keeps it: remote SaveRep, player attribute "Rep").
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Signals = require(Client:WaitForChild("Signals"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Reputation = {}
local plr = Players.LocalPlayer
local NAMES = { "Samer", "Layth", "Omar" }
local D = { hit = -6, red = -4, way = -2, spd = -1 }
local REP = { road = 70, clean = 0, riv = {} }
Reputation.state = REP

-- the wire format (attribute "Rep" / remote SaveRep): "road;Samer=r,w,l,h;Layth=...;Omar=..."
function Reputation.encode(t)
	local out = { tostring(math.floor(t.road + 0.5)) }
	for _, n in ipairs(NAMES) do
		local q = t.riv[n]
		if q then out[#out + 1] = string.format("%s=%d,%d,%d,%d", n, q.r, q.w, q.l, q.h) end
	end
	return table.concat(out, ";")
end
function Reputation.decode(s)
	local t = { road = 70, clean = 0, riv = {} }
	if type(s) ~= "string" or #s > 200 then return t end
	local r = tonumber(string.match(s, "^(%d+)"))
	if r then t.road = math.clamp(r, 0, 100) end
	for n, a, b, c, d in string.gmatch(s, "(%a+)=(%d+),(%d+),(%d+),(%d+)") do
		if table.find(NAMES, n) then
			t.riv[n] = { r = math.min(999, tonumber(a)), w = math.min(999, tonumber(b)), l = math.min(999, tonumber(c)), h = math.min(999, tonumber(d)) }
		end
	end
	return t
end

local function gap()
	State.repGap = 6.5 + (REP.road < 50 and (50 - REP.road) * 0.11 or 0)
end
local saveT = 0
local function save()
	saveT = 1
end
local function load()
	local t = Reputation.decode(plr:GetAttribute("Rep"))
	REP.road, REP.riv = t.road, t.riv
	gap()
end
load()
plr:GetAttributeChangedSignal("Rep"):Connect(function()
	if saveT <= 0 then load() end
end)

local function riv(n)
	REP.riv[n] = REP.riv[n] or { r = 0, w = 0, l = 0, h = 0 }
	return REP.riv[n]
end

-- a honk from an AI car (positional, CarAudio), at most every 4 s per car
local function honk(a, dur)
	local t = Workspace.DistributedGameTime
	if t - (a.hk or -99) < 4 then return end
	a.hk = t
	a.hp = a.hp or (0.85 + math.random() * 0.35)
	if Reputation.onHonk then Reputation.onHonk(a, dur, a.hp) end
end

-- a fine was given (Laws.onFine): the reputation drops; a traffic car you hit honks
function Reputation.event(k)
	if not D[k] then return end
	REP.road = math.clamp(REP.road + D[k], 0, 100)
	REP.clean = 0
	gap()
	save()
	if k == "hit" then
		local st, best, bd = State.st, nil, 49
		for _, a in ipairs(State.ai) do
			if a.kind == "traffic" then
				local d = (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2
				if d < bd then best, bd = a, d end
			end
		end
		if best then honk(best, 1.1) end
	end
end

-- a race starts (Race.onStart): each racer's skill from its record against you
function Reputation.raceStart(rivals)
	local msg = {}
	for _, a in ipairs(rivals) do
		if a.driver then
			local q = riv(a.driver)
			a.skill = math.clamp(a.sk0 + math.clamp((q.w - q.l) * 0.004, -0.02, 0.03) + (q.h >= 3 and 0.01 or 0), 0.94, 1.05)
			if q.h >= 3 then
				msg[#msg + 1] = a.driver .. " remembers " .. q.h .. " hits"
			elseif q.w - q.l >= 3 then
				msg[#msg + 1] = a.driver .. " wants revenge (" .. q.l .. "-" .. q.w .. ")"
			end
		end
	end
	if #msg > 0 then task.delay(2.6, function() Hud.toast("🧠 " .. table.concat(msg, " · ")) end) end
	Reputation.racing = rivals
end
-- you finished (Race.onFinish): a racer already home beat you, the others lost
function Reputation.raceEnd(rivals)
	for _, a in ipairs(rivals) do
		if a.driver then
			local q = riv(a.driver)
			q.r = math.min(999, q.r + 1)
			if a.done then q.l = math.min(999, q.l + 1) else q.w = math.min(999, q.w + 1) end
		end
	end
	Reputation.racing = nil
	save()
end

-- is this traffic car waiting at a red light ahead of it (then it is not the player's fault)
local function atRed(a)
	local P = a.P
	if not (P and a.trs) then return false end
	for i, tr in ipairs(a.trs) do
		local endS = P.ends and P.ends[i]
		if endS and endS >= a.s then
			if endS - a.s > 45 then break end
			local nd = State.road.nodes[tr.d > 0 and tr.e.b or tr.e.a]
			if nd and nd.lit and Signals.at(nd, tr.e) ~= "g" then return true end
		end
	end
	return false
end

local honkT, hitT = 0, {}
function Reputation.step(dt)
	local st = State.st
	local v = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	if v > 4.2 and not State.ui then
		REP.clean += dt
		if REP.clean >= 45 then
			REP.clean = 0
			if REP.road < 100 then
				REP.road = math.min(100, REP.road + 1)
				gap()
				save()
			end
		end
	end
	-- hits on the racers during a race
	if Reputation.racing and State.mission == "race" then
		local t = Workspace.DistributedGameTime
		for _, a in ipairs(Reputation.racing) do
			if a.driver and not a.done and math.sqrt((a.x - st.x) ^ 2 + (a.z - st.z) ^ 2) < 3.6 and v > 3 and t - (hitT[a.driver] or -99) > 2 then
				hitT[a.driver] = t
				local q = riv(a.driver)
				q.h = math.min(999, q.h + 1)
				save()
			end
		end
	end
	-- impatient drivers: a traffic car stuck right behind the stopped player honks when its patience runs out
	honkT -= dt
	if honkT <= 0 then
		honkT = 0.25
		local pat = REP.road >= 60 and 6 or REP.road >= 30 and 3 or 1.5
		for _, a in ipairs(State.ai) do
			if a.kind == "traffic" then
				local dx, dz = st.x - a.x, st.z - a.z
				if dx * dx + dz * dz > 900 then
					a.blk = 0
				else
					local sh, ch = math.sin(a.h), math.cos(a.h)
					local f = dx * sh + dz * ch
					if f > 0 and f < 14 and math.abs(dx * ch - dz * sh) < 2.6 and a.v < 1 and v < 1.5 and not ((a.hit or 0) > 0) and not atRed(a) then
						a.blk = (a.blk or 0) + 0.25
						if a.blk > pat then
							a.blk = -4
							honk(a, 0.45)
						end
					else
						a.blk = 0
					end
				end
			end
		end
	end
	-- save at most every 3 s
	if saveT > 0 then
		saveT -= dt
		if saveT <= 0 then Remotes.SaveRep:FireServer(Reputation.encode(REP)) end
	end
end

-- the line in the settings menu (the web game's pause-menu row)
function Reputation.line()
	local rv = {}
	for _, n in ipairs(NAMES) do
		local q = REP.riv[n]
		if q and q.r > 0 then rv[#rv + 1] = n .. " " .. q.w .. "–" .. q.l .. (q.h > 0 and (" (" .. q.h .. " hits)") or "") end
	end
	return "Road reputation " .. math.floor(REP.road + 0.5) .. "/100 (traffic remembers hits, red lights, wrong way, speeding; clean driving earns it back)"
		.. (#rv > 0 and (" · Rivals you–them: " .. table.concat(rv, " · ")) or "")
end

return Reputation
