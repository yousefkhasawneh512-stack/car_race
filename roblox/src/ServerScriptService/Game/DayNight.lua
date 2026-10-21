-- Irbid Drive (Roblox) - day and night: one in-game day every Config.DAY_MINUTES real minutes, starting at 09:00; car headlights
-- switch on at night (Workspace attribute "Night", also read by CarBuilder for new cars).
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local night = false
Workspace:SetAttribute("Night", false)
task.spawn(function()
	local t0 = os.clock()
	while true do
		local h = (9 + (os.clock() - t0) / (Config.DAY_MINUTES * 60) * 24) % 24
		Lighting.ClockTime = h
		local nowNight = h < 6.3 or h > 18.2
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
		task.wait(1)
	end
end)

return {}
