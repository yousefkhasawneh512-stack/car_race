-- Irbid Drive (Roblox) - the name of the street under the car (OpenStreetMap), checked 4 times a second, for the info line.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local State = require(script.Parent:WaitForChild("State"))

local StreetName = { name = "" }
local t = 0

function StreetName.step(dt)
	t -= dt
	if t > 0 then return end
	t = 0.25
	local near = State.road and Road.nearest(State.road, State.st.x, State.st.z, 25)
	StreetName.name = near and near.e.name or ""
end

return StreetName
