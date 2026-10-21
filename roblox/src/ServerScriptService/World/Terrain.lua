-- Irbid Drive (Roblox) - the ground: 40 m tiles at the SRTM height, top 0.6 m under the road level. Roblox terrain when the place
-- has a usable Terrain object, else ground parts (folder IrbidMap.Ground, which the cars' ground test also uses).
local Workspace = game:GetService("Workspace")
local MapData = require(script.Parent:WaitForChild("MapData"))

return function(map)
	local S, D = MapData.S, MapData.D
	local groundF = map:WaitForChild("Ground")
	local T = Workspace:FindFirstChildOfClass("Terrain")
	local tile = 40 * S
	local useParts = T == nil
	if T and not pcall(function() T:FillBlock(CFrame.new(0, -5000, 0), Vector3.new(4, 4, 4), Enum.Material.Ground) end) then useParts = true end
	if useParts then warn("Irbid Drive: no usable Terrain in this place, the ground is built from parts") end
	local k = 0
	for _, t in ipairs(MapData.chunks("Terrain")) do
		for i = 1, #t, 3 do
			local x, z, y = t[i] * D, t[i + 1] * D, t[i + 2] * D
			if useParts then
				local p = Instance.new("Part")
				p.Anchored = true
				p.CanTouch = false
				p.Material = Enum.Material.Ground
				p.Color = Color3.fromRGB(150, 128, 96)
				p.TopSurface = Enum.SurfaceType.Smooth
				p.Size = Vector3.new(tile, 12, tile)
				p.CFrame = CFrame.new(x, y - 0.6 * S - 6, z)
				p.Name = "Ground"
				p.Parent = groundF
				k += 1
				if k % 1500 == 0 then task.wait() end
			else
				T:FillBlock(CFrame.new(x, y - 0.6 * S - 6, z), Vector3.new(tile, 12, tile), Enum.Material.Ground)
			end
		end
		task.wait()
	end
end
