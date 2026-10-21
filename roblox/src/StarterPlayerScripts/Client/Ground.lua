-- Irbid Drive (Roblox) - ray tests against the map. Ground = roads + terrain (or the ground parts when the place has no Terrain);
-- walls = buildings only, so road joints and terrain steps never stop a car. Units: metres.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local Ground = {}
local S = Config.SCALE
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

-- the ground under (x, z) looking down from yTop at most `len` metres (default 400) -> height (m) or nil, ray result
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
