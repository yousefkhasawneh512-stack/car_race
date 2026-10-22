-- Irbid Drive (Roblox) - weather and the Irbid local clock on this device (the web game's 12f_weather.js). SIMULATED weather, not live:
-- "Auto" follows the server's roll (Game/Weather: the Irbid climate table by month), or the player picks Clear / Cloudy / Rain (setting
-- "wx"). The sky eases like the web game's: cloud cover over ~20 s, rain over ~12 s; the road gets wet while it rains (fully wet after
-- ~40 s of heavy rain) and dries in ~4 minutes. Physics: ONLY Realistic handling feels the wet road (peak tyre grip x0.72 when fully wet,
-- an estimate from published wet / dry friction ratios); Arcade never changes. Visuals: clouds, a greyer and darker sky, a shorter view,
-- rain streaks around the camera, darker and shinier roads. Clock (setting "clk"): the shared game clock, or Irbid's real local time
-- (Asia/Amman, UTC+3) on this device only; T switches back to game time (as in the web game).
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Settings = require(Client:WaitForChild("Settings"))

local Weather = {}
local S = Config.SCALE
local CLIM = { 11.3, 10.6, 9.4, 4.6, 2, 0.2, 0, 0, 0.2, 3.2, 6, 9.6 }
local MON = { "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" }
local MODES = { "auto", "clear", "cloudy", "rain" }
local WX = { st = "clear", cov = 0, rain = 0, wet = 0, mu = 1, tc = 0, tr = 0, lw = -1, mon = 0, lh = nil, lt = 0 }
Weather.state = WX
State.weather = WX
Settings.provide("wx", "clk")

-- Irbid's local time (hours) and month (0-11): UTC+3, as the web game's fallback (Jordan keeps UTC+3 all year)
function Weather.ammanNow()
	local d = os.date("!*t", os.time() + 3 * 3600)
	return d.hour + d.min / 60 + d.sec / 3600, d.month - 1
end
WX.mon = select(2, Weather.ammanNow())

local function pick(st)
	WX.st = st
	WX.tc = st == "rain" and 0.95 or st == "cloudy" and 0.55 or 0.06 * math.random()
	WX.tr = st == "rain" and 0.55 + 0.45 * math.random() or 0
end

Settings.onChange(function(k, v)
	if k == "wx" and v ~= 0 then
		pick(MODES[v + 1])
	elseif k == "clk" then
		WX.lh = nil
	end
end)

-- the look of a dry day (World/Sky) and of a grey one
local base = nil
local GREY = Color3.fromRGB(153, 163, 173)
local function lighting()
	if base then return base end
	local atm = Lighting:FindFirstChildOfClass("Atmosphere")
	base = { br = Lighting.Brightness, amb = Lighting.OutdoorAmbient, atm = atm, den = atm and atm.Density or 0, haze = atm and atm.Haze or 0,
		col = atm and atm.Color or Color3.new(1, 1, 1) }
	return base
end

-- rain: one particle emitter on an invisible box that follows the camera (the web game: one draw of streaks wrapped around the camera)
local rainBox = nil
local function rainEmitter()
	if rainBox then return rainBox end
	local p = Instance.new("Part")
	p.Name = "RainBox"
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
	p.Transparency = 1
	p.Size = Vector3.new(64 * S, 1, 64 * S)
	local e = Instance.new("ParticleEmitter")
	e.Name = "Rain"
	e.Texture = "rbxasset://textures/particles/SquareParticle.png"
	e.Color = ColorSequence.new(Color3.fromRGB(184, 194, 209))
	e.Transparency = NumberSequence.new(0.55)
	e.Size = NumberSequence.new(0.08)
	e.Squash = NumberSequence.new(3)
	e.Orientation = Enum.ParticleOrientation.VelocityParallel
	e.EmissionDirection = Enum.NormalId.Bottom
	e.Speed = NumberRange.new(15 * S, 17 * S)
	e.Lifetime = NumberRange.new(1.4, 1.6)
	e.LightInfluence = 0.6
	e.Rate = 0
	e.Parent = p
	p.Parent = Workspace.CurrentCamera
	rainBox = p
	return p
end

-- wet roads: colour darker (x(1 - 0.22 wet)) and shinier, a slice of the road pieces per frame (the change is slow)
local roads, roadBase, roadI, roadWet = nil, {}, 0, 0
local function wetRoads()
	if not roads then
		local map = Workspace:FindFirstChild("IrbidMap")
		local f = map and map:FindFirstChild("Roads")
		if not f then return end
		roads = f:GetChildren()
	end
	if roadI == 0 then
		if math.abs(WX.wet - WX.lw) <= 0.02 then return end
		WX.lw = WX.wet
		roadWet = WX.wet
		roadI = 1
	end
	local k = 1 - 0.22 * roadWet
	for _ = 1, 1500 do
		local p = roads[roadI]
		if not p then
			roadI = 0
			return
		end
		local c = roadBase[p]
		if not c then
			c = p.Color
			roadBase[p] = c
		end
		p.Color = Color3.new(c.R * k, c.G * k, c.B * k)
		p.Reflectance = 0.25 * roadWet
		roadI += 1
	end
end

