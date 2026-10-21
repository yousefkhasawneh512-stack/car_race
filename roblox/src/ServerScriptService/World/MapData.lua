-- Irbid Drive (Roblox) - reads the generated map data in ServerStorage.IrbidData (tools/make_roblox.js: OpenStreetMap roads and
-- buildings, NASA SRTM terrain). The data are whole numbers in decimetres, centred on the web game's start point.
local ServerStorage = game:GetService("ServerStorage")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local MapData = {}
local DATA = ServerStorage:WaitForChild("IrbidData")
MapData.S = Config.SCALE -- studs per metre
MapData.D = Config.SCALE / 10 -- decimetres -> studs

local function nums(s)
	local t = {}
	for n in string.gmatch(s, "-?%d+") do
		t[#t + 1] = tonumber(n)
	end
	return t
end

-- every module <prefix>1, <prefix>2, ... as lists of numbers
function MapData.chunks(prefix)
	local list, i = {}, 1
	while DATA:FindFirstChild(prefix .. i) do
		list[#list + 1] = nums(require(DATA[prefix .. i]))
		i += 1
	end
	return list
end

return MapData
