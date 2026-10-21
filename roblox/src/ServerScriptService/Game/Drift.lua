-- Irbid Drive (Roblox) - drift points from the device -> drift bank (pays for upgrades) + cash (0.25 per point, VIP x2).
-- Server cap: points per second of driving since the last bank, scaled by the car's rarity and Extra Drift Points upgrade (the most a
-- long, fast, full-combo drift can score), and never more than 60,000 at once. Bad values are ignored.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))

Remotes.BankDrift.OnServerEvent:Connect(function(plr, pts)
	local d = PlayerData.data[plr]
	if not d or type(pts) ~= "number" or pts ~= pts or pts <= 0 then return end
	local now = os.clock()
	local t = Config.tuned(d.cur, PlayerData.levels(d, d.cur))
	local cap = math.min(60000, (now - d.last) * 1500 * t.rm * (1 + 0.2 * t.dr))
	d.last = now
	pts = math.floor(math.min(pts, cap))
	d.bank += pts
	d.dt += pts
	d.cash += pts * Config.DRIFT_CASH * (d.vip and 2 or 1)
	PlayerData.sync(plr)
end)

return {}
