-- Irbid Drive (Roblox) - traffic fines (the web game's amounts and cool-downs): speeding 15 JD (5 s), driving against traffic 20 JD
-- (6 s), red light 50 JD (3 s), collision with traffic 30 JD (2 s). As in the web game a fine ADDS to the JD balance: the car wheel is
-- paid with "law-breaking JD". The device detects the offence (Client/Laws); the server sets the amount and enforces the cool-down.
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))

local RULES = { spd = { 15, 5 }, way = { 20, 6 }, red = { 50, 3 }, hit = { 30, 2 } }

Remotes.Fine.OnServerEvent:Connect(function(plr, kind)
	local d = PlayerData.data[plr]
	local r = type(kind) == "string" and RULES[kind]
	if not (d and r) then return end
	d.fineT = d.fineT or {}
	local now = os.clock()
	if now - (d.fineT[kind] or -99) < r[2] then return end
	d.fineT[kind] = now
	d.cash += r[1]
	d.fines = (d.fines or 0) + r[1]
	PlayerData.sync(plr)
end)

return {}
