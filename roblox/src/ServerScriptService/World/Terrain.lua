-- Irbid Drive (Roblox) - the ground: the web game's terrain height grid (SRTM, 25 m cells, the same grid the cars drive on), one block
-- per cell, tilted to the cell's slope and kept just under the road surface everywhere in the cell (flat tiles buried the roads on
-- slopes). Always parts (folder IrbidMap.Ground): Roblox voxel terrain rounds its surface to 4-stud voxels, which covered the roads in Studio.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Meta = require(Shared:WaitForChild("Meta"))
local MapData = require(script.Parent:WaitForChild("MapData"))

-- top of the ground under the web game's terrain height (the roads are drawn 0.1 m over it, the car drives 0.12 m over it)
local DROP = 0.3

return function(map)
	local S = MapData.S
	local HG = require(Shared:WaitForChild("Heights"))
	local H = {}
	local i = 1
	while Shared:FindFirstChild("HeightData" .. i) do
		for n in string.gmatch(require(Shared["HeightData" .. i]), "-?%d+") do H[#H + 1] = tonumber(n) / 10 end
		i += 1
	end
	local N, C, X0, Z0 = HG.n, HG.cell, HG.x0, HG.z0
	local R = Meta.radius + 100
	local groundF = map:WaitForChild("Ground")
	local k = 0
	for j = 0, N - 2 do
		for ii = 0, N - 2 do
			local xc, zc = X0 + (ii + 0.5) * C, Z0 + (j + 0.5) * C
			if xc * xc + zc * zc <= R * R then
				local a, b = H[j * N + ii + 1], H[j * N + ii + 2]
				local c, d = H[(j + 1) * N + ii + 1], H[(j + 1) * N + ii + 2]
				-- the plane through the cell's mean height and mean slopes; the bilinear surface leaves it by at most |a-b-c+d|/4
				local m = (a + b + c + d) / 4
				local sx, sz = ((b + d) - (a + c)) / (2 * C), ((c + d) - (a + b)) / (2 * C)
				local top = m - DROP - math.abs(a - b - c + d) / 4
				local th = math.max(a, b, c, d) - math.min(a, b, c, d) + 4
				local up = Vector3.new(-sx, 1, -sz).Unit
				local rx = Vector3.new(1, sx, 0).Unit
				local rz = rx:Cross(up)
				local pos = Vector3.new(xc, top, zc) * S - up * (th * S / 2)
				-- a little larger than the cell, so the tilted blocks overlap at the seams
				local cf = CFrame.fromMatrix(pos, rx, up, rz)
				local size = Vector3.new((C + 1.5) * S * math.sqrt(1 + sx * sx), th * S, (C + 1.5) * S * math.sqrt(1 + sz * sz))
				do
					local p = Instance.new("Part")
					p.Anchored = true
					p.CanTouch = false
					p.Material = Enum.Material.Ground
					p.Color = Color3.fromRGB(150, 128, 96)
					p.TopSurface = Enum.SurfaceType.Smooth
					p.CastShadow = false
					p.Size = size
					p.CFrame = cf
					p.Name = "Ground"
					p.Parent = groundF
					k += 1
					-- yield now and then: one long run would hit Roblox's script time limit
					if k % 1500 == 0 then task.wait() end
				end
			end
		end
	end
end
