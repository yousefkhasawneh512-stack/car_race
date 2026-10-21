-- Irbid Drive (Roblox) - the player's device: loads the road graph, starts the modules in Client/, reads the controls and runs them
-- every frame. Controls: W/S or the thumbstick = gas / brake-reverse, A/D steer, Space or DRIFT = handbrake, F reset, C camera,
-- G garage, N GPS, R race, E rob the bank, U tuning shop, K car wheel. Phones and tablets use the on-screen buttons.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ContextActionService = game:GetService("ContextActionService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Client = script.Parent:WaitForChild("Client")
local State = require(Client:WaitForChild("State"))

local plr = Players.LocalPlayer
local controls = require(plr:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule")):GetControls()

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
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))
local Nav = require(Client:WaitForChild("Nav"))
local Missions = require(Client:WaitForChild("Missions"))
local Menus = require(Client:WaitForChild("Menus"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- the tuning shop opens only at Apex Drift Customs
function Missions.openShop()
	if Missions.nearShop() then
		Menus.shop()
	else
		Hud.toast("Apex Drift Customs is the orange pad: find it on the minimap")
	end
end

-- ---- buttons (all devices) ----
Hud.sideButton("🚗 Garage (G)", Menus.garage)
Hud.sideButton("🎡 Wheel (K)", Menus.wheel)
Hud.sideButton("📍 GPS (N)", Nav.open)
Hud.sideButton("🏁 Race (R)", Missions.race)
Hud.sideButton("🎥 Camera (C)", Drive.cycleCam)
Hud.sideButton("↺ Reset (F)", Drive.reset)

-- ---- keys ----
local hb = false
ContextActionService:BindAction("Handbrake", function(_, state)
	hb = state == Enum.UserInputState.Begin
	return Enum.ContextActionResult.Sink
end, true, Enum.KeyCode.Space, Enum.KeyCode.ButtonR1)
ContextActionService:SetTitle("Handbrake", "DRIFT")
ContextActionService:SetPosition("Handbrake", UDim2.new(1, -170, 1, -150))

local KEYS = {
	[Enum.KeyCode.F] = Drive.reset,
	[Enum.KeyCode.C] = Drive.cycleCam,
	[Enum.KeyCode.G] = Menus.garage,
	[Enum.KeyCode.N] = Nav.open,
	[Enum.KeyCode.R] = Missions.race,
	[Enum.KeyCode.E] = Missions.rob,
	[Enum.KeyCode.U] = Missions.openShop,
	[Enum.KeyCode.K] = Menus.wheel,
	[Enum.KeyCode.Escape] = Hud.closePanel,
}
UserInputService.InputBegan:Connect(function(io, gp)
	if gp then return end
	local f = KEYS[io.KeyCode]
	if f then f() end
end)

-- ---- info line ----
local function clockText()
	local h = game:GetService("Lighting").ClockTime
	return string.format("%02d:%02d", math.floor(h), math.floor((h % 1) * 60))
end
local infoT = 0
local function info(dt)
	infoT -= dt
	if infoT > 0 then return end
	infoT = 0.2
	Hud.info.Text = "IRBID DRIVE · 📍 " .. (Nav.street ~= "" and Nav.street or "off-road") .. " · " .. clockText()
		.. " · Cash " .. Hud.fmt(plr:GetAttribute("Cash") or 0) .. " · Drift bank " .. Hud.fmt(plr:GetAttribute("DriftBank") or 0)
end

Traffic.start()
Hud.toast("Welcome to Irbid! Drift to earn points and cash. R = race, N = GPS, G = garage", 6)

local ai = State.ai
RunService.RenderStepped:Connect(function(dt)
	local mv = controls:GetMoveVector()
	local inp = State.input
	inp.th, inp.br, inp.steer, inp.hb = math.max(0, -mv.Z), math.max(0, mv.Z), -mv.X, hb
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
	info(dt)
	Hud.step(dt)
end)

-- keep the seat: if the player somehow stands up, the server seats them again
plr.CharacterAdded:Connect(function()
	task.wait(1)
	if State.car and not State.car.Parent then Remotes.ResetCar:FireServer() end
end)
