-- Irbid Drive (Roblox) - street races and the bank heist, played on this device (the server checks the results before it pays).
-- Races: the web game's circuits (routed over real roads), 3 rivals on the racing line, a 3 s countdown, checkpoints as a light beam,
-- positions by checkpoints passed. Heist: rob the bank (E near it), police cars hunt the player for 2:00 over the real road graph
-- (straight at the player when close); 2.5 s next to a police car = caught. Same rules and numbers as the web game.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Meta = require(Shared:WaitForChild("Meta"))
local Circuits = require(Shared:WaitForChild("Circuits"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Drive = require(script.Parent:WaitForChild("Drive"))
local Traffic = require(script.Parent:WaitForChild("Traffic"))
local Nav = require(script.Parent:WaitForChild("Nav"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Missions = {}
local S = Config.SCALE
local st, spec = State.st, State.spec
Missions.rivals, Missions.cops = {}, {}

-- circuits: polyline, checkpoint distances along it, per-point safe speeds
local C = {}
for _, c in ipairs(Circuits) do
	local P = Road.pathFromString(c.path)
	local cpS, j = {}, 1
	for k, cp in ipairs(c.cps) do
		-- each checkpoint is matched forward along the line (laps pass the same place more than once)
		local best, bd = j, math.huge
		for i = j, #P.x do
			local d = (P.x[i] - cp.x) ^ 2 + (P.z[i] - cp.z) ^ 2
			if d < bd then
				best, bd = i, d
			end
			if bd < 4 and d > 400 then break end
		end
		cpS[k] = P.c[best]
		j = best + 1
	end
	C[#C + 1] = { name = c.name, laps = c.laps, cps = c.cps, cpS = cpS, P = P, caps = Road.speedCaps(P) }
end
Missions.circuits = C

-- the light beam over the next checkpoint
local beam = Instance.new("Part")
beam.Name = "Checkpoint"
beam.Anchored = true
beam.CanCollide = false
beam.CanQuery = false
beam.CanTouch = false
beam.Shape = Enum.PartType.Cylinder
beam.Material = Enum.Material.Neon
beam.Color = Color3.fromRGB(51, 224, 255)
beam.Transparency = 1
beam.Size = Vector3.new(70 * S, 12 * S, 12 * S)
beam.Parent = Workspace.CurrentCamera

local race = nil -- {c, t, s = "count"|"run"|"done", prog, fin, finished}
local heist = nil -- {t, catch, spawnT}

local function clearRivals()
	for _, a in ipairs(Missions.rivals) do Traffic.remove(a) end
	table.clear(Missions.rivals)
end

local function endRace(msg)
	if race and race.s ~= "done" then pcall(function() Remotes.Mission:InvokeServer("race_cancel") end) end
	race = nil
	State.mission = nil
	State.frozen = false
	beam.Transparency = 1
	Nav.raceMark = nil
	clearRivals()
	Hud.mission.Text = ""
	if msg then Hud.toast(msg) end
end

-- R: start the nearest circuit (or cancel the current race)
function Missions.race()
	if heist then
		Hud.toast("Lose the police first")
		return
	end
	if race then
		endRace("Race cancelled")
		return
	end
	if #C == 0 then return end
	local best, bd = C[1], math.huge
	for _, c in ipairs(C) do
		local d = (c.P.x[1] - st.x) ^ 2 + (c.P.z[1] - st.z) ^ 2
		if d < bd then
			best, bd = c, d
		end
	end
	local ok, err = Remotes.Mission:InvokeServer("race_start", best.name)
	if not ok then
		Hud.toast(tostring(err))
		return
	end
	Nav.clear()
	Traffic.clear(best.P.x[1], best.P.z[1], 120)
	-- rivals: cars of about the player's tier, on the web game's grid (20 / 34 / 48 m), the player at 62 m
	local pool = {}
	for i, car in ipairs(Config.CARS) do
		if math.abs(car.tier - spec.tier) <= 1 and not car.vip then pool[#pool + 1] = i end
	end
	local names = {}
	for k, s0 in ipairs({ 20, 34, 48 }) do
		local car = Config.CARS[pool[math.random(#pool)]]
		local a = Traffic.agent("rival", car)
		a.P, a.s, a.pi = best.P, s0, 1
		a.skill = 0.9 + math.random() * 0.1
		a.lane = (k - 2) * 1.6
		local x, z, y, tx, tz, i = Road.sample(a.P, a.s, 1)
		a.x, a.z, a.y, a.h, a.pi = x, z, y, math.atan2(tx, tz), i
		Traffic.draw(a)
		Missions.rivals[#Missions.rivals + 1] = a
		names[#names + 1] = car.name
	end
	local x, z, _, tx, tz = Road.sample(best.P, 62, 1)
	Drive.place(x, z, math.atan2(tx, tz))
	race = { c = best, t = 3.99, s = "count", prog = 1, fin = 0 }
	State.mission = "race"
	State.frozen = true
	Hud.toast(best.name .. " · rivals: " .. table.concat(names, ", "), 4)
end

local function rivalStep(a, dt)
	local c = race.c
	if a.done then
		Traffic.follow(a, dt, 0)
	else
		local vt = math.min(a.vm * a.skill, c.caps[a.pi] or 30)
		Traffic.follow(a, dt, vt)
		if a.s >= c.cpS[#c.cpS] - 2 then
			a.done = true
			race.fin += 1
		end
	end
	-- side offset so the three rivals do not drive inside each other (follow() puts the car back on the line every frame)
	a.x, a.z = a.x - math.cos(a.h) * a.lane, a.z + math.sin(a.h) * a.lane
	Traffic.draw(a)
end

local function raceStep(dt)
	local c = race.c
	if race.s == "count" then
		race.t -= dt
		Hud.mission.Text = c.name .. " · starts in " .. math.ceil(race.t)
		if race.t <= 0 then
			race.s = "run"
			race.time = 0
			State.frozen = false
			Hud.toast("GO!", 1.5)
		end
	end
	if race.s ~= "count" then
		for _, a in ipairs(Missions.rivals) do rivalStep(a, dt) end
	else
		for _, a in ipairs(Missions.rivals) do Traffic.draw(a) end
	end
	if race.s == "run" then
		race.time += dt
		local cp = c.cps[race.prog]
		if (cp.x - st.x) ^ 2 + (cp.z - st.z) ^ 2 < 28 * 28 then
			race.prog += 1
			if race.prog > #c.cps then
				race.s = "done"
				race.t = 6
				local place = race.fin + 1
				Hud.mission.Text = "Finished P" .. place .. " of 4 · " .. string.format("%.1f s", race.time)
				local ok, reward = Remotes.Mission:InvokeServer("race_finish", place)
				Hud.toast("Finished P" .. place .. " of 4!" .. (ok and reward and reward > 0 and ("  +" .. Hud.fmt(reward) .. " cash") or ""), 5)
				beam.Transparency = 1
				Nav.raceMark = nil
				return
			end
		end
		-- position: checkpoints passed, then distance to the next one
		local pos = 1
		local myS = c.cpS[race.prog] - math.sqrt((cp.x - st.x) ^ 2 + (cp.z - st.z) ^ 2)
		for _, a in ipairs(Missions.rivals) do
			if a.done or a.s > myS then pos += 1 end
		end
		local lap = c.laps > 1 and (" · lap " .. math.min(c.laps, 1 + math.floor((race.prog - 1) / (#c.cps / c.laps)))) or ""
		Hud.mission.Text = c.name .. " · P" .. pos .. " of 4 · checkpoint " .. race.prog .. "/" .. #c.cps .. lap .. " · " .. string.format("%.1f s", race.time)
	end
	if race.s == "done" then
		race.t -= dt
		if race.t <= 0 then endRace() end
		return
	end
	local cp = c.cps[race.prog]
	local gy = Drive.groundY(cp.x, cp.z, st.y + 80) or st.y
	beam.CFrame = CFrame.new(cp.x * S, (gy + 35) * S, cp.z * S) * CFrame.Angles(0, 0, math.pi / 2)
	beam.Transparency = 0.7
	Nav.raceMark = { cp.x, cp.z }
end

-- ---- heist ----
local function nearBank()
	return (Meta.bank.x - st.x) ^ 2 + (Meta.bank.z - st.z) ^ 2 < 14 * 14
end
local function nearShop()
	return (Meta.shop.x - st.x) ^ 2 + (Meta.shop.z - st.z) ^ 2 < 14 * 14
end
Missions.nearShop = nearShop

local function clearCops()
	for _, a in ipairs(Missions.cops) do Traffic.remove(a) end
	table.clear(Missions.cops)
end

function Missions.rob()
	if State.ui or heist or not nearBank() then return end
	if race then
		Hud.toast("Finish the race first")
		return
	end
	local ok, err = Remotes.Mission:InvokeServer("heist_start")
	if not ok then
		Hud.toast(tostring(err))
		return
	end
	heist = { t = Config.HEIST_TIME, catch = 0 }
	State.mission = "heist"
	Hud.toast("🚨 Bank robbed! Stay away from the police for 2:00", 4)
end

local function endHeist(escaped)
	clearCops()
	heist = nil
	State.mission = nil
	Hud.mission.Text = ""
	local ok, amount = Remotes.Mission:InvokeServer("heist_end", escaped)
	if escaped then
		Hud.toast(ok and ("Escaped! +" .. Hud.fmt(amount) .. " cash") or "Escaped!", 5)
	else
		st.vx *= 0.2
		st.vz *= 0.2
		Hud.toast("Busted! " .. (ok and Hud.fmt(amount) or "") .. " cash", 5)
	end
end

local function spawnCop()
	for _ = 1, 10 do
		local ang, r = math.random() * 2 * math.pi, 220 + math.random() * 240
		local near = Road.nearest(State.road, st.x + math.sin(ang) * r, st.z + math.cos(ang) * r, 80)
		if near then
			local a = Traffic.agent("cop", { L = 5.2, W = 1.95, H = 1.45, vm = spec.vm * 0.85, a0 = spec.a0 * 0.85 }, Color3.fromRGB(244, 244, 244))
			a.x, a.z, a.y = near.x, near.z, near.y
			a.h = math.atan2(st.x - a.x, st.z - a.z)
			a.thinkT = 0
			Missions.cops[#Missions.cops + 1] = a
			Traffic.draw(a)
			return
		end
	end
end

local function copStep(a, dt)
	a.vm, a.a0 = spec.vm * 0.85, spec.a0 * 0.85
	local dx, dz = st.x - a.x, st.z - a.z
	local d = math.sqrt(dx * dx + dz * dz)
	-- close, or at the end of the route (the junction nearest the player): straight at where the player is going
	local endOfPath = a.P ~= nil and a.s >= a.P.c[#a.P.c] - 3
	if d < 28 or (a.direct and d < 60) or (endOfPath and d < 200) then
		a.direct = true
		local tx, tz = st.x + st.vx * 0.4 - a.x, st.z + st.vz * 0.4 - a.z
		local want = math.atan2(tx, tz)
		local df = (want - a.h + math.pi) % (2 * math.pi) - math.pi
		local r = 2.2 / (1 + a.v / 14) * dt
		a.h += math.clamp(df, -r, r)
		-- approach at a speed that can still stop ~5 m from the player (7 m/s^2), and slow down to turn round:
		-- the police box the car in instead of ramming past it
		local vt = math.min(a.vm, math.sqrt(2 * 7 * math.max(0, d - 5)) + st.sp, a.vm * (1 - math.abs(df) / math.pi) + 4)
		if a.hit > 0 then vt = 0 end
		if a.hit > 0 then a.hit -= dt end
		a.v = math.max(0, a.v + math.clamp(vt - a.v, -9 * dt, a.a0 * dt))
		a.x += math.sin(a.h) * a.v * dt
		a.z += math.cos(a.h) * a.v * dt
		a.y = Drive.groundY(a.x, a.z, a.y + 4) or a.y
		a.P = nil
		return
	end
	a.direct = false
	-- far: follow a route to the player over the road graph, planned again every 0.8 s
	a.thinkT -= dt
	if not a.P or a.thinkT <= 0 then
		a.thinkT = 0.8
		local trs, s0 = Road.routeFrom(State.road, a.x, a.z, math.sin(a.h), math.cos(a.h), st.x + st.vx * 1.2, st.z + st.vz * 1.2)
		if trs then
			a.P = Road.path(trs, nil)
			a.s, a.pi = s0, 1
		else
			a.direct = true
			return
		end
	end
	Traffic.follow(a, dt, math.min(a.vm, Traffic.curveCap(a) * 1.15))
end

local function heistStep(dt)
	heist.t -= dt
	if #Missions.cops < math.min(8, 4 + math.floor((Config.HEIST_TIME - heist.t) / 25)) then spawnCop() end
	local near = false
	for _, a in ipairs(Missions.cops) do
		copStep(a, dt)
		Traffic.draw(a)
		if (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2 < 49 then near = true end
	end
	heist.catch = near and heist.catch + dt or math.max(0, heist.catch - dt * 2)
	if heist.catch >= 2.5 then
		endHeist(false)
		return
	end
	if heist.t <= 0 then
		endHeist(true)
		return
	end
	local m, s = math.floor(heist.t / 60), math.floor(heist.t % 60)
	Hud.mission.Text = string.format("🚨 ROBBERY · survive %d:%02d · police %d · caught %d%%", m, s, #Missions.cops, math.floor(heist.catch / 2.5 * 100))
end

-- the current race / heist tables (or nil), read-only for tests
function Missions.debug()
	return race, heist
end

-- ---- every frame: missions, police lights, and the context button ----
local flash = 0
function Missions.step(dt)
	if race then raceStep(dt) end
	if heist then heistStep(dt) end
	flash += dt
	local on = math.floor(flash * 6) % 2 == 0
	for _, a in ipairs(Missions.cops) do
		local r, b = a.model:FindFirstChild("LightR"), a.model:FindFirstChild("LightB")
		if r and b then
			r.Color = on and Color3.fromRGB(255, 30, 30) or Color3.fromRGB(50, 0, 0)
			b.Color = on and Color3.fromRGB(0, 0, 50) or Color3.fromRGB(30, 80, 255)
		end
	end
	-- context button / prompt
	if State.ui then return end
	if not heist and not race and nearBank() then
		local openAt = game:GetService("Players").LocalPlayer:GetAttribute("BankOpenAt") or 0
		if Workspace.DistributedGameTime < openAt then
			Hud.context("Bank closed · back in " .. math.ceil(openAt - Workspace.DistributedGameTime) .. " s", function() end, Color3.fromRGB(90, 90, 90))
		else
			Hud.context("🏦 ROB THE BANK (E)", Missions.rob)
		end
	elseif not heist and nearShop() then
		Hud.context("🔧 TUNE CAR (U)", Missions.openShop, Color3.fromRGB(230, 110, 0))
	else
		Hud.context(nil)
	end
end

return Missions
