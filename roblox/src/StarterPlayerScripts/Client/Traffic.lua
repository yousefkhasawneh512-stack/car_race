-- Irbid Drive (Roblox) - AI cars on this device. Traffic follows the web game (09_ai.js): 80 cars on the real road graph in the right-hand
-- lane, cruising at 13 m/s x the street limit / 50 x a factor by rarity, slower in bends, stopping at red lights and slowing at
-- roundabouts, keeping 6.5 m behind the car ahead, choosing at each junction by road kind, width and straightness.
-- Also the shared pieces the race rivals and the police use (models, path following). Every device has its own traffic.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local CarBody = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("CarBody"))
local State = require(script.Parent:WaitForChild("State"))

local Traffic = {}
local S = Config.SCALE
local folder = Instance.new("Folder")
folder.Name = "LocalAI_" .. Players.LocalPlayer.UserId
folder.Parent = Workspace
Traffic.folder = folder
local agents = {}
Traffic.agents = agents

-- a web colour (0xRRGGBB) as a Color3
function Traffic.hex(c)
	return Color3.fromRGB(math.floor(c / 65536) % 256, math.floor(c / 256) % 256, c % 256)
end
-- the web game's traffic paints (07a2 TCOL: mostly white, silver, grey, black)
local PAINT = {}
for i, c in ipairs(Rules.traffic.tcol) do PAINT[i] = Traffic.hex(c) end

-- an AI car's model: the web game's shape for that car (Modules/CarBody), anchored, no collision, ignored by ray tests; pivot = its root
-- part at H * 0.34 - 0.12 above the car's ground point. opt = {neon (the light lines), cop (the light bar)}
function Traffic.model(c, color, opt)
	local m = CarBody.build(c, color, { S = S, anchored = true, neon = opt and opt.neon, cop = opt and opt.cop })
	m.Parent = folder
	return m
end

