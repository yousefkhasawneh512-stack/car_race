-- Irbid Drive (Roblox) - the spawn point at the web game's start (Baghdad Street, Al-Balad). Invisible; the server seats every
-- player in their car anyway.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local MapData = require(script.Parent:WaitForChild("MapData"))

return function(map)
	local sp = Instance.new("SpawnLocation")
	sp.Anchored = true
	sp.Size = Vector3.new(6, 1, 6)
	sp.Transparency = 1
	sp.CanCollide = false
	sp.CanQuery = false
	sp.Position = Vector3.new(0, Meta.startY * MapData.S + 6, 0)
	sp.Parent = map
end
