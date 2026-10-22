-- Irbid Drive (Roblox) - the shared "Auto" weather (the web game's 12f_weather.js): SIMULATED, not live. The chance of a rainy day each
-- month is the Jordan Meteorological Department climate table for Irbid (1985-2018 precipitation days per month), read from the Asia/Amman
-- calendar (UTC+3 all year since late 2022). A new "day" every 8 blocks of 2 real minutes; a rainy day rains in ~45 % of its blocks, a dry
-- day is sometimes cloudy (estimates, as in the web game). The server rolls it once for everyone and publishes the target sky in Workspace
-- attributes (WxSt, WxTc cloud cover, WxTr rain, WxMon month 0-11); each device eases towards it (Client/Weather), or uses the
-- weather its player picked in the settings (Clear / Cloudy / Rain), exactly as the web game's setting does.
local Workspace = game:GetService("Workspace")

local Weather = {}
Weather.CLIM = { 11.3, 10.6, 9.4, 4.6, 2, 0.2, 0, 0, 0.2, 3.2, 6, 9.6 }
Weather.MD = { 31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 }

-- Irbid's local time (hours) and month (0-11)
function Weather.ammanNow()
	local d = os.date("!*t", os.time() + 3 * 3600)
	return d.hour + d.min / 60 + d.sec / 3600, d.month - 1
end

local WX = { blk = 0, day = false, st = "clear", tc = 0, tr = 0, mon = 0 }
Weather.state = WX

local function pick(st)
	WX.st = st
	WX.tc = st == "rain" and 0.95 or st == "cloudy" and 0.55 or 0.06 * math.random()
	WX.tr = st == "rain" and 0.55 + 0.45 * math.random() or 0
end

-- the web game's wxRoll
function Weather.roll()
	local _, mon = Weather.ammanNow()
	WX.mon = mon
	local p = Weather.CLIM[mon + 1] / Weather.MD[mon + 1]
	if WX.blk % 8 == 0 then WX.day = math.random() < p end
	WX.blk += 1
	if WX.day then
		pick(math.random() < 0.45 and "rain" or "cloudy")
	else
		pick(math.random() < math.min(0.45, p * 2 + 0.06) and "cloudy" or "clear")
	end
	Workspace:SetAttribute("WxSt", WX.st)
	Workspace:SetAttribute("WxTc", WX.tc)
	Workspace:SetAttribute("WxTr", WX.tr)
	Workspace:SetAttribute("WxMon", WX.mon)
end

task.spawn(function()
	while true do
		Weather.roll()
		task.wait(120)
	end
end)

return Weather
