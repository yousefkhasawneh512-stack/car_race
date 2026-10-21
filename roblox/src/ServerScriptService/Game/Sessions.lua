-- Irbid Drive (Roblox) - players joining and leaving: load their progress, add the leaderboard, load the avatar once the map exists
-- (characters do not load by themselves: they would fall through the empty world while WorldBuilder runs), respawn after a death,
-- save on leaving, on shutdown and every 2 minutes.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Spawner = require(script.Parent:WaitForChild("Spawner"))
local Purchases = require(script.Parent:WaitForChild("Purchases"))

Players.CharacterAutoLoads = false

local function setup(plr)
	local d = PlayerData.load(plr)
	d.vip = Purchases.vipOwned(plr)
	if d.vip then
		for i, c in ipairs(Config.CARS) do
			if c.vip then d.owned[i] = true end
		end
	end
	PlayerData.data[plr] = d
	local ls = Instance.new("Folder"); ls.Name = "leaderstats"; ls.Parent = plr
	local c = Instance.new("IntValue"); c.Name = "JD"; c.Parent = ls
	local dr = Instance.new("IntValue"); dr.Name = "Drift"; dr.Parent = ls
	PlayerData.sync(plr)
	plr.CharacterAdded:Connect(function(char)
		local hum = char:WaitForChild("Humanoid")
		hum.Died:Connect(function()
			task.wait(2)
			if plr.Parent then plr:LoadCharacter() end
		end)
		task.wait(0.5)
		Spawner.spawn(plr, false)
	end)
	Spawner.waitForMap()
	if plr.Parent then plr:LoadCharacter() end
end

Players.PlayerAdded:Connect(setup)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(setup, p) end
Players.PlayerRemoving:Connect(function(plr)
	PlayerData.save(plr)
	local car = Workspace:FindFirstChild("Car_" .. plr.UserId)
	if car then car:Destroy() end
	PlayerData.data[plr] = nil
end)
game:BindToClose(function()
	for _, p in ipairs(Players:GetPlayers()) do PlayerData.save(p) end
end)
task.spawn(function()
	while true do
		task.wait(120)
		for _, p in ipairs(Players:GetPlayers()) do PlayerData.save(p) end
	end
end)

return {}
