-- Irbid Drive (Roblox) - the web game's street furniture and vegetation (its instanced props, exported per family by tools/make_roblox.js:
-- street lights, utility poles and transformers, road-sign posts and plates, guardrails, bus stops, roundabout islands, dumpsters, traffic
-- cones, manhole covers, tree trunks, round / pine / palm / olive canopies, cypresses, bushes, rocks; about 80,000 within the map). Like the
-- web game, each family is drawn only within its level-of-detail radius around the player (lamps and trees 420 m, rails 330 m, signs 230 m,
-- bins 200 m ...), so this device builds the props of the 100 m cells near the car and removes those that fall behind (twice a second).
-- Each prop names the roadside object it belongs to (its collider in Modules/Objects): Client/Objects.lua is told when one is built or
-- removed (Props.onBuilt / Props.onRemoved) and draws the object's state (bent, fallen, shoved). Cones (cypresses) are tapered in the web
-- game: here cylinders. The sign plates carry the web game's text (street names in the blue plates, speed limits, STOP) as a SurfaceGui.
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")

local Props = { fam = {} }
local S = Config.SCALE
local CELL = 100
local CYL = CFrame.Angles(0, 0, math.pi / 2)
local folder = Instance.new("Folder")
folder.Name = "Props_" .. Players.LocalPlayer.UserId
folder.Parent = Workspace
Props.folder = folder
local MAT = { trunk = Enum.Material.Wood, canopy = Enum.Material.Grass, olive = Enum.Material.Grass, cypress = Enum.Material.Grass, bush = Enum.Material.Grass,
	island = Enum.Material.Grass, rock = Enum.Material.Rock, utilPole = Enum.Material.Concrete, utilArm = Enum.Material.Concrete, lampHead = Enum.Material.Neon,
	lampPole = Enum.Material.Metal, signPost = Enum.Material.Metal, railBeam = Enum.Material.Metal }
-- hooks (Client/Objects.lua): onBuilt(part, collider id, kind) -> false to leave the part out (a broken object), onRemoved(part, id)
Props.onBuilt, Props.onRemoved = nil, nil

local function hex(c)
	return Color3.fromRGB(math.floor(c / 65536) % 256, math.floor(c / 256) % 256, c % 256)
end
Props.hex = hex

-- the families: rows of W numbers, cells of item indices. Props: x, z (dm), y (cm), heading (mrad), size (cm x 3), colour, collider id.
-- Sign plates: x, z (dm), bottom y (cm), heading (mrad), width, height (cm), big (1 = a speed limit / STOP disc), collider id; + the text.
local function key(i, j)
	return (i + 500) * 1000 + (j + 500)
