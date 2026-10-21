-- Irbid Drive (Roblox) - the remotes the players' devices use (ReplicatedStorage.Remotes):
--   BankDrift (event: drift points), CarAction (function: garage / shop / wheel / Robux prompts), ResetCar (event),
--   CarReady (event: the device has taken its car over), Mission (function: race and heist results).
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
folder.Parent = ReplicatedStorage

return Remotes
