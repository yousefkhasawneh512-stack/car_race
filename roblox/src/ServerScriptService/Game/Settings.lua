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

-- the road reputation and rival memory (Client/Reputation): "road;Name=r,w,l,h;..." checked by its pattern, at most every 0.5 s
Remotes.SaveRep.OnServerEvent:Connect(function(plr, s: any)
	local d = PlayerData.data[plr]
	if not d or type(s) ~= "string" or #s > 200 then return end
	if not string.match(s, "^%d+[;%a%d=,]*$") then return end
	local r = tonumber(string.match(s, "^(%d+)"))
	if not r or r > 100 then return end
	local now = os.clock()
	if now - (d.repT or -1) < 0.5 then return end
	d.repT = now
	d.rep = s
	plr:SetAttribute("Rep", s)
end)

-- the saved GPS places (Client/Search): at most 20 "name|x,z" separated by ";"
Remotes.SaveFav.OnServerEvent:Connect(function(plr, s: any)
	local d = PlayerData.data[plr]
	if not d or type(s) ~= "string" or #s > 2400 then return end
	local n = 0
	for _ in string.gmatch(s, "[^;]+") do n += 1 end
	if n > 20 then return end
	d.fav = s
	plr:SetAttribute("Fav", s)
end)

-- the driving school's best scores (Client/School): "runs=n;id=score;..." checked by its pattern
Remotes.SaveSchool.OnServerEvent:Connect(function(plr, s: any)
	local d = PlayerData.data[plr]
	if not d or type(s) ~= "string" or #s > 120 or not string.match(s, "^runs=%d+[;%a%d=]*$") then return end
	for _, v in string.gmatch(s, "(%a+)=(%d+)") do
		if tonumber(v) > 100000 then return end
	end
	d.school = s
	plr:SetAttribute("School", s)
end)

return {}
