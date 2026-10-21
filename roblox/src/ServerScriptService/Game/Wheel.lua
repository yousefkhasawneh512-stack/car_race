-- Irbid Drive (Roblox) - the car wheel (the web game's): 10,000 cash a spin, tier by the odds 50 / 35 / 10 / 4 / 1 %, then one of
-- that tier's (non-VIP) cars. A new car is equipped; a car already owned refunds 5,000.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Spawner = require(script.Parent:WaitForChild("Spawner"))

local Wheel = {}

-- -> car index, tier (0-4)
function Wheel.roll()
	local r, a, tier = math.random(), 0, 0
	for i, p in ipairs(Config.WHEEL_ODDS) do
		a += p
		if r < a then
			tier = i - 1
			break
		end
	end
	for t = tier, 0, -1 do
		local pool = {}
		for i, c in ipairs(Config.CARS) do
			if c.tier == t and not c.vip then pool[#pool + 1] = i end
		end
		if #pool > 0 then
			return pool[math.random(#pool)], t
		end
	end
	return 1, 0
end

-- -> ok, {car, tier, dup} | reason
function Wheel.spin(plr, d)
	if d.cash < Config.WHEEL_COST then return false, "Not enough JD" end
	d.cash -= Config.WHEEL_COST
	local car, tier = Wheel.roll()
	local dup = d.owned[car] == true
	if dup then
		d.cash += Config.WHEEL_REFUND
	else
		d.owned[car] = true
		d.cur = car
	end
	PlayerData.commit(plr)
	if not dup then task.spawn(Spawner.spawn, plr, true) end
	return true, { car = car, tier = tier, dup = dup }
end

return Wheel
