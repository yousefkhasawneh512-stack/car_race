-- Irbid Drive (Roblox) - AI cars on this device: traffic that drives the real OSM road graph in the right-hand lane at each street's
-- speed limit, slows for bends and for the car ahead (and for the player), picks a random way at every junction (no U-turns), and is
-- moved back near the player when it gets far away. Also the shared pieces the race rivals and the police use (models, path following).
-- Every device has its own traffic (other players do not see the same AI cars).
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local State = require(script.Parent:WaitForChild("State"))

local Traffic = {}
local S = Config.SCALE
local folder = Instance.new("Folder")
folder.Name = "LocalAI_" .. Players.LocalPlayer.UserId
folder.Parent = Workspace
Traffic.folder = folder
local agents = {}
Traffic.agents = agents

local PAINT = { Color3.fromRGB(235, 235, 235), Color3.fromRGB(30, 30, 34), Color3.fromRGB(150, 155, 160), Color3.fromRGB(170, 30, 30),
	Color3.fromRGB(25, 70, 150), Color3.fromRGB(240, 200, 40), Color3.fromRGB(60, 120, 70), Color3.fromRGB(120, 90, 60) }

-- a simple car model (anchored, no collision, ignored by ray tests); pivot = body centre
function Traffic.model(L, W, H, color, cop)
	local m = Instance.new("Model")
	local function part(name, size, cf, col, mat, shape)
		local p = Instance.new("Part")
		p.Name = name
		p.Anchored = true
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.Size = size
		p.CFrame = cf
		p.Color = col
		p.Material = mat or Enum.Material.SmoothPlastic
		if shape then p.Shape = shape end
		p.Parent = m
		return p
	end
	L, W, H = L * S, W * S, H * S
	local body = part("Body", Vector3.new(W, H * 0.55, L), CFrame.new(), color)
	m.PrimaryPart = body
	part("Cabin", Vector3.new(W * 0.86, H * 0.42, L * 0.48), CFrame.new(0, H * 0.48, L * 0.05), cop and Color3.fromRGB(240, 240, 240) or Color3.fromRGB(30, 36, 44), Enum.Material.Glass)
	local wr = H * 0.22
	for _, q in ipairs({ { 1, -1 }, { -1, -1 }, { 1, 1 }, { -1, 1 } }) do
		part("Wheel", Vector3.new(W * 0.12, wr * 2, wr * 2), CFrame.new(q[1] * W * 0.47, -H * 0.12, q[2] * L * 0.32), Color3.fromRGB(20, 20, 20), nil, Enum.PartType.Cylinder)
	end
	for _, x in ipairs({ -1, 1 }) do
		part("Headlight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, -L * 0.5), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
		part("Taillight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, L * 0.5), Color3.fromRGB(150, 10, 10), Enum.Material.Neon)
	end
	if cop then
		part("LightR", Vector3.new(W * 0.3, 0.4, 0.8), CFrame.new(-W * 0.18, H * 0.72, L * 0.05), Color3.fromRGB(255, 30, 30), Enum.Material.Neon)
		part("LightB", Vector3.new(W * 0.3, 0.4, 0.8), CFrame.new(W * 0.18, H * 0.72, L * 0.05), Color3.fromRGB(30, 80, 255), Enum.Material.Neon)
	end
	m.Parent = folder
	return m
end

-- an AI car: position / heading / speed in metres, a polyline to follow (P) and the distance along it (s)
function Traffic.agent(kind, car, color)
	local c = car or Config.CARS[math.random(#Config.CARS)]
	local a = {
		kind = kind, cop = kind == "cop", L = c.L, W = c.W, H = c.H, vm = c.vm, a0 = c.a0,
		x = 0, z = 0, y = 0, h = 0, v = 0, s = 0, pi = 1, hit = 0, active = true, skill = 1,
	}
	a.model = Traffic.model(c.L, c.W, c.H, color or PAINT[math.random(#PAINT)], a.cop)
	return a
end

function Traffic.draw(a)
	local pos = Vector3.new(a.x, a.y + 0.1 + a.H * 0.34, a.z) * S
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
function Traffic.curveCap(a)
	local P, j = a.P, a.pi
	local c0, best = a.s, 1e9
	while j + 3 <= #P.x and P.c[j] - c0 < 150 do
		local a1 = math.atan2(P.x[j + 1] - P.x[j], P.z[j + 1] - P.z[j])
		local a2 = math.atan2(P.x[j + 3] - P.x[j + 2], P.z[j + 3] - P.z[j + 2])
		local sa = math.max(0.02, math.abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi))
		local cp = math.clamp(math.sqrt(224 / sa), 9, 120)
		best = math.min(best, math.sqrt(cp * cp + 2 * 8 * math.max(0, P.c[j] - c0 - 4)))
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

-- ---- traffic: random routes over the graph ----
local function nextTrav(tr)
	local e, d = tr.e, tr.d
	local node = State.road.nodes[d > 0 and e.b or e.a]
	-- direction of arrival
	local n = e.n
	local ax, az
	if d > 0 then
		ax, az = e.x[n] - e.x[math.max(1, n - 1)], e.z[n] - e.z[math.max(1, n - 1)]
	else
		ax, az = e.x[1] - e.x[2], e.z[1] - e.z[2]
	end
	local al = math.max(math.sqrt(ax * ax + az * az), 1e-6)
	local opts, wsum = {}, 0
	for _, o in ipairs(node.out) do
		if not (o.e == e and o.d == -d) and o.e.kind ~= 2 then
			local oe = o.e
			local bx, bz
			if o.d > 0 then
				bx, bz = oe.x[2] - oe.x[1], oe.z[2] - oe.z[1]
			else
				bx, bz = oe.x[oe.n - 1] - oe.x[oe.n], oe.z[oe.n - 1] - oe.z[oe.n]
			end
			local cs = (ax * bx + az * bz) / (al * math.max(math.sqrt(bx * bx + bz * bz), 1e-6))
			local w = (1.2 + cs) ^ 2
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

-- keep 160 m of path ahead, and drop traversals already driven
local function extend(a)
	local changed = false
	while a.P.c[#a.P.c] - a.s < 160 and #a.trs < 12 do
		local nt = nextTrav(a.trs[#a.trs])
		if not nt then break end
		a.trs[#a.trs + 1] = nt
		rebuild(a)
		changed = true
	end
	if #a.trs > 3 and a.s > a.P.ends[1] + 25 then
		local cut = a.P.ends[1]
		table.remove(a.trs, 1)
		rebuild(a)
		a.s = math.max(0, a.s - cut)
		changed = true
	end
	return changed
end

-- (re)place a traffic car on a road 140-420 m from the player
local function spawn(a)
	local st = State.st
	for _ = 1, 12 do
		local ang, r = math.random() * 2 * math.pi, 140 + math.random() * 280
		local near = Road.nearest(State.road, st.x + math.sin(ang) * r, st.z + math.cos(ang) * r, 60)
		if near and near.e.kind ~= 2 and near.e.len > 20 then
			local d = near.e.ow and 1 or (math.random() < 0.5 and 1 or -1)
			a.trs = { { e = near.e, d = d } }
			rebuild(a)
			a.s = d > 0 and near.s or near.e.len - near.s
			a.pi = 1
			extend(a)
			a.v = math.min(near.e.lim / 3.6, 12)
			a.lim = near.e.lim
			a.skill = 0.8 + math.random() * 0.2
			local x, z, y, tx, tz, i = Road.sample(a.P, a.s, 1)
			a.x, a.z, a.y, a.pi, a.h = x, z, y, i, math.atan2(tx, tz)
			a.hit = 0
			return true
		end
	end
	return false
end

function Traffic.start()
	for _ = 1, Config.TRAFFIC_CARS do
		local a = Traffic.agent("traffic")
		a.vm = math.min(a.vm, 33)
		if spawn(a) then
			agents[#agents + 1] = a
			Traffic.draw(a)
		else
			Traffic.remove(a)
		end
	end
end

-- move traffic cars out of a circle (race starts)
function Traffic.clear(x, z, r)
	for _, a in ipairs(agents) do
		if (a.x - x) ^ 2 + (a.z - z) ^ 2 < r * r then spawn(a) end
	end
end

function Traffic.step(dt)
	local st = State.st
	for _, a in ipairs(agents) do
		if (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2 > 520 * 520 then
			spawn(a)
		end
		extend(a)
		-- the speed limit of the street this car is on
		local ti = 1
		while ti < #a.trs and a.s > a.P.ends[ti] do ti += 1 end
		local lim = a.trs[ti].e.lim / 3.6
		local vt = math.min(a.vm, lim * a.skill, Traffic.curveCap(a))
		vt = Traffic.gap(a, vt)
		-- dead end: stop, then reappear somewhere else
		if a.s >= a.P.c[#a.P.c] - 1 then
			a.stuck = (a.stuck or 0) + dt
			if a.stuck > 3 then
				a.stuck = 0
				spawn(a)
			end
		end
		Traffic.follow(a, dt, vt)
		Traffic.draw(a)
	end
end

return Traffic
