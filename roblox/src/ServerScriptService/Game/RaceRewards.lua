-- Irbid Drive (Roblox) - race results. The device plays the race; the server pays by finishing place (Config.RACE_REWARD) only when
-- the time is possible: no car can go round faster than its top speed (+20 %) the whole way, from the 3 s countdown on.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Circuits = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Circuits"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))

local RaceRewards = {}

-- length of each circuit's racing line (m)
local circuitLen = {}
for _, c in ipairs(Circuits) do
	local v, len, px, pz = {}, 0, nil, nil
	for n in string.gmatch(c.path, "-?%d+") do v[#v + 1] = tonumber(n) / 10 end
	for k = 1, #v, 3 do
		if px then len += math.sqrt((v[k] - px) ^ 2 + (v[k + 1] - pz) ^ 2) end
		px, pz = v[k], v[k + 1]
	end
	circuitLen[c.name] = len
end

function RaceRewards.start(plr, d, name)
	if type(name) ~= "string" or not circuitLen[name] then return false, "no such race" end
	d.race = { name = name, t0 = os.clock() }
	return true
end

function RaceRewards.cancel(plr, d)
	d.race = nil
	return true
end

function RaceRewards.finish(plr, d, place)
	local r = d.race
	d.race = nil
	if not r or type(place) ~= "number" then return false, "no race" end
	local t = Config.tuned(d.cur, PlayerData.levels(d, d.cur))
	if os.clock() - r.t0 < 3 + circuitLen[r.name] / (t.vm * 1.2) then return false, "Result not accepted" end
	local reward = Config.RACE_REWARD[math.clamp(math.floor(place), 1, #Config.RACE_REWARD)] or 0
	d.cash += reward
	PlayerData.commit(plr)
	return true, reward
end

return RaceRewards