end
for _, m in ipairs(Shared:GetChildren()) do
	if string.sub(m.Name, 1, 6) == "Props_" then
		local d = require(m)
		local id = string.match(m.Name, "^Props_(%d+)_")
		local F = Props.fam[id]
		if not F then
			F = { kind = d.kind, shape = d.shape, R = d.R, W = 9, v = {}, cells = {}, built = {} }
			Props.fam[id] = F
		end
		for n in string.gmatch(d.rows, "-?%d+") do F.v[#F.v + 1] = tonumber(n) end
	end
end
do
	local m = Shared:FindFirstChild("Signs")
	if m then
		local d = require(m)
		local F = { kind = "signPlate", shape = "plate", R = d.R, W = 8, v = {}, cells = {}, built = {}, text = d.text }
		for n in string.gmatch(d.rows, "-?%d+") do F.v[#F.v + 1] = tonumber(n) end
		Props.fam.signs = F
	end
end
Props.count = 0
for _, F in pairs(Props.fam) do
	for i = 1, #F.v, F.W do
		local k = key(math.floor(F.v[i] / 10 / CELL), math.floor(F.v[i + 1] / 10 / CELL))
		F.cells[k] = F.cells[k] or {}
		table.insert(F.cells[k], i)
		Props.count += 1
	end
end

-- a sign plate: the web game's atlas cells drawn as a SurfaceGui (street name: blue, white rim, white capitals; limit: white disc, red ring;
-- STOP: red octagon, here a red square with a white rim)
local function plate(F, i)
	local v = F.v
	local x, z, y, h = v[i] / 10, v[i + 1] / 10, v[i + 2] / 100, v[i + 3] / 1000
	local w, ht, big = v[i + 4] / 100, v[i + 5] / 100, v[i + 6] == 1
	local text = F.text[(i - 1) / F.W + 1] or ""
	local p = Instance.new("Part")
	p.Name = "signPlate"
	p.Anchored = true
	p.CanCollide, p.CanQuery, p.CanTouch = false, false, false
	p.Material = Enum.Material.Metal
	p.Color = Color3.fromRGB(141, 147, 154)
	p.Size = Vector3.new(w * S, ht * S, 0.03 * S)
	-- the plate faces (sin h, cos h): a part's +Z turned by h
	p.CFrame = CFrame.new(x * S, (y + ht / 2) * S, z * S) * CFrame.Angles(0, h, 0)
	local g = Instance.new("SurfaceGui")
	g.Face = Enum.NormalId.Back
	g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	g.PixelsPerStud = 40
	g.LightInfluence = 1
	g.Parent = p
	local f = Instance.new("TextLabel")
	f.Size = UDim2.fromScale(1, 1)
	f.BorderSizePixel = 0
	f.Font = Enum.Font.GothamBold
	f.TextScaled = true
	f.Text = text
	local st = Instance.new("UIStroke")
	st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	st.Parent = f
	if big and text ~= "STOP" then
		f.BackgroundColor3, f.TextColor3, st.Color, st.Thickness = Color3.new(1, 1, 1), Color3.fromRGB(17, 17, 17), Color3.fromRGB(212, 31, 31), 10
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0.5, 0)
		c.Parent = f
	elseif big then
		f.BackgroundColor3, f.TextColor3, st.Color, st.Thickness = Color3.fromRGB(212, 31, 31), Color3.new(1, 1, 1), Color3.new(1, 1, 1), 5
	else
		f.BackgroundColor3, f.TextColor3, st.Color, st.Thickness = Color3.fromRGB(11, 90, 168), Color3.new(1, 1, 1), Color3.new(1, 1, 1), 3
	end
	local pad = Instance.new("UIPadding")
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0.05, 0), UDim.new(0.05, 0)
	pad.Parent = f
	f.Parent = g
	return p
end

local function make(F, i)
	local v = F.v
	if F.shape == "plate" then return plate(F, i) end
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
	return p
end
-- the collider id of item i (0 = none)
local function cidOf(F, i)
	return F.v[i + F.W - 1]
end

-- twice a second: the cells within each family's radius are built, cells beyond it (+ 60 m) removed
local t = 0
Props.live = 0
function Props.refresh()
	t = 0
end
function Props.step(dt, st)
	t -= dt
	if t > 0 then return end
	t = 0.5
	local ci, cj = math.floor(st.x / CELL), math.floor(st.z / CELL)
	for _, F in pairs(Props.fam) do
		local r = math.ceil(F.R / CELL)
		-- remove far cells
		for k, list in pairs(F.built) do
			local i, j = math.floor(k / 1000) - 500, k % 1000 - 500
			local dx, dz = (i + 0.5) * CELL - st.x, (j + 0.5) * CELL - st.z
			if dx * dx + dz * dz > (F.R + 60) ^ 2 then
				for _, e in ipairs(list) do
					if Props.onRemoved and e[2] ~= 0 then Props.onRemoved(e[1], e[2]) end
					e[1]:Destroy()
				end
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
						for _, idx in ipairs(items) do
							local p = make(F, idx)
							local cid = cidOf(F, idx)
							if cid ~= 0 and Props.onBuilt and Props.onBuilt(p, cid, F.kind) == false then
								p:Destroy()
							else
								p.Parent = folder
								list[#list + 1] = { p, cid }
							end
						end
						F.built[k] = list
						Props.live += #list
					end
				end
			end
		end
	end
end

return Props
