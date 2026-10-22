-- Irbid Drive (Roblox) - the web game's hand-built landmarks (06b / 06c / 06g2 / 06i: the Al-Balad sites, the clock square, the heritage
-- houses on their OSM footprints, arches, gantries ...), exported mesh by mesh with their real positions, rotations, sizes and colours
-- (tools/make_roblox.js). Boxes stay boxes; cylinders, spheres (ellipsoids) and discs are Roblox cylinders / sphere meshes; cones are
-- thinner cylinders (Roblox has no cone without an uploaded mesh); extruded shapes and planes are their bounding boxes. The web game's
-- textures (canvas-drawn detail) are not reproduced. These parts do not collide: the web game's colliders for the landmarks (its wall boxes and
-- columns) are in Modules/Objects with the other roadside colliders.
local ServerStorage = game:GetService("ServerStorage")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local function hex(c)
	return Color3.fromRGB(math.floor(c / 65536) % 256, math.floor(c / 256) % 256, c % 256)
end
local CYL = CFrame.Angles(0, 0, math.pi / 2) -- three.js cylinders stand on Y, Roblox's lie on X
local DISC = CFrame.Angles(0, -math.pi / 2, 0) -- a three.js circle faces +Z

return function(map)
	local S = Config.SCALE
	local data = ServerStorage:WaitForChild("IrbidData"):FindFirstChild("Landmarks")
	if not data then return end
	local f = Instance.new("Folder")
	f.Name = "Landmarks"
	f.Parent = map
	for i, row in ipairs(require(data)) do
		local v = string.split(row, ",")
		local shape = v[1]
		local n = {}
		for k = 2, #v do n[k - 1] = tonumber(v[k]) end
		local pos = Vector3.new(n[1], n[2], n[3]) * S
		local sx, sy, sz = math.abs(n[4]) * S, math.abs(n[5]) * S, math.abs(n[6]) * S
		local cf = CFrame.fromMatrix(pos, Vector3.new(n[7], n[8], n[9]), Vector3.new(n[10], n[11], n[12]), Vector3.new(n[13], n[14], n[15]))
		local p = Instance.new("Part")
		p.Name = "Landmark"
		p.Anchored = true
		p.CanCollide, p.CanTouch, p.CanQuery = false, false, false
		p.Material = n[18] == 1 and Enum.Material.Neon or Enum.Material.SmoothPlastic
		p.Color = hex(n[16])
		p.Transparency = n[17] / 100
		if shape == "cyl" or shape == "cone" then
			local k = shape == "cone" and 0.55 or 1
			p.Shape = Enum.PartType.Cylinder
			p.Size = Vector3.new(math.max(0.05, sy), math.max(0.05, sx * k), math.max(0.05, sz * k))
			p.CFrame = cf * CYL
		elseif shape == "disc" then
			p.Shape = Enum.PartType.Cylinder
			p.Size = Vector3.new(0.05, math.max(0.05, sx), math.max(0.05, sy))
			p.CFrame = cf * DISC
		else
			p.Size = Vector3.new(math.max(0.05, sx), math.max(0.05, sy), math.max(0.05, sz))
			p.CFrame = cf
			if shape == "ball" then
				local m = Instance.new("SpecialMesh")
				m.MeshType = Enum.MeshType.Sphere
				m.Parent = p
			end
		end
		p.Parent = f
		if i % 400 == 0 then task.wait() end
	end
end
