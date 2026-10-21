-- Irbid Drive (Roblox) - road furniture from the web game, at its positions:
--   traffic signal heads: a 4 m pole at the near-side kerb 9 m before the junction, a black 3-lamp housing facing the drivers, and a
--   white stop line 10 m back (lamps are recoloured by each device: Client/Signals); speed bumps (yellow / black, 75 mm; most are
--   ESTIMATED positions, as in the web game); the three stunt ramps; the drift zone (a marked circle).
-- Positions are in metres in the flat frame; heights come from the exported terrain heights.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local MapData = require(script.Parent:WaitForChild("MapData"))
local Signs = require(script.Parent:WaitForChild("Signs"))

local Furniture = {}
local S = MapData.S

local function part(parent, name, size, cf, color, mat, collide)
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.CanCollide = collide == true
	p.CanQuery = false
	p.CanTouch = false
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	p.Parent = parent
	return p
end

function Furniture.signals(map)
	local f = Instance.new("Folder")
	f.Name = "Signals"
	for _, h in ipairs(Rules.heads) do
		local m = Instance.new("Model")
		m.Name = "Head"
		m:SetAttribute("a", h.a)
		m:SetAttribute("o", h.o)
		local base = CFrame.new(h.x * S, h.y * S, h.z * S) * CFrame.Angles(0, h.f, 0)
		part(m, "Pole", Vector3.new(0.16, 4, 0.16) * S, base * CFrame.new(0, 2 * S, 0), Color3.fromRGB(90, 95, 99))
		part(m, "Housing", Vector3.new(0.36, 1.05, 0.26) * S, base * CFrame.new(0, 3.35 * S, 0), Color3.fromRGB(20, 21, 22))
		-- lamps on the side that faces the approaching drivers (the head faces along h.f), red on top
		for k, c in ipairs({ "r", "y", "g" }) do
			local lamp = part(m, "Lamp_" .. c, Vector3.new(0.26, 0.26, 0.05) * S, base * CFrame.new(0, (3.69 - (k - 1) * 0.33) * S, 0.14 * S), Color3.fromRGB(30, 30, 30), Enum.Material.Neon)
			lamp.Shape = Enum.PartType.Block
		end
		-- stop line across the approach (half the carriageway)
		part(m, "StopLine", Vector3.new(h.w, 0.04, 0.6) * S, CFrame.new(h.lx * S, (h.y + 0.13) * S, h.lz * S) * CFrame.Angles(0, h.f, 0), Color3.fromRGB(242, 242, 242))
		m.Parent = f
	end
	f.Parent = map
end

function Furniture.bumps(map)
	local f = Instance.new("Folder")
	f.Name = "SpeedBumps"
	for _, b in ipairs(Rules.bumps) do
		-- a low strip across the road, striped yellow / black; the cars feel the real profile (Client/Ground.bumpAt)
		local ang = math.atan2(b.tx, b.tz)
		local n = math.max(6, math.floor(b.w / 0.6 + 0.5))
		for j = 0, n - 1 do
			local lat = -b.w / 2 + b.w * (j + 0.5) / n
			local cx, cz = b.x + b.tz * lat, b.z - b.tx * lat
			part(f, "Bump", Vector3.new(b.w / n, b.h, b.l * 0.7) * S, CFrame.new(cx * S, (b.y + 0.12 + b.h / 2) * S, cz * S) * CFrame.Angles(0, ang, 0),
				j % 2 == 0 and Color3.fromRGB(184, 153, 36) or Color3.fromRGB(23, 23, 26))
		end
	end
	f.Parent = map
end

function Furniture.ramps(map)
	local f = Instance.new("Folder")
	f.Name = "Ramps"
	for _, r in ipairs(Rules.ramps) do
		-- a wedge rising along +z (WedgePart: high at the back, +Z)
		local w = Instance.new("WedgePart")
		w.Name = "Ramp"
		w.Anchored = true
		w.CanQuery = false
		w.CanTouch = false
		w.Color = Color3.fromRGB(230, 120, 30)
		w.Material = Enum.Material.DiamondPlate
		w.Size = Vector3.new(r.w, r.h, r.l) * S
		w.CFrame = CFrame.new(r.x * S, (r.y + 0.12 + r.h / 2) * S, r.z * S)
		w.Parent = f
	end
	if #Rules.ramps > 0 then
		local r = Rules.ramps[1]
		Signs.sign(f, Vector3.new(r.x * S, (r.y + 14) * S, (r.z - 40) * S), "🚀 STUNT RAMPS · J", Color3.fromRGB(255, 150, 40), 1500, 320)
	end
	f.Parent = map
end

function Furniture.driftZones(map)
	local f = Instance.new("Folder")
	f.Name = "DriftZones"
	for _, q in ipairs(Rules.dzones) do
		local ring = part(f, "Zone", Vector3.new(0.05 * S, q.r * 2 * S, q.r * 2 * S), CFrame.new(q.x * S, (q.y + 0.15) * S, q.z * S) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(255, 80, 200), Enum.Material.Neon)
		ring.Shape = Enum.PartType.Cylinder
		ring.Transparency = 0.85
		Signs.sign(f, Vector3.new(q.x * S, (q.y + 20) * S, q.z * S), "🏁 " .. q.n .. " · no limits, no fines", Color3.fromRGB(255, 120, 220), 1500, 360)
	end
	f.Parent = map
end

return Furniture
