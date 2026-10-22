-- Irbid Drive (Roblox) - traffic density (the web game's 12e trDen / trApply / trAutoTick; setting "tr"): High 100 %, Medium 65 %, Low 35 %
-- of the traffic cars, or By time of day: a generic weekday curve by the hour (30 % at night, 100 % at 08:00 and 14:00-16:00; an
-- estimate, not Irbid counts), checked every 5 s; a car within 250 m of the player is never parked then.
local Lighting = game:GetService("Lighting")
local Client = script.Parent
local Settings = require(Client:WaitForChild("Settings"))
local Traffic = require(Client:WaitForChild("Traffic"))

local TrafficDensity = {}
local TDEN = { 1, 0.65, 0.35 }
local TPROF = { 0.35, 0.32, 0.3, 0.3, 0.3, 0.4, 0.6, 0.9, 1, 0.9, 0.8, 0.8, 0.85, 0.95, 1, 1, 0.95, 0.9, 0.85, 0.75, 0.65, 0.55, 0.45, 0.4 }
TrafficDensity.TPROF = TPROF
Settings.provide("tr")

function TrafficDensity.den()
	local m = Settings.get("tr")
	if m < 3 then return TDEN[m + 1] end
	local h = Lighting.ClockTime % 24
	local i = math.floor(h)
	local f = h - i
	return TPROF[i + 1] + (TPROF[(i + 1) % 24 + 1] - TPROF[i + 1]) * f
end

Settings.onChange(function(k)
	if k == "tr" then Traffic.density(TrafficDensity.den(), false) end
end)

local t = 0
function TrafficDensity.step(dt)
	if Settings.get("tr") ~= 3 then return end
	t -= dt
	if t > 0 then return end
	t = 5
	Traffic.density(TrafficDensity.den(), true)
end

return TrafficDensity
