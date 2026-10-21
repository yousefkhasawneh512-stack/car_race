-- Irbid Drive (Roblox) - the ground, as in the web game. The car physics does not ride on Roblox parts: like the web game it uses the
-- terrain height TH (SRTM, a 25 m grid exported from the web game, interpolated), + 0.12 m, + the stunt ramps (groundH), and the
-- speed bump profiles (bumpAt). Walls are ray tests against the buildings. Units: metres.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Rules = require(Shared:WaitForChild("Rules"))
local HG = require(Shared:WaitForChild("Heights"))

local Ground = {}
local S = Config.SCALE

-- the height grid (decimetres)
local H = {}
do
	local i = 1
	while Shared:FindFirstChild("HeightData" .. i) do
		for n in string.gmatch(require(Shared["HeightData" .. i]), "-?%d+") do H[#H + 1] = tonumber(n) / 10 end
		i += 1
	end
end
local N, C, X0, Z0 = HG.n, HG.cell, HG.x0, HG.z0

-- terrain height at (x, z): bilinear in the 25 m grid
function Ground.TH(x, z)
	local fx, fz = (x - X0) / C, (z - Z0) / C
	local i, j = math.clamp(math.floor(fx), 0, N - 2), math.clamp(math.floor(fz), 0, N - 2)
	local u, v = math.clamp(fx - i, 0, 1), math.clamp(fz - j, 0, 1)
	local a, b = H[j * N + i + 1], H[j * N + i + 2]
	local c, d = H[(j + 1) * N + i + 1], H[(j + 1) * N + i + 2]
	return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
end

-- the web game's groundH: terrain + 0.12 m, raised on the stunt ramps (each rises linearly along +z over its length)
local RAMPS = Rules.ramps
function Ground.groundH(x, z)
	local h = Ground.TH(x, z) + 0.12
	for _, r in ipairs(RAMPS) do
		if math.abs(x - r.x) < r.w / 2 and z > r.z - r.l / 2 and z < r.z + r.l / 2 then
			h = r.y + 0.12 + r.h * (z - (r.z - r.l / 2)) / r.l
		end
	end
	return h
end

-- speed bumps: height of the bump surface above the road at (x, z) (profile H cos^2(pi u / len)), through a 50 m hash
local SBH = {}
for _, b in ipairs(Rules.bumps) do
	for i = -1, 1 do
		for j = -1, 1 do
			local k = (math.floor(b.x / 50) + i) * 100000 + math.floor(b.z / 50) + j
			SBH[k] = SBH[k] or {}
			table.insert(SBH[k], b)
		end
	end
end
function Ground.bumpAt(x, z)
	local L = SBH[math.floor(x / 50) * 100000 + math.floor(z / 50)]
	if not L then return 0 end
	local h = 0
	for _, b in ipairs(L) do
		local dx, dz = x - b.x, z - b.z
		local al = dx * b.tx + dz * b.tz
		if al > -b.l / 2 and al < b.l / 2 and math.abs(dx * b.tz - dz * b.tx) <= b.w / 2 then
			local c = math.cos(math.pi * al / b.l)
			h = math.max(h, b.h * c * c)
		end
	end
	return h
end
Ground.anyBumps = #Rules.bumps > 0

-- built-up ground (the web game's urbanK > 0.5), for the off-road grip
local U = Rules.urban
function Ground.urban(x, z)
	local i, j = math.floor((x - U.x0) / U.cell), math.floor((z - U.z0) / U.cell)
	if i < 0 or j < 0 or i >= U.n or j >= U.n then return false end
	local k = j * U.n + i + 1
	return string.sub(U.bits, k, k) == "1"
end

-- ray tests against the map parts (the race beam and police cars use the visible ground)
local map = Workspace:WaitForChild("IrbidMap")
local groundP = RaycastParams.new()
groundP.FilterType = Enum.RaycastFilterType.Include
local list = { map:WaitForChild("Roads"), map:WaitForChild("Ground") }
local terrain = Workspace:FindFirstChildOfClass("Terrain")
if terrain then list[#list + 1] = terrain end
groundP.FilterDescendantsInstances = list
local wallP = RaycastParams.new()
wallP.FilterType = Enum.RaycastFilterType.Include
wallP.FilterDescendantsInstances = { map:WaitForChild("Buildings") }

-- the visible ground under (x, z) looking down from yTop at most `len` metres -> height (m) or nil, ray result
function Ground.below(x, z, yTop, len)
	local g = Workspace:Raycast(Vector3.new(x, yTop, z) * S, Vector3.new(0, -(len or 400) * S, 0), groundP)
	return g and g.Position.Y / S, g
end

-- the first building wall from (x, y, z) along (dx, dz) (unit) within `len` metres -> ray result or nil
function Ground.wall(x, y, z, dx, dz, len)
	local hit = Workspace:Raycast(Vector3.new(x, y, z) * S, Vector3.new(dx, 0, dz) * len * S, wallP)
	if hit and hit.Normal.Y < 0.6 then return hit end
	return nil
end

return Ground
