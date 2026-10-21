-- Irbid Drive (Roblox) - each player's progress: cash, drift bank, lifetime drift, owned cars, current car, upgrade levels per car.
-- Saved in a DataStore (works in a published game; in Studio enable "Studio Access to API Services" to test it), shown in the
-- leaderboard (Cash, Drift) and in player attributes the devices read (Cash, DriftBank, Owned, CurCar, Tune, VIP).
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local PlayerData = {}
local store
pcall(function() store = DataStoreService:GetDataStore("IrbidDrive_v1") end)
-- [player] = {cash, bank, dt, owned = {[i]=true}, cur, tune = {[i] = {4 levels}}, vip, last, heistCool, race, heist, lastReset}
PlayerData.data = {}

local function cleanLevels(t)
	local l = {}
	for k = 1, 4 do
		local v = type(t) == "table" and tonumber(t[k]) or 0
		l[k] = math.clamp(math.floor(v or 0), 0, Config.UPGRADE_MAX)
	end
	return l
end

-- read (and check) a saved record; a new player starts with Config.START_CASH and the starter car
function PlayerData.load(plr)
	local d
	if store then
		local ok, v = pcall(function() return store:GetAsync("u" .. plr.UserId) end)
		if ok and type(v) == "table" then d = v end
	end
	d = d or {}
	local owned = {}
	for _, i in ipairs(type(d.owned) == "table" and d.owned or {}) do
		if Config.CARS[i] then owned[i] = true end
	end
	owned[1] = true
	local tune = {}
	if type(d.tune) == "table" then
		for k, t in pairs(d.tune) do
			local i = tonumber(k)
			if i and Config.CARS[i] then tune[i] = cleanLevels(t) end
		end
	end
	local cur = (type(d.cur) == "number" and owned[d.cur]) and d.cur or 1
	-- version 1 saves (the first Roblox build) had only a lifetime "drift" total
	local dt = tonumber(d.dt) or tonumber(d.drift) or 0
	return {
		cash = math.max(0, tonumber(d.cash) or Config.START_CASH), bank = math.max(0, tonumber(d.bank) or 0), dt = math.max(0, dt),
		owned = owned, cur = cur, tune = tune, last = os.clock(), heistCool = 0,
	}
end

function PlayerData.save(plr)
	local d = PlayerData.data[plr]
	if not (d and store) then return end
	local owned, tune = {}, {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	for i, t in pairs(d.tune) do tune[tostring(i)] = t end
	pcall(function()
		store:SetAsync("u" .. plr.UserId, { v = 2, cash = math.floor(d.cash), bank = math.floor(d.bank), dt = math.floor(d.dt), owned = owned, cur = d.cur, tune = tune })
	end)
end

-- the upgrade levels of car i (created at 0)
function PlayerData.levels(d, i)
	local t = d.tune[i]
	if not t then
		t = { 0, 0, 0, 0 }
		d.tune[i] = t
	end
	return t
end

-- push the numbers to the leaderboard and to the attributes the device reads
function PlayerData.sync(plr)
	local d = PlayerData.data[plr]
	local ls = plr:FindFirstChild("leaderstats")
	if not (d and ls) then return end
	ls.Cash.Value = math.floor(d.cash)
	ls.Drift.Value = math.floor(d.dt)
	local owned = {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	table.sort(owned)
	plr:SetAttribute("Owned", table.concat(owned, ","))
	plr:SetAttribute("CurCar", d.cur)
	plr:SetAttribute("VIP", d.vip == true)
	plr:SetAttribute("Cash", math.floor(d.cash))
	plr:SetAttribute("DriftBank", math.floor(d.bank))
	plr:SetAttribute("Tune", table.concat(PlayerData.levels(d, d.cur), ","))
end

-- sync and save after a change of money or cars
function PlayerData.commit(plr)
	PlayerData.sync(plr)
	PlayerData.save(plr)
end

return PlayerData
