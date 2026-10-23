-- Irbid Drive (Roblox) - graphics quality on this device (settings "gq" preset Auto / Low / Medium / High / Ultra, "gsh" shadows,
-- "gpe" colour grading, "gdd" draw distance; the presets are Modules/GraphicsPresets). Lighting changed by a device's script is seen
-- on that device only, so each player picks their own. Auto follows Roblox's graphics quality (Esc menu) and is checked every 2 s.
-- Colour grading = a warm, slightly richer ColorCorrection and a soft Bloom on bright lights; Ultra adds SunRays. Draw distance scales
-- the street furniture / tree radius of Client/Props (the roadside colliders in Modules/Objects never change: only what is drawn).
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local GraphicsPresets = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("GraphicsPresets"))
local Client = script.Parent
local Settings = require(Client:WaitForChild("Settings"))
local Props = require(Client:WaitForChild("Props"))
local Weather = require(Client:WaitForChild("Weather"))

local Graphics = { cur = nil }
Settings.provide("gq", "gsh", "gpe", "gdd")

-- Roblox's graphics quality on this device (0 = automatic; not readable in some test set-ups)
local function quality()
	local ok, q = pcall(function()
		return UserSettings():GetService("UserGameSettings").SavedQualityLevel.Value
	end)
	return ok and q or 0
end

local function effect(cls, name, props)
	local e = Lighting:FindFirstChild(name)
	if not e then
		e = Instance.new(cls)
		e.Name = name
		for k, v in pairs(props) do e[k] = v end
		e.Parent = Lighting
	end
	return e
end

function Graphics.apply()
	local r = GraphicsPresets.resolve(Settings.get("gq"), Settings.get("gsh"), Settings.get("gpe"), Settings.get("gdd"), quality())
	Graphics.cur = r
	Lighting.GlobalShadows = r.shadows
	Lighting.EnvironmentDiffuseScale = r.diffuse
	Lighting.EnvironmentSpecularScale = r.specular
	effect("ColorCorrectionEffect", "IrbidGrade", { Saturation = 0.08, Contrast = 0.06, TintColor = Color3.fromRGB(255, 249, 240) }).Enabled = r.post
	effect("BloomEffect", "IrbidBloom", { Intensity = 0.35, Size = 24, Threshold = 1.6 }).Enabled = r.post
	effect("SunRaysEffect", "IrbidSunRays", { Intensity = 0.05, Spread = 0.7 }).Enabled = r.post and r.sunRays
	if Props.dist ~= r.dist then
		Props.dist = r.dist
		Props.refresh()
	end
	Weather.rainK = r.rain
end

Settings.onChange(function(k)
	if k == "gq" or k == "gsh" or k == "gpe" or k == "gdd" then Graphics.apply() end
end)

-- Auto: follow a change of Roblox's quality slider
task.spawn(function()
	local last = quality()
	while true do
		task.wait(2)
		local q = quality()
		if q ~= last then
			last = q
			if Settings.get("gq") == 0 then Graphics.apply() end
		end
	end
end)

-- the line under the rows in the settings menu
function Graphics.line()
	local r = Graphics.cur
	if not r then return "" end
	return "Graphics now: " .. r.name .. (Settings.get("gq") == 0 and " (Auto, from Roblox's graphics quality)" or "") .. " · shadows "
		.. (r.shadows and "on" or "off") .. " · colour grading " .. (r.post and "on" or "off") .. " · props drawn to "
		.. math.floor(r.dist * 100 + 0.5) .. " % of the web distance"
end

return Graphics
