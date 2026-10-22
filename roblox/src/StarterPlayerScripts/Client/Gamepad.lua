-- Irbid Drive (Roblox) - gamepads and racing wheels (the web game's 10c_wheel.js input path, ported to what Roblox exposes).
-- Roblox reads gamepads only (XInput-style: two sticks, two triggers, buttons); it has no access to HID devices, so a Logitech G29 is
-- seen only through a layer that presents it as a gamepad (Steam Input or x360ce: steering on a stick axis, pedals on the triggers or
-- on a stick axis). Force feedback is not available; the web game's fallback for pads without force feedback (a short rumble on impacts
-- and hard landings) is used instead (HapticService).
-- The steering value goes through the web game's processing, in this order: invert, centre offset, sensitivity (the web game's
-- range / lock), dead zone, response curve, smoothing. Pedals: dead zone at both ends. Buttons call the same actions as the keys
-- (one code path, as in the web game); every binding is a setting (the settings menu cycles through the buttons).
-- Gamepad.state = {on, steer (-1..1, + = right, like the web wheel), thr, brk (0..1), hb, raw}
local UserInputService = game:GetService("UserInputService")
local HapticService = game:GetService("HapticService")
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Settings = require(Client:WaitForChild("Settings"))

local Gamepad = {}
local PAD = Enum.UserInputType.Gamepad1
local S = { on = false, steer = 0, thr = 0, brk = 0, hb = false, raw = 0 }
Gamepad.state = S
-- the raw axes: sticks -1..1 (y up = +), triggers 0..1
local ax = { lx = 0, ly = 0, rx = 0, ry = 0, l2 = 0, r2 = 0 }
Gamepad.axes = ax
-- the bindable buttons (setting value -> KeyCode); the order is the settings' value order
Gamepad.BUTTONS = { Enum.KeyCode.ButtonA, Enum.KeyCode.ButtonB, Enum.KeyCode.ButtonX, Enum.KeyCode.ButtonY, Enum.KeyCode.ButtonL1, Enum.KeyCode.ButtonR1,
	Enum.KeyCode.ButtonL3, Enum.KeyCode.ButtonR3, Enum.KeyCode.DPadUp, Enum.KeyCode.DPadDown, Enum.KeyCode.DPadLeft, Enum.KeyCode.DPadRight }
-- action -> setting key (the defaults are in the settings schema: A handbrake, RB / LB gears, Y camera, X horn, B race, R3 start,
-- L3 tour, d-pad: up GPS, down settings, right / left next / previous car)
Gamepad.BIND = { hb = "bhb", up = "bup", down = "bdn", camera = "bcam", horn = "bhorn", race = "brace", reset = "breset", tour = "btour",
	gps = "bgps", settings = "bset", nextCar = "bnext", prevCar = "bprev" }
local held = {}
local actions = nil

Settings.provide("gs", "gp", "ginv", "gsens", "gdz", "gcen", "gcurve", "gsm", "gpdz", "grum")
for _, k in pairs(Gamepad.BIND) do Settings.provide(k) end

-- which action a button is bound to (nil = none)
local function actionOf(code)
	for a, k in pairs(Gamepad.BIND) do
		local v = Settings.get(k)
		if v >= 0 and Gamepad.BUTTONS[v + 1] == code then return a end
	end
	return nil
end

local function onInput(io, down)
	if io.UserInputType ~= PAD then return end
	S.on = true
	local kc = io.KeyCode
	if kc == Enum.KeyCode.Thumbstick1 then
		ax.lx, ax.ly = io.Position.X, io.Position.Y
	elseif kc == Enum.KeyCode.Thumbstick2 then
		ax.rx, ax.ry = io.Position.X, io.Position.Y
	elseif kc == Enum.KeyCode.ButtonL2 then
		ax.l2 = down == false and 0 or io.Position.Z
	elseif kc == Enum.KeyCode.ButtonR2 then
		ax.r2 = down == false and 0 or io.Position.Z
	elseif down ~= nil then
		held[kc] = down
		local a = actionOf(kc)
		if a and actions then
			if a == "hb" then
				-- held (read every frame)
			elseif a == "horn" then
				if actions.horn then actions.horn(down) end
			elseif down and actions[a] then
				actions[a]()
			end
		end
	end
end

-- acts = the same action table as the keys (Controls.start)
function Gamepad.bind(acts)
	actions = acts
end

