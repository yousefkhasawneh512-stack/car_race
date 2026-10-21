-- Irbid Drive (Roblox) - street races on the web game's circuits (routed over real roads by the web game): R starts the nearest
-- circuit (R again cancels). 3 rivals of about the player's tier on the web game's grid (20 / 34 / 48 m, the player at 62 m),
-- a 3 s countdown, a light beam over the next checkpoint, the position from checkpoints passed. The server pays by place.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Circuits = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Circuits"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))
local Gps = require(Client:WaitForChild("Gps"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Race = { rivals = {} }
local S = Config.SCALE
local st, spec = State.st, State.spec

-- circuits: racing line, checkpoint distances along it, a safe speed per point (for the rivals)
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
Race.circuits = C

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

local race = nil -- {c, t, s = "count"|"run"|"done", prog, fin, time}

local function finish(msg)
	if race and race.s ~= "done" then pcall(function() Remotes.Mission:InvokeServer("race_cancel") end) end
	race = nil
	State.mission = nil
	State.frozen = false
	State.raceMark = nil
	beam.Transparency = 1
	for _, a in ipairs(Race.rivals) do Traffic.remove(a) end
	table.clear(Race.rivals)
	Hud.mission.Text = ""
	if msg then Hud.toast(msg) end
end

function Race.toggle()
	if State.mission == "heist" then
		Hud.toast("Lose the police first")
		return
	end
	if race then
		finish("Race cancelled")
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
	Gps.clear()
	Traffic.clear(best.P.x[1], best.P.z[1], 120)
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
		Race.rivals[#Race.rivals + 1] = a
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
		Traffic.follow(a, dt, math.min(a.vm * a.skill, c.caps[a.pi] or 30))
		if a.s >= c.cpS[#c.cpS] - 2 then
			a.done = true
			race.fin += 1
		end
	end
	-- side offset so the three rivals do not drive inside each other (follow() puts the car back on the line every frame)
	a.x, a.z = a.x - math.cos(a.h) * a.lane, a.z + math.sin(a.h) * a.lane
	Traffic.draw(a)
end

function Race.step(dt)
	if not race then return end
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
		for _, a in ipairs(Race.rivals) do rivalStep(a, dt) end
	else
		for _, a in ipairs(Race.rivals) do Traffic.draw(a) end
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
				State.raceMark = nil
				return
			end
		end
		-- position: checkpoints passed, then distance to the next one
		local pos = 1
		local myS = c.cpS[race.prog] - math.sqrt((cp.x - st.x) ^ 2 + (cp.z - st.z) ^ 2)
		for _, a in ipairs(Race.rivals) do
			if a.done or a.s > myS then pos += 1 end
		end
		local lap = c.laps > 1 and (" · lap " .. math.min(c.laps, 1 + math.floor((race.prog - 1) / (#c.cps / c.laps)))) or ""
		Hud.mission.Text = c.name .. " · P" .. pos .. " of 4 · checkpoint " .. race.prog .. "/" .. #c.cps .. lap .. " · " .. string.format("%.1f s", race.time)
	end
	if race.s == "done" then
		race.t -= dt
		if race.t <= 0 then finish() end
		return
	end
	local cp = c.cps[race.prog]
	local gy = Drive.groundY(cp.x, cp.z, st.y + 80) or st.y
	beam.CFrame = CFrame.new(cp.x * S, (gy + 35) * S, cp.z * S) * CFrame.Angles(0, 0, math.pi / 2)
	beam.Transparency = 0.7
	State.raceMark = { cp.x, cp.z }
end

function Race.current()
	return race
end

return Race
