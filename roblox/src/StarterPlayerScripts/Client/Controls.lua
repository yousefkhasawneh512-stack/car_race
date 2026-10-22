-- Irbid Drive (Roblox) - controls, the web game's keys: W/S or the thumbstick = gas / brake-reverse, A/D steer (Roblox's movement input),
-- Space or DRIFT = handbrake, F reset to the start, C camera, G car wheel, N / B next / previous car, M GPS search, K landmark tour,
-- J stunt ramps, T +1 hour, R race (or a duel next to a traffic car), E rob the bank, U tuning shop, X horn, Esc closes a menu.
-- Roblox only: V garage. Phones and tablets get the web game's touch pads (steer left / right, GAS, BRAKE, DRIFT) and the menu buttons.
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
-- the touch pads held down: l, r, gas, brake, drift
local pad = { l = false, r = false, gas = false, brake = false, drift = false }

local function touchPads()
	local f = Instance.new("Frame")
	f.Name = "TouchPads"
	f.BackgroundTransparency = 1
	f.Size = UDim2.fromScale(1, 1)
	f.Parent = Hud.gui
	local function mk(key, txt, pos, size, color)
		local b = Instance.new("TextButton")
		b.Name = key
		b.Text = txt
		b.Position = pos
		b.Size = size
		b.AnchorPoint = Vector2.new(0, 1)
		b.BackgroundColor3 = color
		b.BackgroundTransparency = 0.35
		b.TextColor3 = Color3.new(1, 1, 1)
		b.Font = Enum.Font.GothamBold
		b.TextSize = 22
		b.AutoButtonColor = false
		b.Parent = f
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 14)
		c.Parent = b
		local function set(on)
			pad[key] = on
			b.BackgroundTransparency = on and 0.1 or 0.35
		end
		b.InputBegan:Connect(function(io)
			if io.UserInputType == Enum.UserInputType.Touch or io.UserInputType == Enum.UserInputType.MouseButton1 then set(true) end
		end)
		b.InputEnded:Connect(function(io)
			if io.UserInputType == Enum.UserInputType.Touch or io.UserInputType == Enum.UserInputType.MouseButton1 then set(false) end
		end)
		b.MouseLeave:Connect(function() set(false) end)
	end
	local GREY, GREEN, RED, ORANGE = Color3.fromRGB(40, 46, 56), Color3.fromRGB(30, 150, 70), Color3.fromRGB(190, 40, 40), Color3.fromRGB(220, 120, 0)
	-- left thumb: steering, above the minimap; right thumb: pedals and the handbrake, beside the speed
	mk("l", "◀", UDim2.new(0, 16, 1, -250), UDim2.fromOffset(96, 96), GREY)
	mk("r", "▶", UDim2.new(0, 124, 1, -250), UDim2.fromOffset(96, 96), GREY)
	mk("brake", "BRAKE", UDim2.new(1, -350, 1, -150), UDim2.fromOffset(100, 96), RED)
	mk("gas", "GAS", UDim2.new(1, -240, 1, -150), UDim2.fromOffset(100, 130), GREEN)
	mk("drift", "DRIFT", UDim2.new(1, -350, 1, -260), UDim2.fromOffset(210, 60), ORANGE)
end

-- actions = {reset, camera, wheel, nextCar, prevCar, gps, tour, ramps, hour, race, rob, shop, horn(on), garage}
function Controls.start(a)
	Hud.sideButton("🎡 Wheel (G)", a.wheel)
	Hud.sideButton("🚗 Garage (V)", a.garage)
	Hud.sideButton("📍 GPS (M)", a.gps)
	Hud.sideButton("🏁 Race (R)", a.race)
	Hud.sideButton("🗺 Tour (K)", a.tour)
	Hud.sideButton("🎥 Camera (C)", a.camera)
	Hud.sideButton("🏠 Start (F)", a.reset)
	ContextActionService:BindAction("Handbrake", function(_, state)
		hb = state == Enum.UserInputState.Begin
		return Enum.ContextActionResult.Sink
	end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonR1)
	if UserInputService.TouchEnabled then touchPads() end
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
	local st = (pad.l and 1 or 0) - (pad.r and 1 or 0)
	inp.th = math.max(0, -mv.Z, pad.gas and 1 or 0)
	inp.br = math.max(0, mv.Z, pad.brake and 1 or 0)
	inp.steer = st ~= 0 and st or -mv.X
	inp.hb = hb or pad.drift
end

return Controls
