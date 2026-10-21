-- Irbid Drive (Roblox) - buildings: OpenStreetMap footprint pieces (rectangles), estimated heights where OSM has none.
-- Data per piece: x, z, width, depth, angle (milliradians), height, lowest ground height, colour type.
local MapData = require(script.Parent:WaitForChild("MapData"))

local BC = {
	[0] = Color3.fromRGB(214, 200, 176), [1] = Color3.fromRGB(226, 214, 190), [2] = Color3.fromRGB(205, 192, 170),
	[3] = Color3.fromRGB(190, 186, 176), [4] = Color3.fromRGB(170, 166, 160), [5] = Color3.fromRGB(236, 230, 214),
	[6] = Color3.fromRGB(180, 196, 205), [7] = Color3.fromRGB(160, 150, 136),
}

return function(map)
	local S, D = MapData.S, MapData.D
	local bldF = map:WaitForChild("Buildings")
	local n = 0
	for _, b in ipairs(MapData.chunks("Buildings")) do
		for i = 1, #b, 8 do
			local w, d, h = b[i + 2] * D, b[i + 3] * D, b[i + 5] * D + 1 * S
			local p = Instance.new("Part")
			p.Anchored = true
			p.CanTouch = false
			p.Material = Enum.Material.Concrete
			p.Color = BC[b[i + 7]] or BC[0]
			p.Size = Vector3.new(w, h, d)
			p.CFrame = CFrame.new(b[i] * D, b[i + 6] * D - 1 * S + h / 2, b[i + 1] * D) * CFrame.Angles(0, b[i + 4] / 1000, 0)
			p.Name = "Building"
			p.Parent = bldF
			n += 1
			if n % 1500 == 0 then task.wait() end
		end
	end
end
