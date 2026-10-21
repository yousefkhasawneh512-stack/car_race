-- Irbid Drive (Roblox) - controls: W/S or the thumbstick = gas / brake-reverse, A/D steer (Roblox's own movement input), Space or
-- the DRIFT button = handbrake, and the keys / on-screen buttons for everything else:
-- F reset, C camera, G garage, N GPS, R race, E rob the bank, U tuning shop, K car wheel, Esc closes a menu.
local Players = game:GetService("Players")
local ContextActionService = game:GetService("ContextActionService")
local UserInputService = game:GetService("UserInputService")
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))

local Controls = {}
local plr = Players.LocalPlayer
local move = require(plr:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule")):GetControls()
local hb = false

-- actions = {reset, camera, garage, gps, race, rob, shop, wheel}
function Controls.start(actions)
	Hud.sideButton("🚗 Garage (G)", actions.garage)
	Hud.sideButton("🎡 Wheel (K)", actions.wheel)
	Hud.sideButton("📍 GPS (N)", actions.gps)
	Hud.sideButton("🏁 Race (R)", actions.race)
	Hud.sideButton("🎥 Camera (C)", actions.camera)
	Hud.sideButton("↺ Reset (F)", actions.reset)
	ContextActionService:BindAction("Handbrake", function(_, state)
		hb = state == Enum.UserInputState.Begin
		return Enum.ContextActionResult.Sink
	end, true, Enum.KeyCode.Space, Enum.KeyCode.ButtonR1)
	ContextActionService:SetTitle("Handbrake", "DRIFT")
	ContextActionService:SetPosition("Handbrake", UDim2.new(1, -170, 1, -150))
	local KEYS = {
		[Enum.KeyCode.F] = actions.reset,
		[Enum.KeyCode.C] = actions.camera,
		[Enum.KeyCode.G] = actions.garage,
		[Enum.KeyCode.N] = actions.gps,
		[Enum.KeyCode.R] = actions.race,
		[Enum.KeyCode.E] = actions.rob,
		[Enum.KeyCode.U] = actions.shop,
		[Enum.KeyCode.K] = actions.wheel,
		[Enum.KeyCode.Escape] = Hud.closePanel,
	}
	UserInputService.InputBegan:Connect(function(io, gp)
		if gp then return end
		local f = KEYS[io.KeyCode]
		if f then f() end
	end)
end

-- every frame: the movement input into State.input
function Controls.read()
	local mv = move:GetMoveVector()
	local inp = State.input
	inp.th, inp.br, inp.steer, inp.hb = math.max(0, -mv.Z), math.max(0, mv.Z), -mv.X, hb
end

return Controls
