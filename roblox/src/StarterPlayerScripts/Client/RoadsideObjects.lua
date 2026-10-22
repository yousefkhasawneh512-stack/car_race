-- Irbid Drive (Roblox) - the web game's breakable and movable roadside objects on this device (07e_objects.js): the colliders of street
-- lights, utility poles, road signs, dumpsters, guardrails, trees, roundabout islands and landmark walls (Modules/Objects: the web colB test,
-- the car pushed out and bounced), and what the objects do when the car hits them with vehicle damage Cosmetic or Full (with damage Off
-- every object is rigid, as in the web game): street lights, utility poles and signs bend, then snap and fall along the car's path (a stump
-- stays); trees shake and shed leaves, the slimmest trunks fall; dumpsters are shoved, slide, turn, may tip, and stop where friction stops
-- them; guardrail segments deflect; walls get a scrape mark and dust. Debris: 48 pieces, as in the web game. The props stay drawn by
-- Client/Props.lua: this module is told when a prop of an object is built (Props.onBuilt) and puts it in the object's state. Every mass and
-- threshold is the web game's estimate (Modules/Objects).
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Modules = ReplicatedStorage:WaitForChild("Modules")
local Objects = require(Modules:WaitForChild("Objects"))
local Damage = require(Modules:WaitForChild("Damage"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Client = script.Parent
local Props = require(Client:WaitForChild("Props"))
local Ground = require(Client:WaitForChild("Ground"))
local State = require(Client:WaitForChild("State"))

local RO = { Objects = Objects }
local S = Config.SCALE
Damage.objects = Objects
-- the colliders, in the web game's order
do
	local mods = {}
	for _, m in ipairs(Shared:GetChildren()) do
		local k = string.match(m.Name, "^Objects_(%d+)$")
		if k then mods[#mods + 1] = { tonumber(k), m } end
	end
	table.sort(mods, function(a, b) return a[1] < b[1] end)
	local data = {}
	for i, m in ipairs(mods) do data[i] = require(m[2]) end
	Objects.load(data)
end
RO.count = #Objects.list

local folder = Instance.new("Folder")
folder.Name = "Objects_" .. Players.LocalPlayer.UserId
folder.Parent = Workspace
RO.folder = folder
local function part(name, size, color, mat)
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.CanCollide, p.CanQuery, p.CanTouch = false, false, false
	p.Size = size
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	return p
end
local function rgb(c)
	return Props.hex(c)
end

-- ---- the props of each object: the base instance (pole, trunk, post, rail, bin) and its attached ones (arm, lamp, transformer, canopies,
-- sign plate, lid) ----
local BASE = { lampPole = true, utilPole = true, signPost = true, trunk = true, railBeam = true, bin = true }
local reg = {} -- id -> {part -> {cf, size, base}}
RO.reg = reg
local function pose(o)
	local L = reg[o.id]
	if not L then return end
	for p, b in pairs(L) do
		if o.down then
			-- broken: the base becomes a stump (0.09 m), the rest is hidden (the web game's hideBrokenInstancedPole / hideInstance)
			if b.base and not o.mover then
				p.Size = Vector3.new(b.size.X, 0.09 * S, b.size.Z)
				if p.Shape == Enum.PartType.Cylinder then p.Size = Vector3.new(0.09 * S, b.size.Y, b.size.Z) end
				p.CFrame = (b.cf - b.cf.Position) + Vector3.new(b.cf.Position.X, (o.vy + 0.045) * S, b.cf.Position.Z)
			else
				p.Transparency = 1
				local g = p:FindFirstChildOfClass("SurfaceGui")
				if g then g.Enabled = false end
			end
		elseif o.mover then
			-- a shoved dumpster: the web game's placeMover (the lid keeps its height above the bin, turned with it)
			local q = o.mover
			if not b.base and b.up == nil then
				-- the lid's height above the bin (whichever was built first)
				for bp, bb in pairs(L) do
					if bb.base then b.up = (b.cf.Position.Y - bb.cf.Position.Y) / S end
				end
			end
			local y = Ground.TH(q.x, q.z) + (b.base and b.dy or (b.dy - (b.up or 0)))
			local rot = CFrame.fromEulerAnglesYXZ(q.tip, q.ry, 0)
			local cf = CFrame.new(q.x * S, y * S, q.z * S) * rot
			if not b.base then cf = CFrame.new(q.x * S, y * S, q.z * S) * rot * CFrame.new(0, (b.up or 0) * S, 0) end
			p.CFrame = cf
		elseif o.defl and o.defl > 0 then
			-- a guardrail segment pushed away from the car and lowered (deflectRail)
			p.CFrame = b.cf + Vector3.new(-o.dnx * o.defl, -o.defl * 0.25, -o.dnz * o.defl) * S
		elseif o.bent and o.bent > 0 and o.lx then
			-- bent / shaken: turned about the base by o.bent towards the push (leanObstacle: axis (dz, 0, -dx))
			local l = math.sqrt(o.lx * o.lx + o.lz * o.lz)
			if l < 1e-9 then l = 1 end
			local pv = Vector3.new(o.x, o.vy or b.cf.Position.Y / S, o.z) * S
			p.CFrame = CFrame.new(pv) * CFrame.fromAxisAngle(Vector3.new(o.lz / l, 0, -o.lx / l), o.bent) * CFrame.new(-pv) * b.cf
		else
			p.CFrame = b.cf
		end
	end
end
RO.pose = pose
Props.onBuilt = function(p, cid, kind)
	local o = Objects.list[cid]
	if not o then return true end
	reg[cid] = reg[cid] or {}
	local b = { cf = p.CFrame, size = p.Size, base = BASE[kind] == true }
	reg[cid][p] = b
	-- a dumpster's height above the ground, the lid's height above the bin
	local x0, z0 = o.mover and o.mover.x0 or o.x, o.mover and o.mover.z0 or o.z
	b.dy = p.Position.Y / S - Ground.TH(x0, z0)
	pose(o)
	return true
end
Props.onRemoved = function(p, cid)
	local L = reg[cid]
	if L then
		L[p] = nil
		if next(L) == nil then reg[cid] = nil end
	end
end

-- ---- debris (spawnDebris: 48 pieces) and scrape marks on walls (wallMark: 16) ----
local DEB_COL = { 0x9aa1a8, 0x8f8d86, 0x2f6b3a, 0x6b4a2f, 0xcfe9f5, 0xd9cfb8, 0x9a958a }
local DEB_SIZE = { 1, 1, 1, 1.3, 0.6, 2.6, 1.6 }
local debris, debI = {}, 0
for i = 1, 48 do
	local p = part("Debris", Vector3.new(0.16, 0.06, 0.1) * S, Color3.new(0.6, 0.6, 0.6))
	p.Transparency = 1
	p.CastShadow = false
	p.Parent = folder
	debris[i] = { p = p, age = 9, life = 1, vx = 0, vy = 0, vz = 0, sp = 0, x = 0, y = 0, z = 0, rx = 0, rz = 0 }
end
RO.debris = debris
local rnd = math.random
function RO.spawnDebris(x, y, z, dx, dz, n, kind)
	kind = kind or 0
	for _ = 1, n do
		debI = debI % #debris + 1
		local q = debris[debI]
		local k = DEB_SIZE[kind + 1]
		q.p.Size = Vector3.new(0.16, 0.06, 0.1) * k * S
		q.p.Color = rgb(DEB_COL[kind + 1])
		q.p.Transparency = kind == 4 and 0.25 or 0
		q.x, q.y, q.z = x + (rnd() - 0.5) * 0.4, y + rnd() * 0.4, z + (rnd() - 0.5) * 0.4
		q.age, q.life = 0, 1.8 + rnd()
		q.vx = dx * (1.5 + rnd() * 3) + (rnd() - 0.5) * 2
		q.vz = dz * (1.5 + rnd() * 3) + (rnd() - 0.5) * 2
		q.vy = 1 + rnd() * 2.5
		q.sp = (rnd() - 0.5) * 14
	end
end
local marks, markI = {}, 0
for i = 1, 16 do
	local p = part("WallMark", Vector3.new(1, 1, 0.02) * S, Color3.fromRGB(60, 58, 54))
	p.Transparency = 1
	p.CastShadow = false
	p.Parent = folder
	marks[i] = p
end
RO.marks = marks
local function wallMark(st, nx, nz, vn)
	markI = markI % #marks + 1
	local m = marks[markI]
	local rad = 2.2 * 0.55
	local x, z = st.x - nx * rad, st.z - nz * rad
	local s = math.clamp(0.5 + (vn - 6) * 0.07, 0.5, 2.2)
	m.Size = Vector3.new(s * 1.6, s * 0.8, 0.02) * S
	m.CFrame = CFrame.new((x + nx * 0.02) * S, (Ground.TH(x, z) + 0.55) * S, (z + nz * 0.02) * S) * CFrame.Angles(0, math.atan2(nx, nz), 0)
	m.Transparency = 0.45
	return m
end

-- ---- falling poles and trees (FALLING_POLES): a new pole (or trunk + canopy) turned about its base along the car's path ----
local falling = {}
RO.falling = falling
local function fall(o, st, kind)
	local yaw = math.atan2(st.vx ~= 0 and st.vx or math.sin(st.h), st.vz ~= 0 and st.vz or math.cos(st.h))
	local h = o.vh or 3
	local g = Instance.new("Model")
	g.Name = "Fallen_" .. (o.type or "object")
	local parts = {}
	if kind == "tree" then
		local r0 = math.max(0.12, (o.trunkD or 0.4) / 2)
		parts[#parts + 1] = { part("Trunk", Vector3.new(h, r0 * 1.8, r0 * 1.8) * S, rgb(0x6b4a2f), Enum.Material.Wood), h / 2, true }
		-- the first canopy, as it was drawn
		local cs
		for p, b in pairs(reg[o.id] or {}) do
			if not b.base and not cs then cs = b.size / S end
		end
		cs = cs or Vector3.new(3, 3, 3)
		local c = part("Canopy", Vector3.new(cs.X, cs.Y, cs.X) * S, rgb(0x2f6b3a), Enum.Material.Grass)
		local m = Instance.new("SpecialMesh")
		m.MeshType = Enum.MeshType.Sphere
		m.Parent = c
		parts[#parts + 1] = { c, h + cs.Y * 0.3, false }
	else
		local r0 = o.type == "sign" and 0.045 or 0.105
		parts[#parts + 1] = { part("Pole", Vector3.new(h, r0 * 2.3, r0 * 2.3) * S, rgb(o.type == "utilityPole" and 0x8f8d86 or 0x9aa1a8), Enum.Material.Metal), h / 2, true }
		if o.type == "sign" then parts[#parts + 1] = { part("Plate", Vector3.new(0.75, 0.75, 0.03) * S, rgb(0x9aa1a8), Enum.Material.Metal), h, false } end
	end
	for _, q in ipairs(parts) do
		if q[3] then q[1].Shape = Enum.PartType.Cylinder end
		q[1].Parent = g
	end
	g.Parent = folder
	local f = { g = g, parts = parts, age = 0, dur = kind == "tree" and 1.1 or (o.type == "sign" and 0.35 or 0.48), maxA = math.pi / 2 - (kind == "tree" and 0.12 or 0.05),
		base = CFrame.new(o.x * S, (o.vy or Ground.TH(o.x, o.z)) * S, o.z * S) * CFrame.Angles(0, yaw, 0), yaw = yaw }
	falling[#falling + 1] = f
	return f
end
local function placeFall(f)
	local k = math.clamp(f.age / f.dur, 0, 1)
	local cf = f.base * CFrame.Angles(k * k * f.maxA, 0, 0)
	for _, q in ipairs(f.parts) do
		local c = cf * CFrame.new(0, q[2] * S, 0)
		q[1].CFrame = q[3] and c * CFrame.Angles(0, 0, math.pi / 2) or c
	end
end

-- ---- what the hit did (the result of Damage.impact with the object's action) ----
function RO.apply(r, st, nx, nz, vn)
	local o, act = r.ob, r.act
	if not act then return end
	RO.last = r
	local c = Objects.class(o)
	if act == "break" then
		o.down = true
		local f = fall(o, st, "pole")
		placeFall(f)
		RO.spawnDebris(o.x, (o.vy or Ground.TH(o.x, o.z)) + 0.3, o.z, math.sin(f.yaw), math.cos(f.yaw), o.type == "sign" and 3 or 6, o.type == "utilityPole" and 1 or 0)
	elseif act == "fell" then
		o.down = true
		local f = fall(o, st, "tree")
		placeFall(f)
		local y = o.vy or Ground.TH(o.x, o.z)
		RO.spawnDebris(o.x, y + 0.5, o.z, math.sin(f.yaw), math.cos(f.yaw), 8, 3)
		RO.spawnDebris(o.x, y + 2, o.z, math.sin(f.yaw), math.cos(f.yaw), 6, 2)
	elseif act == "lean" or act == "shake" then
		o.lx, o.lz = -nx, -nz
		if act == "shake" then
			local y = o.vy or Ground.TH(o.x, o.z)
			RO.spawnDebris(o.x, y + 2.5, o.z, -nx, -nz, math.min(6, 2 + math.floor(r.amt * 30 + 0.5)), 2)
			RO.spawnDebris(o.x, y + 0.5, o.z, -nx, -nz, 2, 3)
		end
	elseif act == "deflect" then
		o.dnx, o.dnz = nx, nz
		if vn > 8 then RO.spawnDebris(st.x - nx * 1.6, st.y + 0.5, st.z - nz * 1.6, -nx, -nz, 3, 0) end
	elseif act == "shove" then
		RO.spawnDebris(o.x, Ground.TH(o.x, o.z) + 0.6, o.z, -nx, -nz, 2, 2)
	elseif act == "collapse" then
		o.down = true
		local y = o.vy or Ground.TH(o.x, o.z)
		for k = 0, 2 do RO.spawnDebris(o.x + (rnd() - 0.5) * (o.hw or 1) * 1.4, y + 0.4 + k * 0.3, o.z + (rnd() - 0.5) * (o.hw or 1) * 1.4, -nx, -nz, 4, 5) end
		RO.spawnDebris(o.x, y + 0.6, o.z, -nx, -nz, 5, 6)
	elseif act == "glass" then
		local y = (o.vy or Ground.TH(o.x, o.z)) + 1
		for k = 0, 2 do RO.spawnDebris(o.x + (rnd() - 0.5) * 2, y + k * 0.4, o.z + (rnd() - 0.5) * 2, -nx, -nz, 5, 4) end
	elseif act == "mark" then
		wallMark(st, nx, nz, vn)
		if c.cls == "masonry" then
			RO.spawnDebris(o.x, Ground.TH(o.x, o.z) + 0.6, o.z, -nx, -nz, 2, 5)
		else
			RO.spawnDebris(st.x - nx * 1.8, st.y + 0.6, st.z - nz * 1.8, -nx, -nz, 3, 6)
		end
	end
	if o.id then pose(o) end
end

-- ---- the player's car against the objects (the web game's colB(P) after the move): impact(v, object, nx, nz) -> the damage result ----
RO.impact = nil
function RO.collide(st)
	return Objects.collide(st, 2.2, function(v, a, nx, nz)
		local r = RO.impact and RO.impact(v, a, nx, nz)
		if r then RO.apply(r, st, nx, nz, v) end
		return r and r.gave or 0
	end)
end
-- an AI car driving freely (the police close to the player): pushed out and slowed (x0.9), as the web game's bots
function RO.collideAI(a)
	a.rad = a.rad or 1.3
	return Objects.collide(a, 1.3)
end

-- ---- every frame: the sliding dumpsters, falling poles, debris ----
local stopped = {}
function RO.step(dt)
	local now = Workspace.DistributedGameTime
	table.clear(stopped)
	local moving = {}
	for _, q in ipairs(Objects.MOVERS) do moving[#moving + 1] = q end
	Objects.step(dt, now, stopped)
	for _, q in ipairs(moving) do pose(q.o) end
	for _, q in ipairs(stopped) do pose(q.o) end
	for i = #falling, 1, -1 do
		local f = falling[i]
		f.age += dt
		placeFall(f)
		if f.age >= f.dur then table.remove(falling, i) end
	end
	for _, q in ipairs(debris) do
		if q.age < q.life then
			q.age += dt
			q.vy -= 9.81 * dt
			q.x += q.vx * dt
			q.y += q.vy * dt
			q.z += q.vz * dt
			q.rx += q.sp * dt
			q.rz += q.sp * 0.7 * dt
			local gy = Ground.TH(q.x, q.z) + 0.03
			if q.y < gy then
				q.y = gy
				q.vy *= -0.25
				q.vx *= 0.55
				q.vz *= 0.55
				q.sp *= 0.5
			end
			q.p.CFrame = CFrame.new(q.x * S, q.y * S, q.z * S) * CFrame.Angles(q.rx, 0, q.rz)
			if q.age >= q.life then q.p.Transparency = 1 end
		end
	end
end
State.objects = RO

return RO
