-- Irbid Drive (Roblox) - accessibility (the web game's 12e A11Y): text size 90 / 100 / 120 / 140 % for the whole HUD and the menus
-- (setting "ts"), reduced motion (setting "rm": no speed zoom of the camera, read by Camera).
local Client = script.Parent
local Hud = require(Client:WaitForChild("Hud"))
local Settings = require(Client:WaitForChild("Settings"))

local Accessibility = {}
local SIZES = { 0.9, 1, 1.2, 1.4 }
local scale = Instance.new("UIScale")
scale.Name = "TextSize"
scale.Parent = Hud.gui
Accessibility.scale = scale
Settings.provide("ts", "rm")
Settings.onChange(function(k, v)
	if k == "ts" then scale.Scale = SIZES[v + 1] or 1 end
end)

return Accessibility
