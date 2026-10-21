-- Irbid Drive (Roblox) - the player's device: loads the road graph, starts the modules in Client/ and runs them every frame.
-- What each module does is written at the top of its file. Order of a frame: controls -> the player's car (Drive) -> traffic ->
-- races / heist (Missions) -> street name, GPS, minimap (Nav) -> camera -> info line -> messages.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Client = script.Parent:WaitForChild("Client")
local State = require(Client:WaitForChild("State"))

local plr = Players.LocalPlayer

-- the road graph (traffic, GPS, minimap, street names, reset)
do
	local edges, i = {}, 1
	while Shared:FindFirstChild("GraphEdges" .. i) do
		edges[#edges + 1] = require(Shared["GraphEdges" .. i])
		i += 1
	end
	State.road = Road.build(require(Shared:WaitForChild("GraphNodes")), edges, require(Shared:WaitForChild("GraphNames")))
end
while not Workspace:GetAttribute("MapReady") do task.wait(0.25) end

local Hud = require(Client:WaitForChild("Hud"))
local Controls = require(Client:WaitForChild("Controls"))
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))
local Nav = require(Client:WaitForChild("Nav"))
local Missions = require(Client:WaitForChild("Missions"))
local Menus = require(Client:WaitForChild("Menus"))
local InfoLine = require(Client:WaitForChild("InfoLine"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- the tuning shop opens only at Apex Drift Customs
function Missions.openShop()
	if Missions.nearShop() then
		Menus.shop()
	else
		Hud.toast("Apex Drift Customs is the orange pad: find it on the minimap")
	end
end

Controls.start({
	reset = Drive.reset, camera = Drive.cycleCam, garage = Menus.garage, gps = Nav.open,
	race = Missions.race, rob = Missions.rob, shop = Missions.openShop, wheel = Menus.wheel,
})

Traffic.start()
Hud.toast("Welcome to Irbid! Drift to earn points and cash. R = race, N = GPS, G = garage", 6)

local ai = State.ai
RunService.RenderStepped:Connect(function(dt)
	Controls.read()
	-- every AI car of this frame, for bumping, following and the minimap
	table.clear(ai)
	for _, a in ipairs(Traffic.agents) do ai[#ai + 1] = a end
	for _, a in ipairs(Missions.rivals) do ai[#ai + 1] = a end
	for _, a in ipairs(Missions.cops) do ai[#ai + 1] = a end
	Drive.step(dt)
	Traffic.step(dt)
	Missions.step(dt)
	Nav.step(dt)
	Drive.camera(dt)
	InfoLine.step(dt)
	Hud.step(dt)
end)

-- keep the seat: if the player somehow stands up, the server seats them again
plr.CharacterAdded:Connect(function()
	task.wait(1)
	if State.car and not State.car.Parent then Remotes.ResetCar:FireServer() end
end)
