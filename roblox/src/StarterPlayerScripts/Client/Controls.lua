-- Irbid Drive (Roblox) - controls, the web game's keys: W/S or the thumbstick = gas / brake-reverse, A/D steer (Roblox's movement input),
-- Space or DRIFT = handbrake, F reset to the start, C camera, G car wheel, N / B next / previous car, M GPS search, K landmark tour,
-- J stunt ramps, T +1 hour, R race (or a duel next to a traffic car), E rob the bank, U tuning shop, X horn, Esc closes a menu.
-- Roblox only: V garage. Phones and tablets get on-screen buttons.
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

-- actions = {reset, camera, wheel, nextCar, prevCar, gps, tour, ramps, hour, race, rob, shop, horn(on), garage}
function Controls.start(a)
	Hud.sideButton("🎡 Wheel (G)", a.wheel)
	Hud.sideButton("🚗 Garage (V)", a.garage)
	Hud.sideButton("📍 GPS (M)", a.gps)
	Hud.sideButton("🏁 Race (R)", a.race)
	Hud.sideButton("🗺 Tour (K)", a.tour)
	Hud.sideButton("🎥 Camera (C)", a.camera)
	Hud.sideButton("↺ Start (F)", a.reset)
	ContextActionService:BindAction("Handbrake", function(_, state)
		hb = state == Enum.UserInputState.Begin
		return Enum.ContextActionResult.Sink
	end, true, Enum.KeyCode.Space, Enum.KeyCode.ButtonR1)
	ContextActionService:SetTitle("Handbrake", "DRIFT")
	ContextActionService:SetPosition("Handbrake", UDim2.new(1, -170, 1, -150))
	local KEYS = {
		[Enum.KeyCode.F] = a.reset,
		[Enum.KeyCode.C] = a.camera,
		[Enum.KeyCode.G] = a.wheel,
		[Enum.KeyCode.N] = a.nextCar,
		[Enum.KeyCode.B] = a.prevCar,
		[Enum.KeyCode.M] = a.gps,
		[Enum.KeyCode.K] = a.tour,
		[Enum.KeyCode.J] = a.ramps,
		[Enum.KeyCode.T] = a.hour,
		[Enum.KeyCode.R] = a.race,
		[Enum.KeyCode.E] = a.rob,
		[Enum.KeyCode.U] = a.shop,
		[Enum.KeyCode.V] = a.garage,
		[Enum.KeyCode.Escape] = Hud.closePanel,
	}
	UserInputService.InputBegan:Connect(function(io, gp)
		if gp then return end
		if io.KeyCode == Enum.KeyCode.X then
			a.horn(true)
			return
		end
		-- menus block the driving keys (the web game's ui flag); Esc and the menu keys still work
		local f = KEYS[io.KeyCode]
		if f then f() end
	end)
	UserInputService.InputEnded:Connect(function(io)
		if io.KeyCode == Enum.KeyCode.X then a.horn(false) end
	end)
end

-- every frame: the movement input into State.input
function Controls.read()
	local mv = move:GetMoveVector()
	local inp = State.input
	inp.th, inp.br, inp.steer, inp.hb = math.max(0, -mv.Z), math.max(0, mv.Z), -mv.X, hb
end

return Controls
