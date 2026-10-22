-- Irbid Drive (Roblox) - each player's vehicle damage, kept on the server per car (the web game keeps it per car in localStorage):
-- the device computes the damage while driving (Modules/Damage, the web game's rules) and sends the record; the server checks it
-- (Damage.clean) and only lets a record get WORSE (a device cannot repair its car by sending a clean record). Repairs happen here, at
-- Apex Drift Customs: the server prices them with the same module (base + per % lost, x the rarity tier), charges the JD balance,
-- repairs the stored record and sends it back. Saved with the progress (PlayerData, field "dmg").
-- Remote Damage (function): ("get", car) -> record | ("save", car, record) -> true | ("repair", car, {ids} or "*") -> ok, record | reason, JD
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Damage = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Damage"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Sites = require(script.Parent:WaitForChild("Sites"))

local DamageStore = {}
local COND = { "engine", "brakes", "cooling", "trans", "driveline", "steer" }

-- the record a device sent, merged so that nothing improves (condition can only drop, damage only grow) except the things that recover
-- by themselves (tyre and engine temperature)
function DamageStore.merge(old, new, car)
	local n = Damage.clean(new, car)
	local o = old or Damage.newRecord(car)
	for _, k in ipairs(COND) do n[k] = math.min(n[k], o[k]) end
	for _, z in ipairs(Damage.ZONES) do n.zones[z] = math.min(n.zones[z], o.zones[z]) end
	for j = 1, 4 do
		n.susp[j] = math.min(n.susp[j], o.susp[j])
		if math.abs(n.align[j]) < math.abs(o.align[j]) then n.align[j] = o.align[j] end
		n.lights[j] = math.max(n.lights[j], o.lights[j])
		n.glass[j] = math.max(n.glass[j], o.glass[j])
		n.rims[j] = math.max(n.rims[j], o.rims[j])
		local w, v = n.wheels[j], o.wheels[j]
		w.tread, w.health = math.min(w.tread, v.tread), math.min(w.health, v.health)
		w.punct = w.punct or v.punct
		w.km, w.tmax = math.max(w.km, v.km), math.max(w.tmax, v.tmax)
		for k in pairs(w.wear) do w.wear[k] = math.max(w.wear[k], v.wear[k]) end
		if #n.cracks[j] < #o.cracks[j] then n.cracks[j] = o.cracks[j] end
	end
	for _, k in ipairs(Damage.DP_KEYS) do n.parts[k] = math.max(n.parts[k], o.parts[k]) end
	if #n.dents < #o.dents then n.dents = o.dents end
	n.impacts = math.max(n.impacts, o.impacts)
	Damage.syncAggregates(n)
	return n
end

local function carOf(i)
	return type(i) == "number" and Config.CARS[i] and i or nil
end

Remotes.Damage.OnServerInvoke = function(plr, action, i, arg)
	local d = PlayerData.data[plr]
	local ci = carOf(i)
	if not (d and ci) then return false, "not ready" end
	d.damage = d.damage or {}
	local car = Config.CARS[ci]
	if action == "get" then
		return d.damage[ci] or Damage.newRecord(car)
	elseif action == "save" then
		-- at most twice a second per player
		local now = os.clock()
		if now - (d.dmgT or -1) < 0.5 then return false, "too often" end
		d.dmgT = now
		if type(arg) ~= "table" then return false, "bad record" end
		d.damage[ci] = DamageStore.merge(d.damage[ci], arg, car)
		return true
	elseif action == "repair" then
		if not Sites.near(plr, Sites.shop, 40) then return false, "Repairs are done at Apex Drift Customs" end
		local s = d.damage[ci] or Damage.newRecord(car)
		local items = Damage.repairItems(s, car)
		local want = {}
		if arg == "*" then
			for _, q in ipairs(items) do want[q.id] = true end
		elseif type(arg) == "table" then
			for _, id in ipairs(arg) do
				if type(id) == "string" then want[id] = true end
			end
		end
		local total, list = 0, {}
		for _, q in ipairs(items) do
			if want[q.id] then
				total += q.price
				list[#list + 1] = q
			end
		end
		if #list == 0 then return false, "Nothing to repair" end
		if d.cash < total then return false, "Not enough JD (" .. total .. " JD needed)" end
		d.cash -= total
		for _, q in ipairs(list) do Damage.repairPart(s, car, q.id) end
		d.damage[ci] = s
		PlayerData.commit(plr)
		return true, s, total, #list > 2 and (#list .. " items") or (list[1].label .. (list[2] and (", " .. list[2].label) or ""))
	end
	return false, "unknown action"
end

return DamageStore
