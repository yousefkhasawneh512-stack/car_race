-- Irbid Drive (Roblox) - light and haze (a dry, dusty afternoon look) and gravity in studs.
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

return function()
	Lighting.ClockTime = 9
	Lighting.Brightness = 2.5
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 140, 125)
	local atm = Instance.new("Atmosphere")
	atm.Density = 0.28
	atm.Haze = 1.2
	atm.Color = Color3.fromRGB(214, 200, 176)
	atm.Decay = Color3.fromRGB(120, 110, 95)
	atm.Parent = Lighting
	-- Roblox's default gravity; the cars run their own physics in metres (Client/Drive), so this only affects avatars
	Workspace.Gravity = 196.2
end
