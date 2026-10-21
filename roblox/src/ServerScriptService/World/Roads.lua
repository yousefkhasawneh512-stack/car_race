-- Irbid Drive (Roblox) - roads: one part per OpenStreetMap segment, at the web game's road widths, sloped between the two terrain
-- heights, overlapping at the joints. Data per segment: x1, z1, x2, z2, y1, y2, width, class (0 major, 1 local, 2 service, 3 roundabout).
local MapData = require(script.Parent:WaitForChild("MapData"))

local ROADC = {
	[0] = Color3.fromRGB(58, 60, 64), -- major
	[1] = Color3.fromRGB(70, 72, 76), -- local
	[2] = Color3.fromRGB(96, 92, 86), -- service / alley
	[3] = Color3.fromRGB(58, 60, 64), -- roundabout
}

return function(map)
	local S, D = MapData.S, MapData.D
	local roadsF = map:WaitForChild("Roads")
	local n = 0
	for _, r in ipairs(MapData.chunks("Roads")) do
		for i = 1, #r, 8 do
			local a = Vector3.new(r[i] * D, r[i + 4] * D + 0.1 * S, r[i + 1] * D)
			local b = Vector3.new(r[i + 2] * D, r[i + 5] * D + 0.1 * S, r[i + 3] * D)
			local w = r[i + 6] * D
			local len = (b - a).Magnitude
			local p = Instance.new("Part")
			p.Anchored = true
			p.CanTouch = false
			p.TopSurface = Enum.SurfaceType.Smooth
			p.Material = Enum.Material.Asphalt
			p.Color = ROADC[r[i + 7]] or ROADC[1]
			p.Size = Vector3.new(w, 1.2 * S, len + w * 0.5)
			-- part centre sits 0.6 m below the road surface (thick slab, so it meets the ground)
			p.CFrame = CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, -0.6 * S, 0)
			p.Name = "Road"
			p.Parent = roadsF
			n += 1
			if n % 1500 == 0 then task.wait() end
		end
	end
end
