-- Irbid Drive (Roblox) - duels (the web game's): R next to a traffic car (within 5.5 m) challenges it. Its driver lines up on the player's
-- left, both race 720 m along the road ahead (the straightest way at each junction) to a light beam, after a 3 s countdown; first to
-- the beam wins. No money, as in the web game.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))

local Duel = { rivals = {} }
local S = Config.SCALE
local st = State.st
local duel = nil -- {rival, src (the traffic car), dest = {x, z}, s = "count"|"run"|"done", t}

local beam = Instance.new("Part")
beam.Name = "DuelBeam"
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

-- the traffic car within 5.5 m, if any
function Duel.nearCar()
	local best, bd = nil, 5.5
	for _, c in ipairs(Traffic.agents) do
		local d = math.sqrt((c.x - st.x) ^ 2 + (c.z - st.z) ^ 2)
		if d < bd then
			best, bd = c, d
		end
	end
	return best
end

-- the road ahead: from the current edge, at each junction the straightest way on, until 650 m
local function travsAhead(near, d)
	local trs = { { e = near.e, d = d } }
	local len = d > 0 and near.e.len - near.u or near.u
	local cur = trs[1]
	while len < 650 do
		local e = cur.e
		local n = e.n
		local hx, hz
		if cur.d > 0 then
			hx, hz = e.x[n] - e.x[math.max(1, n - 2)], e.z[n] - e.z[math.max(1, n - 2)]
		else
			hx, hz = e.x[1] - e.x[math.min(n, 3)], e.z[1] - e.z[math.min(n, 3)]
		end
		local hl = math.max(math.sqrt(hx * hx + hz * hz), 1e-6)
		local best, bc = nil, -9
		for _, o in ipairs(State.road.nodes[cur.d > 0 and e.b or e.a].out) do
			if not (o.e == e and o.d == -cur.d) then
				local oe = o.e
				local k2 = math.min(3, oe.n)
				local dx, dz
				if o.d > 0 then
					dx, dz = oe.x[k2] - oe.x[1], oe.z[k2] - oe.z[1]
				else
					dx, dz = oe.x[oe.n + 1 - k2] - oe.x[oe.n], oe.z[oe.n + 1 - k2] - oe.z[oe.n]
				end
				local cs = (hx * dx + hz * dz) / (hl * math.max(math.sqrt(dx * dx + dz * dz), 1e-6))
				if cs > bc then
					bc, best = cs, o
				end
			end
		end
		if not best then break end
		trs[#trs + 1] = best
		len += best.e.len
		cur = best
	end
	return trs
end

function Duel.active()
	return duel ~= nil
end

local function finish(msg)
	if not duel then return end
	if duel.rival then Traffic.remove(duel.rival) end
	table.clear(Duel.rivals)
	-- the traffic car goes back to traffic
	if duel.src then duel.src.x = 1e5 end
	duel = nil
	State.mission = nil
	State.frozen = false
	State.raceMark = nil
	beam.Transparency = 1
	Hud.mission.Text = ""
	if msg then Hud.toast(msg) end
end
Duel.cancel = finish

function Duel.start(c)
	local near = Road.at(State.road, st.x, st.z, 0)
	if not near then
		Hud.toast("Get on a road to start a duel")
		return
	end
	local d = near.e.ow and 1 or ((math.sin(st.h) * near.tx + math.cos(st.h) * near.tz) >= 0 and 1 or -1)
	local P = Road.path(travsAhead(near, d), nil)
	local s0 = d > 0 and near.u or near.e.len - near.u
	local endS = math.min(P.c[#P.c], s0 + 720)
	local dx, dz = Road.sample(P, endS, 1)
	local _, _, _, tx, tz = Road.sample(P, s0, 1)
	-- the player on the line facing along it, the rival 3.6 m to the left
	st.h = math.atan2(tx, tz)
	st.vx, st.vz, st.vy = 0, 0, 0
	-- the rival's car: one of the web game's sports catalogue (11_race: a random index below NRACE)
	local rv = Traffic.agent("rival", Config.CARS[Rules.racers[math.random(#Rules.racers)]])
	rv.P, rv.s, rv.pi, rv.skill, rv.lane = P, s0, 1, 1, 0
	rv.endS = endS
	local fx, fz = math.sin(st.h), math.cos(st.h)
	rv.x, rv.z, rv.h, rv.y = st.x + fz * 3.6, st.z - fx * 3.6, st.h, st.y
	rv.offX, rv.offZ = fz * 3.6, -fx * 3.6
	Traffic.draw(rv)
	-- the challenged traffic car leaves the road while its driver races
	c.x, c.z = 1e5, 1e5
	Traffic.draw(c)
	Duel.rivals[1] = rv
	duel = { rival = rv, src = c, dest = { dx, dz }, s = "count", t = 3.99 }
	State.mission = "duel"
	State.frozen = true
	State.raceMark = duel.dest
	Hud.toast("Duel vs " .. rv.name .. "! First to the beam wins")
end

function Duel.step(dt)
	if not duel then return end
	local rv = duel.rival
	if duel.s == "count" then
		duel.t -= dt
		Hud.mission.Text = "Duel · starts in " .. math.ceil(duel.t)
		if duel.t <= 0 then
			duel.s = "run"
			State.frozen = false
			Hud.toast("GO!", 1.5)
		end
	elseif duel.s == "run" or duel.s == "done" then
		-- the rival drives the line (its lateral offset fades out over the first 50 m)
		local fin = rv.s >= rv.endS - 1
		Traffic.follow(rv, dt, fin and 0 or math.min(rv.vm, Traffic.curveCap(rv, 10)))
		local k = math.max(0, 1 - (rv.s - (rv.endS - 720)) / 50)
		rv.x += (rv.offX or 0) * k
		rv.z += (rv.offZ or 0) * k
		Traffic.draw(rv)
		if duel.s == "run" then
			if not rv.fin and (duel.dest[1] - rv.x) ^ 2 + (duel.dest[2] - rv.z) ^ 2 < 16 * 16 then rv.fin = true end
			if rv.fin then
				duel.s, duel.t = "done", 6
				Hud.toast("You lost the duel")
			elseif (duel.dest[1] - st.x) ^ 2 + (duel.dest[2] - st.z) ^ 2 < 18 * 18 then
				duel.s, duel.t = "done", 6
				Hud.toast("You won the duel!")
			else
				Hud.mission.Text = "Duel · " .. math.floor(math.sqrt((duel.dest[1] - st.x) ^ 2 + (duel.dest[2] - st.z) ^ 2)) .. " m to the beam"
			end
		else
			duel.t -= dt
			if duel.t <= 0 then
				finish()
				return
			end
		end
	end
	local gy = Drive.groundY(duel.dest[1], duel.dest[2], st.y + 80) or st.y
	beam.CFrame = CFrame.new(duel.dest[1] * S, (gy + 35) * S, duel.dest[2] * S) * CFrame.Angles(0, 0, math.pi / 2)
	beam.Transparency = 0.7
end

return Duel