-- an AI car: position / heading / speed in metres, a polyline to follow (P) and the distance along it (s)
function Traffic.agent(kind, car, color)
	local c = car or Config.CARS[math.random(#Config.CARS)]
	local a = {
		kind = kind, cop = kind == "cop", name = c.name or "Police", L = c.L, W = c.W, H = c.H, vm = c.vm, a0 = c.a0,
		x = 0, z = 0, y = 0, h = 0, v = 0, s = 0, pi = 1, hit = 0, active = true, skill = 1,
	}
	a.model = Traffic.model(c, color or PAINT[math.random(#PAINT)], Traffic.look(kind, c))
	a.car, a.col = c, color
	return a
end

-- the web game's looks: traffic cars from Uncommon up carry their light lines (carMesh), race and duel rivals the full set (mkPorsche),
-- police a light bar and no lines (mkCop)
function Traffic.look(kind, c)
	if kind == "cop" then return { cop = true } end
	return { neon = kind == "rival" or (kind == "traffic" and (c.tier or 0) >= 1) }
end

-- give an AI car another model (the web game's setTrafficModel): a new model only when the car or the paint changes
function Traffic.setCar(a, c, color)
	if a.car == c and a.col == color then return end
	local cf = a.model and a.model:GetPivot()
	if a.model then a.model:Destroy() end
	a.model = Traffic.model(c, color, Traffic.look(a.kind, c))
	if cf then a.model:PivotTo(cf) end
	a.car, a.col, a.name, a.L, a.W, a.H, a.vm, a.a0 = c, color, c.name, c.L, c.W, c.H, c.vm, c.a0
end

function Traffic.draw(a)
	-- the root part at the web game's car height (terrain + 0.12 m) + its lift
	local pos = Vector3.new(a.x, a.y + 0.12 + CarBody.lift(a.H), a.z) * S
	a.model:PivotTo(CFrame.lookAt(pos, pos + Vector3.new(math.sin(a.h), 0, math.cos(a.h))))
end

function Traffic.remove(a)
	a.active = false
	if a.model then a.model:Destroy() end
end

-- move along the polyline at the target speed vt (accelerate with the car's own curve, brake at up to 9 m/s^2)
function Traffic.follow(a, dt, vt)
	if a.hit > 0 then
		a.hit -= dt
		vt = 0
	end
	local acc = a.a0 * (1 - math.pow(math.max(a.v, 0) / (a.vm * 1.05), 2.5))
	a.v = math.max(0, a.v + math.clamp(vt - a.v, -9 * dt, math.max(acc, 0.5) * dt))
	a.s = math.min(a.s + a.v * dt, a.P.c[#a.P.c])
	local x, z, y, tx, tz, i = Road.sample(a.P, a.s, a.pi)
	a.x, a.z, a.y, a.pi = x, z, y, i
	local want = math.atan2(tx, tz)
	local d = (want - a.h + math.pi) % (2 * math.pi) - math.pi
	a.h += math.clamp(d, -4 * dt, 4 * dt)
end

-- the web game's curve cap over the next 150 m of the path, plus braking room
function Traffic.curveCap(a, brake)
	local P, j = a.P, a.pi
	local c0, best = a.s, 1e9
	while j + 3 <= #P.x and P.c[j] - c0 < 150 do
		local a1 = math.atan2(P.x[j + 1] - P.x[j], P.z[j + 1] - P.z[j])
		local a2 = math.atan2(P.x[j + 3] - P.x[j + 2], P.z[j + 3] - P.z[j + 2])
		local sa = math.max(0.02, math.abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi))
		local cp = math.clamp(math.sqrt(224 / sa), 9, 120)
		best = math.min(best, math.sqrt(cp * cp + 2 * (brake or 8) * math.max(0, P.c[j] - c0 - 4)))
		j += 1
	end
	return best
end

-- slow down for anything in front within 24 m and 2.6 m of the lane (other AI cars and the player)
function Traffic.gap(a, vt)
	local sh, ch = math.sin(a.h), math.cos(a.h)
	local function check(x, z)
		local dx, dz = x - a.x, z - a.z
		local f = dx * sh + dz * ch
		if f > 0 and f < 24 then
			local l = dx * ch - dz * sh
			if math.abs(l) < 2.6 then
				vt = math.min(vt, math.max(0, (f - 7) * 1.2))
			end
		end
	end
	for _, o in ipairs(State.ai) do
		if o ~= a then check(o.x, o.z) end
	end
	check(State.st.x, State.st.z)
	return vt
end

-- ---- traffic: the web game's (09_ai.js) ----
-- which roads traffic starts on (TRW) and how it picks a way at a junction (nextTrav): a weight per road kind x width x straightness
local TRW = { hw = 1, arch = 1, petra = 1, main = 0.85, ["local"] = 0.4, svc = 0.07, ramp = 0.5, ring = 0.7, drift = 0, campus = 0.5, alley = 0.3 }
local function nextTrav(tr)
	local e, d = tr.e, tr.d
	local node = State.road.nodes[d > 0 and e.b or e.a]
	local n = e.n
	local ax, az
	if d > 0 then
		ax, az = e.x[n] - e.x[math.max(1, n - 2)], e.z[n] - e.z[math.max(1, n - 2)]
	else
		ax, az = e.x[1] - e.x[math.min(n, 3)], e.z[1] - e.z[math.min(n, 3)]
	end
	local al = math.max(math.sqrt(ax * ax + az * az), 1e-6)
	local opts, wsum = {}, 0
	for _, o in ipairs(node.out) do
		if not (o.e == e and o.d == -d) and o.e.fk ~= "drift" then
			local oe = o.e
			local k2 = math.min(3, oe.n)
			local bx, bz
			if o.d > 0 then
				bx, bz = oe.x[k2] - oe.x[1], oe.z[k2] - oe.z[1]
			else
				bx, bz = oe.x[oe.n + 1 - k2] - oe.x[oe.n], oe.z[oe.n + 1 - k2] - oe.z[oe.n]
			end
			local cs = (ax * bx + az * bz) / (al * math.max(math.sqrt(bx * bx + bz * bz), 1e-6))
			local w = (oe.fk == "svc" and 0.2 or oe.fk == "local" and 0.7 or oe.fk == "ramp" and 0.6 or 1) * (0.6 + oe.w / 20) * (1 + 1.5 * math.max(0, cs))
			opts[#opts + 1] = { o = o, w = w }
			wsum += w
		end
	end
	if #opts == 0 then return nil end
	local r = math.random() * wsum
	for _, q in ipairs(opts) do
		r -= q.w
		if r <= 0 then return q.o end
	end
	return opts[#opts].o
end

local function rebuild(a)
	a.P = Road.path(a.trs, Road.lane)
	a.pi = 1
end

-- keep 170 m of path ahead, and drop traversals already driven
local function extend(a)
	local g = 0
	while a.P.c[#a.P.c] - a.s < 170 and g < 6 do
		g += 1
		local nt = nextTrav(a.trs[#a.trs])
		if not nt then
			a.dead = true
			break
		end
		a.trs[#a.trs + 1] = nt
		rebuild(a)
	end
	if #a.trs > 3 and a.s > a.P.ends[1] + 25 then
		local cut = a.P.ends[1]
		table.remove(a.trs, 1)
		rebuild(a)
		a.s = math.max(0, a.s - cut)
	end
end

-- the web game's traffic cars (07a2 rollTraffic / setTrafficModel): the rarity tier by the spawn odds of the street's traffic zone (old
-- Al-Balad mostly common cars, Petra Street and the mall area more expensive ones), then one of that tier's traffic models; tiers from
-- Rare up keep their own paint when they are sports / named models, every other car gets a traffic paint. Faster tiers cruise faster (cru).
local TR = Rules.traffic
local function rollCar(e)
	local zi = e and tonumber(string.sub(TR.ezone, e.id, e.id)) or 0
	local w = TR.odds[zi + 1] or TR.odds[1]
	local r, tier = math.random(), 0
	while tier < 4 and r >= w[tier + 1] do
		r -= w[tier + 1]
		tier += 1
	end
	local pool = TR.pools[tier + 1]
	local ix = pool[math.random(#pool)]
	local c = Config.CARS[ix]
	local col = (tier >= 2 and string.sub(TR.own, ix, ix) == "1") and Traffic.hex(c.col) or PAINT[math.random(#PAINT)]
	local function R(a, b) return a + math.random() * (b - a) end
	local cru = tier >= 3 and R(1, 1.3) or tier == 2 and R(0.98, 1.25) or tier == 1 and R(0.9, 1.15) or R(0.85, 1.1)
	return c, cru, col
end
Traffic.rollCar = rollCar

-- (re)place a traffic car on a road rmin-640 m from the player (the web game's respawn / pickSeg)
local function spawn(a, rmin)
	local st = State.st
	for _ = 1, 120 do
		local ang, r = math.random() * 2 * math.pi, (rmin or 260) + math.random() * (640 - (rmin or 260))
		local near = Road.nearest(State.road, st.x + math.cos(ang) * r, st.z + math.sin(ang) * r, 50)
		if near and not near.e.track and math.random() < (TRW[near.e.fk] or 0.4) then
			local d = near.e.ow and 1 or (math.random() < 0.5 and 1 or -1)
			-- a new car for the new street (the web game re-rolls the model at every respawn)
			local c, cru, col = rollCar(near.e)
			Traffic.setCar(a, c, col)
			a.cru = cru
			a.trs = { { e = near.e, d = d } }
			a.dead = false
			rebuild(a)
			a.s = d > 0 and near.s or near.e.len - near.s
			extend(a)
			a.v, a.hit, a.stuck = 0, 0, 0
			local x, z, y, tx, tz, i = Road.sample(a.P, a.s, 1)
			a.x, a.z, a.y, a.pi, a.h = x, z, y, i, math.atan2(tx, tz)
			return true
		end
	end
	a.x, a.z = 1e5, 1e5
	return false
end

function Traffic.start()
	for _ = 1, Config.TRAFFIC_CARS do
		local car, cru, col = rollCar(nil)
		local a = Traffic.agent("traffic", car, col)
		a.cru = cru
		agents[#agents + 1] = a
		spawn(a, 40)
		Traffic.draw(a)
	end
end

-- the traffic density (the web game's trApply): the first round(N x den) cars drive, the others are parked far away; soft = a car
-- within 250 m of the player is never parked (By time of day changes)
function Traffic.density(den, soft)
	local n = math.floor(#agents * den + 0.5)
	local st = State.st
	for i, a in ipairs(agents) do
		local pk = i > n
		if pk ~= (a.park == true) and not (soft and pk and math.sqrt((a.x - st.x) ^ 2 + (a.z - st.z) ^ 2) < 250) then
			a.park = pk
			if pk then
				a.x, a.z, a.v = 2e5, 2e5, 0
				Traffic.draw(a)
			else
				a.x, a.z = 1e5, 1e5
			end
		end
	end
end
function Traffic.driving()
	local n = 0
	for _, a in ipairs(agents) do
		if not a.park then n += 1 end
	end
	return n
end

-- move traffic cars out of a circle (race starts)
function Traffic.clear(x, z, r)
	for _, a in ipairs(agents) do
		if (a.x - x) ^ 2 + (a.z - z) ^ 2 < r * r then spawn(a, 200) end
	end
end

local Signals
function Traffic.step(dt)
	Signals = Signals or State.signals
	local st = State.st
	for _, a in ipairs(agents) do
		if a.park then
			-- a parked car (traffic density): not simulated
			continue
		end
		if a.x > 9e4 then
			spawn(a, 60)
		else
			extend(a)
			-- the street's limit, the cruise factor, bends
			local ti = 1
			while ti < #a.trs and a.s > a.P.ends[ti] do ti += 1 end
			local tgt = 13 * a.cru * a.trs[ti].e.lim / 50
			tgt = math.min(tgt, Traffic.curveCap(a, 10) * 0.8)
			-- junctions within 110 m: stop 11 m before a red light (or an amber one it cannot clear), 8 m/s near a roundabout
			for k = ti, #a.trs do
				local d = a.P.ends[k] - a.s
				if d > 110 then break end
				local tr = a.trs[k]
				local nd = State.road.nodes[tr.d > 0 and tr.e.b or tr.e.a]
				if nd.lit and Signals then
					local dd = d - 11
					local l = Signals.at(nd, tr.e)
					if dd > -4 and (l == "r" or (l == "y" and dd > a.v * 0.9)) then tgt = math.min(tgt, math.sqrt(7 * math.max(dd, 0))) end
				elseif nd.rb and d < 38 then
					tgt = math.min(tgt, 8)
				end
			end
			-- the car ahead: keep 6.5 m; behind the player the gap of the road reputation (6.5 m, up to 12 m when it is low)
			local sh, ch = math.sin(a.h), math.cos(a.h)
			local function gap(x, z, g)
				local dx, dz = x - a.x, z - a.z
				local f = dx * sh + dz * ch
				if f > 0 and f < 26 and math.abs(dx * ch - dz * sh) < 2.6 then tgt = math.min(tgt, math.max(0, (f - g) * 0.9)) end
			end
			for _, o in ipairs(State.ai) do
				if o ~= a then gap(o.x, o.z, 6.5) end
			end
			gap(st.x, st.z, State.repGap or 6.5)
			if a.hit > 0 then
				a.hit -= dt
				tgt = 0
			end
			-- +3 m/s^2 up, -9 m/s^2 down
			a.v = tgt > a.v and math.min(tgt, a.v + 3 * dt) or math.max(tgt, a.v - 9 * dt)
			a.s = math.min(a.s + a.v * dt, a.P.c[#a.P.c])
			local x, z, y, tx, tz, i = Road.sample(a.P, a.s, a.pi)
			a.x, a.z, a.y, a.pi = x, z, y, i
			local want = math.atan2(tx, tz)
			a.h += math.clamp((want - a.h + math.pi) % (2 * math.pi) - math.pi, -2.8 * dt, 2.8 * dt)
			a.stuck = (a.v < 0.4 and a.hit <= 0) and a.stuck + dt or 0
			if (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2 > 680 * 680 or a.stuck > 14 or (a.dead and a.s >= a.P.c[#a.P.c] - 3) then
				spawn(a, 260)
			end
			Traffic.draw(a)
		end
	end
end

return Traffic
