-- Irbid Drive (Roblox) - each player's progress: cash, drift bank, lifetime drift, owned cars, current car, upgrade levels per car.
-- Saved in a DataStore (works in a published game; in Studio enable "Studio Access to API Services" to test it), shown in the
-- leaderboard (Cash, Drift) and in player attributes the devices read (Cash, DriftBank, Owned, CurCar, Tune, VIP).
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Schema = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("SettingsSchema"))
local Damage = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Damage"))

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

-- read (and check) a saved record; a new player starts with Config.START_CASH and the starter car. A FAILED read (DataStore down or
-- throttled; 3 tries) is not a new player: the session then plays on a fresh record that is never saved (noSave, player attribute
-- "SaveOff"), so it cannot overwrite the real progress
function PlayerData.load(plr)
	local d
	local failed = false
	if store then
		for try = 1, 3 do
			local ok, v = pcall(function() return store:GetAsync("u" .. plr.UserId) end)
			if ok then
				if type(v) == "table" then d = v end
				failed = false
				break
			end
			failed = true
			warn("[IrbidDrive] progress load failed for " .. plr.Name .. " (try " .. try .. "): " .. tostring(v))
			if try < 3 then task.wait(try) end
		end
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
	-- the vehicle damage per car (version 4; checked field by field)
	local damage = {}
	if type(d.dmg) == "table" then
		for k, r in pairs(d.dmg) do
			local i = tonumber(k)
			if i and Config.CARS[i] then damage[i] = Damage.clean(r, Config.CARS[i]) end
		end
	end
	-- version 1 saves (the first Roblox build) had only a lifetime "drift" total
	local dt = tonumber(d.dt) or tonumber(d.drift) or 0
	return {
		cash = math.max(0, tonumber(d.cash) or Config.START_CASH), bank = math.max(0, tonumber(d.bank) or 0), dt = math.max(0, dt),
		owned = owned, cur = cur, tune = tune, last = os.clock(), heistCool = 0,
		-- the settings (version 4; older records have none: the defaults)
		settings = Schema.encode(Schema.parse(d.set)),
		damage = damage,
		-- road reputation and rival memory (Client/Reputation)
		rep = type(d.rep) == "string" and #d.rep <= 200 and d.rep or "70",
		school = type(d.school) == "string" and #d.school <= 120 and d.school or "runs=0",
		fav = type(d.fav) == "string" and #d.fav <= 2400 and d.fav or "",
		noSave = failed,
	}
end

function PlayerData.save(plr)
	local d = PlayerData.data[plr]
	if not (d and store) or d.noSave then return end
	local owned, tune = {}, {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	for i, t in pairs(d.tune) do tune[tostring(i)] = t end
	-- only damaged cars are stored
	local dmg = {}
	for i, r in pairs(d.damage or {}) do
		if Damage.hurt(r) then dmg[tostring(i)] = r end
	end
	local rec = { v = 2, cash = math.floor(d.cash), bank = math.floor(d.bank), dt = math.floor(d.dt), owned = owned, cur = d.cur, tune = tune, set = d.settings, dmg = dmg, rep = d.rep, school = d.school, fav = d.fav }
	for try = 1, 3 do
		local ok, err = pcall(function() store:SetAsync("u" .. plr.UserId, rec) end)
		if ok then return end
		warn("[IrbidDrive] progress save failed for " .. plr.Name .. " (try " .. try .. "): " .. tostring(err))
		if try < 3 then task.wait(try) end
	end
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
	ls.JD.Value = math.floor(d.cash)
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
	plr:SetAttribute("Fines", d.fines or 0)
	plr:SetAttribute("Settings", d.settings)
	plr:SetAttribute("Rep", d.rep)
	plr:SetAttribute("School", d.school)
	plr:SetAttribute("Fav", d.fav)
	plr:SetAttribute("SaveOff", d.noSave == true)
end

-- sync and save after a change of money or cars
function PlayerData.commit(plr)
	PlayerData.sync(plr)
	PlayerData.save(plr)
end

return PlayerData
