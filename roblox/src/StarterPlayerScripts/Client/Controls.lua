-- Irbid Drive (Roblox) - controls, the web game's keys: W/S or the thumbstick = gas / brake-reverse, A/D steer (Roblox's movement input),
-- Space or DRIFT = handbrake, F reset to the start, C camera, G car wheel, N / B next / previous car, M GPS search, K landmark tour,
-- J stunt ramps, T +1 hour, R race (or a duel next to a traffic car), E rob the bank (elsewhere: shift up), Q shift down, H handling
-- Arcade / Realistic, U or P tuning shop, X horn, L mute, I damage Off / Cosmetic / Full, O diagnostics, Z auto-drive, Esc closes a menu. Roblox only: V garage, Y settings (the web game's Esc pause menu:
-- Roblox keeps Esc for its own menu). Phones and tablets get the web game's touch pads (steer left / right, GAS, BRAKE, DRIFT) and the menu buttons.
local Players = game:GetService("Players")
local ContextActionService = game:GetService("ContextActionService")
local UserInputService = game:GetService("UserInputService")
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Gamepad = require(Client:WaitForChild("Gamepad"))

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

-- actions = {reset, camera, wheel, nextCar, prevCar, gps, tour, ramps, hour, race, eKey, gearDown, handling, settings, shop, horn(on), garage}
function Controls.start(a)
	Hud.sideButton("⚙ Settings (Y)", a.settings)
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
	end, false, Enum.KeyCode.Space)
	-- gamepad / wheel buttons call the same actions as the keys (bindings in the gamepad setup)
	Gamepad.bind({ up = a.eKey, down = a.gearDown, camera = a.camera, horn = a.horn, race = a.race, reset = a.reset, tour = a.tour,
		gps = a.gps, settings = a.settings, nextCar = a.nextCar, prevCar = a.prevCar })
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
		[Enum.KeyCode.E] = a.eKey,
		[Enum.KeyCode.Q] = a.gearDown,
		[Enum.KeyCode.H] = a.handling,
		[Enum.KeyCode.Y] = a.settings,
		[Enum.KeyCode.L] = a.mute,
		[Enum.KeyCode.I] = a.damage,
		[Enum.KeyCode.O] = a.diag,
		[Enum.KeyCode.Z] = a.autodrive,
		[Enum.KeyCode.U] = a.shop,
		[Enum.KeyCode.P] = a.shop,
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

-- every frame: the driving input into State.input. With a gamepad / wheel in use: the keys first, then its analog values (the web
-- game's order: keyboard, then the wheel; analog steering goes straight to the steering angle in Realistic). Otherwise Roblox's move
-- input (keyboard, touch thumbstick) and the touch pads.
local K = Enum.KeyCode
local function down(a, b)
	return UserInputService:IsKeyDown(a) or UserInputService:IsKeyDown(b)
end
function Controls.read(dt)
	local inp = State.input
	local gp = Gamepad.poll(dt or 1 / 60)
	local st = (pad.l and 1 or 0) - (pad.r and 1 or 0)
	if gp.on then
		local kW, kS = down(K.W, K.Up), down(K.S, K.Down)
		local ks = ((pad.l or down(K.A, K.Left)) and 1 or 0) - ((pad.r or down(K.D, K.Right)) and 1 or 0)
		inp.th = (kW or pad.gas) and 1 or gp.thr
		inp.br = (kS or pad.brake) and 1 or gp.brk
		if ks ~= 0 then
			inp.steer, inp.an = ks, false
		else
			inp.steer, inp.an = -gp.steer, true
		end
		inp.hb = hb or pad.drift or gp.hb
		if Controls.after then Controls.after(inp, dt or 1 / 60) end
		return
	end
	local mv = move:GetMoveVector()
	inp.th = math.max(0, -mv.Z, pad.gas and 1 or 0)
	inp.br = math.max(0, mv.Z, pad.brake and 1 or 0)
	inp.steer = st ~= 0 and st or -mv.X
	inp.an = false
	inp.hb = hb or pad.drift
	if Controls.after then Controls.after(inp, dt or 1 / 60) end
end

return Controls
