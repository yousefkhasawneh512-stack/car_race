-- Irbid Drive (Roblox) - day and night, as in the web game: the clock starts at 15:00 and runs one hour every 40 s
-- (Config.DAY_MINUTES = 16 for a whole day); T adds an hour (in Roblox for everyone on the server). Car headlights switch on at night
-- (Workspace attribute "Night", also read by CarBuilder for new cars).
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))

local night = false
local hour = 15
local lastT = {}
Remotes.AddHour.OnServerEvent:Connect(function(plr)
	-- at most once a second per player
	if os.clock() - (lastT[plr] or -9) < 1 then return end
	lastT[plr] = os.clock()
	hour = (hour + 1) % 24
end)

Workspace:SetAttribute("Night", false)
task.spawn(function()
	local last = os.clock()
	while true do
		local now = os.clock()
		hour = (hour + (now - last) / (Config.DAY_MINUTES * 60) * 24) % 24
		last = now
		Lighting.ClockTime = hour
		local nowNight = hour < 6.3 or hour > 18.2
		if nowNight ~= night then
			night = nowNight
			for _, m in ipairs(Workspace:GetChildren()) do
				if m:IsA("Model") and string.sub(m.Name, 1, 4) == "Car_" then
					for _, l in ipairs(m:GetDescendants()) do
						if l:IsA("SpotLight") then l.Enabled = night end
					end
				end
			end
		end
		Workspace:SetAttribute("Night", night)
		task.wait(0.5)
	end
end)

return {}
