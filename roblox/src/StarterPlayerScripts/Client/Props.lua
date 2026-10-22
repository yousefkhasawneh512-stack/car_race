-- Irbid Drive (Roblox) - the web game's street furniture and vegetation (its instanced props, exported per family by tools/make_roblox.js:
-- street lights, utility poles and transformers, guardrails, bus stops, roundabout islands, dumpsters, traffic cones, manhole covers, tree
-- trunks, round / pine / palm / olive canopies, cypresses, bushes, rocks; about 77,000 within the map). Like the web game, each family is
-- drawn only within its level-of-detail radius around the player (lamps and trees 420 m, rails 330 m, bins 200 m ...), so this device
-- builds the props of the 100 m cells near the car and removes those that fall behind (checked twice a second). Scenery only: they do not
-- collide yet (the web game's breakable poles, trees and bins are not ported). Cones (cypresses) are tapered in the web game: here cylinders.
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Client = script.Parent
local State = require(Client:WaitForChild("State"))

local Props = { fam = {} }
local S = Config.SCALE
local CELL = 100
local CYL = CFrame.Angles(0, 0, math.pi / 2)
local folder = Instance.new("Folder")
folder.Name = "Props_" .. Players.LocalPlayer.UserId
folder.Parent = Workspace
Props.folder = folder
local MAT = { trunk = Enum.Material.Wood, canopy = Enum.Material.Grass, olive = Enum.Material.Grass, cypress = Enum.Material.Grass, bush = Enum.Material.Grass,
	island = Enum.Material.Grass, rock = Enum.Material.Rock, utilPole = Enum.Material.Concrete, utilArm = Enum.Material.Concrete, lampHead = Enum.Material.Neon }

local function hex(c)
	return Color3.fromRGB(math.floor(c / 65536) % 256, math.floor(c / 256) % 256, c % 256)
end

-- the families: rows of 8 numbers (x, z dm; y cm; heading mrad; size cm x 3; colour), cells of item indices
local function key(i, j)
	return (i + 500) * 1000 + (j + 500)
end
for _, m in ipairs(Shared:GetChildren()) do
	if string.sub(m.Name, 1, 6) == "Props_" then
		local d = require(m)
		local id = string.match(m.Name, "^Props_(%d+)_")
		local F = Props.fam[id]
		if not F then
			F = { kind = d.kind, shape = d.shape, R = d.R, v = {}, cells = {}, built = {} }
			Props.fam[id] = F
		end
		for n in string.gmatch(d.rows, "-?%d+") do F.v[#F.v + 1] = tonumber(n) end
	end
end
Props.count = 0
for _, F in pairs(Props.fam) do
	for i = 1, #F.v, 8 do
		local k = key(math.floor(F.v[i] / 10 / CELL), math.floor(F.v[i + 1] / 10 / CELL))
		F.cells[k] = F.cells[k] or {}
		table.insert(F.cells[k], i)
		Props.count += 1
	end
end

local function make(F, i)
	local v = F.v
	local x, z, y, h = v[i] / 10, v[i + 1] / 10, v[i + 2] / 100, v[i + 3] / 1000
	local sx, sy, sz = v[i + 4] / 100 * S, v[i + 5] / 100 * S, v[i + 6] / 100 * S
	local p = Instance.new("Part")
	p.Name = F.kind
	p.Anchored = true
	p.CanCollide, p.CanQuery, p.CanTouch = false, false, false
	p.CastShadow = F.kind ~= "manhole"
	p.Color = hex(v[i + 7])
	p.Material = MAT[F.kind] or Enum.Material.SmoothPlastic
	local cf = CFrame.new(x * S, y * S, z * S) * CFrame.Angles(0, h, 0)
	if F.shape == "cyl" or F.shape == "cone" then
		local k = F.shape == "cone" and 0.6 or 1
		p.Shape = Enum.PartType.Cylinder
		p.Size = Vector3.new(math.max(0.05, sy), math.max(0.05, sx * k), math.max(0.05, sz * k))
		p.CFrame = cf * CYL
	else
		p.Size = Vector3.new(math.max(0.05, sx), math.max(0.05, sy), math.max(0.05, sz))
		p.CFrame = cf
		if F.shape == "ball" then
			local m = Instance.new("SpecialMesh")
			m.MeshType = Enum.MeshType.Sphere
			m.Parent = p
		end
	end
	p.Parent = folder
	return p
end

-- twice a second: the cells within each family's radius are built, cells beyond it (+ 60 m) removed
local t = 0
Props.live = 0
function Props.step(dt)
	t -= dt
	if t > 0 then return end
	t = 0.5
	local st = State.st
	local ci, cj = math.floor(st.x / CELL), math.floor(st.z / CELL)
	for _, F in pairs(Props.fam) do
		local r = math.ceil(F.R / CELL)
		-- remove far cells
		for k, list in pairs(F.built) do
			local i, j = math.floor(k / 1000) - 500, k % 1000 - 500
			local dx, dz = (i + 0.5) * CELL - st.x, (j + 0.5) * CELL - st.z
			if dx * dx + dz * dz > (F.R + 60) ^ 2 then
				for _, p in ipairs(list) do p:Destroy() end
				Props.live -= #list
				F.built[k] = nil
			end
		end
		-- build near cells
		for i = ci - r, ci + r do
			for j = cj - r, cj + r do
				local k = key(i, j)
				local items = F.cells[k]
				if items and not F.built[k] then
					local dx, dz = (i + 0.5) * CELL - st.x, (j + 0.5) * CELL - st.z
					if dx * dx + dz * dz <= F.R * F.R then
						local list = {}
						for _, idx in ipairs(items) do list[#list + 1] = make(F, idx) end
						F.built[k] = list
						Props.live += #list
					end
				end
			end
		end
	end
end

return Props
