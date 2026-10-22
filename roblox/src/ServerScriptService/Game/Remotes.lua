-- Irbid Drive (Roblox) - the remotes the players' devices use (ReplicatedStorage.Remotes):
--   BankDrift (event: drift points), CarAction (function: garage / shop / wheel / Robux prompts), ResetCar (event),
--   CarReady (event: the device has taken its car over), Mission (function: race and heist results), Fine (event: a traffic offence),
--   AddHour (event: the T key, +1 hour on the clock), SaveSettings (event: the player's settings, checked by Game/Settings),
--   Damage (function: vehicle damage records and paid repairs, Game/DamageStore).
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local folder = Instance.new("Folder")
folder.Name = "Remotes"
local Remotes = {}
local function remote(cls, name)
	local r = Instance.new(cls)
	r.Name = name
	r.Parent = folder
	Remotes[name] = r
end
remote("RemoteEvent", "BankDrift")
remote("RemoteFunction", "CarAction")
remote("RemoteEvent", "ResetCar")
remote("RemoteEvent", "CarReady")
remote("RemoteFunction", "Mission")
remote("RemoteEvent", "Fine")
remote("RemoteEvent", "AddHour")
remote("RemoteEvent", "SaveSettings")
remote("RemoteFunction", "Damage")
folder.Parent = ReplicatedStorage

return Remotes
