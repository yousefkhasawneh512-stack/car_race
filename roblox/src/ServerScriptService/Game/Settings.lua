-- Irbid Drive (Roblox) - each player's settings (handling, gearbox, assists, damage, weather, clock, traffic, camera, sound, text size...):
-- the device sends them with the SaveSettings remote, the server checks every value against the shared schema
-- (ReplicatedStorage.Modules.SettingsSchema), keeps them with the progress (saved in the DataStore) and puts them in the player
-- attribute "Settings", which the device reads when it joins again.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Schema = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("SettingsSchema"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))

Remotes.SaveSettings.OnServerEvent:Connect(function(plr, s)
	local d = PlayerData.data[plr]
	if not d or type(s) ~= "string" then return end
	-- at most 4 changes a second are taken (a device cannot flood the DataStore record)
	local now = os.clock()
	if now - (d.setT or -1) < 0.25 then return end
	d.setT = now
	d.settings = Schema.encode(Schema.parse(s))
	plr:SetAttribute("Settings", d.settings)
end)

return {}