-- headlights follow this device's clock (the local clock can differ from the server's)
local night = nil
local function headlights(h)
	local n = h < 6.3 or h > 18.2
	if n == night then return end
	night = n
	for _, m in ipairs(Workspace:GetChildren()) do
		if m:IsA("Model") and string.sub(m.Name, 1, 4) == "Car_" then
			for _, l in ipairs(m:GetDescendants()) do
				if l:IsA("SpotLight") then l.Enabled = n end
			end
		end
	end
end

function Weather.step(dt)
	local mode = Settings.get("wx")
	if mode == 0 then
		WX.tc = Workspace:GetAttribute("WxTc") or 0
		WX.tr = Workspace:GetAttribute("WxTr") or 0
		WX.st = Workspace:GetAttribute("WxSt") or "clear"
	elseif WX.st ~= MODES[mode + 1] then
		pick(MODES[mode + 1])
	end
	-- the web game's easing, wetting and drying
	local k = math.min(1, dt / 20)
	WX.cov += (WX.tc - WX.cov) * k
	WX.rain += (WX.tr - WX.rain) * math.min(1, dt / 12)
	-- the web game snaps a fading shower to 0 below 0.003 and, by mistake, a starting one too (its first step from 0 is about 0.001 at
	-- any frame rate, so in the web build v49 rain never starts: checked headless, 45 s of "Rain" -> rain 0.000). Here only a fading
	-- shower snaps, as the web game describes it (README: "Rain greys the sky, shortens the view, draws rain and makes the roads darker")
	if WX.rain < 0.003 and WX.tr < WX.rain then WX.rain = 0 end
	WX.wet = WX.rain > 0.08 and math.min(1, WX.wet + dt * WX.rain / 40) or math.max(0, WX.wet - dt / 240)
	WX.mu = 1 - 0.28 * WX.wet
	-- the physics (Realistic only reads it)
	local P = State.phys
	if P then P.wx.mu, P.wx.wet = WX.mu, WX.wet end
	-- the clock
	if Settings.get("clk") == 1 then
		WX.lt -= dt
		if WX.lt <= 0 or WX.lh == nil then
			WX.lt = 1
			WX.lh, WX.mon = Weather.ammanNow()
		else
			WX.lh = (WX.lh + dt / 3600) % 24
		end
		Lighting.ClockTime = WX.lh
	else
		WX.mon = Workspace:GetAttribute("WxMon") or WX.mon
	end
	headlights(Lighting.ClockTime)
	-- the sky: greyer and darker with cloud cover, a shorter view in rain
	local b = lighting()
	local c, r = WX.cov, WX.rain
	local el = Lighting:GetSunDirection().Y
	local dayF = math.clamp(el * 4 + 0.2, 0, 1)
	Lighting.Brightness = b.br * (1 - 0.75 * c)
	Lighting.OutdoorAmbient = b.amb:Lerp(GREY:Lerp(Color3.new(), 1 - (0.08 + 0.92 * dayF)), c * 0.65)
	if b.atm then
		b.atm.Density = b.den + 0.3 * r + 0.08 * c
		b.atm.Haze = b.haze + 1.2 * c
		b.atm.Color = b.col:Lerp(Color3.fromRGB(176, 182, 188), c)
	end
	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		local cl = terrain:FindFirstChildOfClass("Clouds")
		if not cl then
			cl = Instance.new("Clouds")
			cl.Parent = terrain
		end
		cl.Cover = math.clamp(c * 0.95, 0, 1)
		cl.Density = 0.3 + 0.5 * c
		cl.Color = Color3.new(1, 1, 1):Lerp(Color3.fromRGB(120, 128, 136), c)
	end
	-- rain streaks around the camera
	local box = rainEmitter()
	local cam = Workspace.CurrentCamera
	box.Rain.Rate = r > 0.02 and 1800 * math.min(1, r * 1.3) or 0
	if r > 0.02 and cam then box.CFrame = CFrame.new(cam.CFrame.Position + Vector3.new(0, 16 * S, 0)) end
	wetRoads()
end

-- T: in local-clock mode, back to the game clock first (the web game)
function Weather.onHourKey()
	if Settings.get("clk") == 1 then
		Settings.set("clk", 0)
		Hud.toast("Clock: game time (T moves it on)")
	end
end

-- the web game's weather line (shown in the settings menu)
function Weather.line()
	local now = WX.rain > 0.08 and "raining" or WX.cov > 0.3 and "cloudy" or "clear"
	local mode = Settings.get("wx")
	local real = State.phys and State.phys.mode == 1
	return (mode == 0 and "Auto (Irbid seasons)" or ("Chosen: " .. MODES[mode + 1])) .. " · now " .. now
		.. " · road " .. (WX.wet > 0.05 and ("wet " .. math.floor(WX.wet * 100 + 0.5) .. "%" .. (real and (" (grip −" .. math.floor((1 - WX.mu) * 100 + 0.5) .. "%)") or " (grip unchanged in Arcade)")) or "dry")
		.. " · simulated, not live: " .. MON[WX.mon + 1] .. " averages " .. CLIM[WX.mon + 1] .. " rain days in Irbid (JMD 1985–2018)"
end

return Weather
