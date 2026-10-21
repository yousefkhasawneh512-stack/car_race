-- Irbid Drive (Roblox) - builds the map when the server starts, from the real data (tools/make_roblox.js: OpenStreetMap roads +
-- buildings, NASA SRTM terrain; the same data as the web game). Each part of the map has its own module in World/.
-- Every stage runs protected: if one fails (reported in Output), the rest is still built and players still spawn.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local World = script.Parent:WaitForChild("World")

local function stage(name, f, ...)
	local ok, err = pcall(f, ...)
	if not ok then warn("Irbid Drive: building the " .. name .. " failed: " .. tostring(err)) end
end

stage("sky", require(World:WaitForChild("Sky")))

local map = Instance.new("Folder")
map.Name = "IrbidMap"
for _, name in ipairs({ "Roads", "Buildings", "Sites", "Ground" }) do
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = map
end

stage("terrain", require(World:WaitForChild("Terrain")), map)
stage("roads", require(World:WaitForChild("Roads")), map)
stage("buildings", require(World:WaitForChild("Buildings")), map)
stage("labels", require(World:WaitForChild("Signs")).labels, map)
stage("sites", require(World:WaitForChild("Sites")), map)
stage("spawn point", require(World:WaitForChild("Spawn")), map)

map.Parent = Workspace
-- the "press Play" sign that is only meant for Studio's edit view
local hint = Workspace:FindFirstChild("EditModeSign")
if hint then hint:Destroy() end
Workspace:SetAttribute("MapReady", true)
print(("Irbid Drive map built: %d roads, %d buildings, %d labels"):format(Meta.roadCount, Meta.buildingCount, #Meta.labels))