UserInputService.InputBegan:Connect(function(io) onInput(io, true) end)
UserInputService.InputEnded:Connect(function(io) onInput(io, false) end)
UserInputService.InputChanged:Connect(function(io) onInput(io, nil) end)
UserInputService.GamepadDisconnected:Connect(function(pad)
	if pad == PAD then
		S.on, S.steer, S.thr, S.brk, S.hb = false, 0, 0, 0, false
		for k in pairs(ax) do ax[k] = 0 end
		table.clear(held)
	end
end)

local function pedal(v, dz)
	v = math.clamp(v, 0, 1)
	return v < dz and 0 or math.min(1, (v - dz) / (1 - 2 * dz))
end

-- every frame (from Controls.read)
function Gamepad.poll(dt)
	if not S.on then return S end
	-- steering (the web game's poll): axis, invert, centre offset, sensitivity, dead zone, curve, smoothing
	local a = Settings.get("gs") == 1 and ax.rx or ax.lx
	if Settings.get("ginv") == 1 then a = -a end
	S.raw = a
	local n = math.clamp((a - Settings.get("gcen") / 100) * Settings.get("gsens") / 10, -1, 1)
	local d = Settings.get("gdz") / 100
	n = math.abs(n) < d and 0 or math.sign(n) * (math.abs(n) - d) / (1 - d)
	local cv = Settings.get("gcurve") / 10
	if cv > 1 then n = math.sign(n) * math.abs(n) ^ cv end
	local sm = Settings.get("gsm") * 0.02
	S.steer = sm > 0 and S.steer + (n - S.steer) * (1 - math.exp(-dt / sm)) or n
	-- pedals: the triggers (R2 gas, L2 brake) or one stick's up / down
	local pdz = Settings.get("gpdz") / 100
	local mode = Settings.get("gp")
	if mode == 0 then
		S.thr, S.brk = pedal(ax.r2, pdz), pedal(ax.l2, pdz)
	else
		local y = mode == 1 and ax.ry or ax.ly
		S.thr, S.brk = pedal(y, pdz), pedal(-y, pdz)
	end
	local hbk = Settings.get("bhb")
	S.hb = hbk >= 0 and held[Gamepad.BUTTONS[hbk + 1]] == true and not State.ui
	return S
end

-- the web game's rumble fallback: a short pulse on a hard impact (speed change > 3 m/s in one frame above 5 m/s) or a hard landing
local FF = { pvx = 0, pvz = 0, px = 0, pz = 0, pv = 0, air = false, vyp = 0, imp = 0, impT = 9, rum = 0, t = 0 }
local vib = nil
function Gamepad.rumble(dt)
	FF.t += dt
	if not S.on or Settings.get("grum") == 0 then return end
	if vib == nil then
		vib = false
		pcall(function() vib = HapticService:IsVibrationSupported(PAD) and HapticService:IsMotorSupported(PAD, Enum.VibrationMotor.Large) end)
	end
	local st = State.st
	local vx, vz = st.vx, st.vz
	local v = math.sqrt(vx * vx + vz * vz)
	local dvx, dvz = vx - FF.pvx, vz - FF.pvz
	local dv = math.sqrt(dvx * dvx + dvz * dvz)
	local tele = math.sqrt((st.x - FF.px) ^ 2 + (st.z - FF.pz) ^ 2) > math.max(4, v * dt * 3)
	local ie = FF.imp * math.exp(-FF.impT * 9)
	if not tele and FF.pv > 5 and dv > 3 then
		local m = math.min(1, dv / 10)
		if m > ie then FF.imp, FF.impT = m, 0 end
	end
	if st.gnd and FF.air and FF.vyp < -3 then
		local m = math.min(0.8, -FF.vyp / 10)
		if m > FF.imp * math.exp(-FF.impT * 9) then FF.imp, FF.impT = m, 0 end
	end
	FF.air = not st.gnd
	if not st.gnd then FF.vyp = st.vy end
	FF.pvx, FF.pvz, FF.px, FF.pz, FF.pv = vx, vz, st.x, st.z, v
	ie = FF.imp * math.exp(-FF.impT * 9)
	FF.impT += dt
	Gamepad.lastRumble = Gamepad.lastRumble or 0
	if ie > 0.25 and FF.t - FF.rum > 0.16 then
		FF.rum = FF.t
		Gamepad.lastRumble = math.min(1, ie)
		if vib then
			pcall(function() HapticService:SetMotor(PAD, Enum.VibrationMotor.Large, math.min(1, ie)) end)
			task.delay(0.11, function()
				pcall(function() HapticService:SetMotor(PAD, Enum.VibrationMotor.Large, 0) end)
			end)
		end
	end
end

return Gamepad
