-- Irbid Drive (Roblox) - the driving model, HUD and garage on the player's device.
-- Driving model = the web game's Arcade handling (10_laws_player.js updP): world velocity, heading turned by steering, the velocity split into
-- forward / sideways parts, the sideways part decays (slowly with the handbrake -> drift). Units: metres and seconds; drawn at Config.SCALE.
-- Controls: W/S or the thumbstick (gas / brake-reverse), A/D steer, Space or the on-screen DRIFT button = handbrake, F = reset the car.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ContextActionService = game:GetService("ContextActionService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local S = Config.SCALE
local plr = Players.LocalPlayer
local controls = require(plr:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule")):GetControls()

-- ---- HUD ----
local gui = Instance.new("ScreenGui")
gui.Name = "IrbidHUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = plr:WaitForChild("PlayerGui")
local function label(pos, size, anchor, txt, ts)
	local t = Instance.new("TextLabel")
	t.Position = pos
	t.Size = size
	t.AnchorPoint = anchor
	t.BackgroundTransparency = 1
	t.TextColor3 = Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0.4
	t.Font = Enum.Font.GothamBold
	t.TextScaled = true
	t.Text = txt
	t.Parent = gui
	if ts then
		local c = Instance.new("UITextSizeConstraint"); c.MaxTextSize = ts; c.Parent = t
	end
	return t
end
local spdL = label(UDim2.new(1, -20, 1, -70), UDim2.fromOffset(200, 60), Vector2.new(1, 1), "0", 54)
label(UDim2.new(1, -20, 1, -50), UDim2.fromOffset(200, 22), Vector2.new(1, 1), "km/h", 18)
local driftL = label(UDim2.new(0.5, 0, 0, 40), UDim2.fromOffset(420, 40), Vector2.new(0.5, 0), "", 30)
local carL = label(UDim2.new(0, 16, 1, -40), UDim2.fromOffset(420, 22), Vector2.new(0, 1), "", 18)
carL.TextXAlignment = Enum.TextXAlignment.Left
local credit = label(UDim2.new(0.5, 0, 1, -4), UDim2.fromOffset(520, 16), Vector2.new(0.5, 1), Workspace:GetAttribute("Attribution") or "Map data © OpenStreetMap contributors (ODbL)", 13)
credit.TextStrokeTransparency = 0.6
local toastL = label(UDim2.new(0.5, 0, 0, 90), UDim2.fromOffset(520, 30), Vector2.new(0.5, 0), "", 22)
local toastT = 0
local function toast(s) toastL.Text = s; toastT = 3 end

-- ---- garage ----
local garage = Instance.new("Frame")
garage.Size = UDim2.fromOffset(340, 330)
garage.Position = UDim2.fromScale(0.5, 0.5)
garage.AnchorPoint = Vector2.new(0.5, 0.5)
garage.BackgroundColor3 = Color3.fromRGB(21, 24, 29)
garage.Visible = false
garage.Parent = gui
Instance.new("UICorner").Parent = garage
local list = Instance.new("UIListLayout"); list.Padding = UDim.new(0, 6); list.HorizontalAlignment = Enum.HorizontalAlignment.Center; list.Parent = garage
local pad = Instance.new("UIPadding"); pad.PaddingTop = UDim.new(0, 10); pad.Parent = garage
local function button(parent, txt, cb, w)
	local b = Instance.new("TextButton")
	b.Size = UDim2.fromOffset(w or 310, 34)
	b.BackgroundColor3 = Color3.fromRGB(39, 64, 107)
	b.TextColor3 = Color3.new(1, 1, 1)
	b.Font = Enum.Font.GothamMedium
	b.TextSize = 16
	b.Text = txt
	b.Parent = parent
	Instance.new("UICorner").Parent = b
	b.Activated:Connect(cb)
	return b
end
local rows = {}
local function refresh()
	local owned = {}
	for i in string.gmatch(plr:GetAttribute("Owned") or "1", "%d+") do owned[tonumber(i)] = true end
	for i, b in ipairs(rows) do
		local c = Config.CARS[i]
		local km = math.floor(c.vm * 3.6 + 0.5)
		b.Text = c.name .. " · " .. km .. " km/h · " .. (plr:GetAttribute("CurCar") == i and "driving" or owned[i] and "use" or c.vip and "VIP" or (c.price .. " cash"))
	end
end
for i in ipairs(Config.CARS) do
	rows[i] = button(garage, "", function()
		local ok, msg = Remotes.CarAction:InvokeServer("buy", i)
		toast(ok and ("Now driving: " .. tostring(msg)) or tostring(msg))
		refresh()
	end)
end
if Config.PRODUCT_CASH_SMALL ~= 0 then button(garage, "+" .. Config.CASH_SMALL .. " cash (Robux)", function() Remotes.CarAction:InvokeServer("cash_small") end) end
if Config.PRODUCT_CASH_BIG ~= 0 then button(garage, "+" .. Config.CASH_BIG .. " cash (Robux)", function() Remotes.CarAction:InvokeServer("cash_big") end) end
if Config.GAMEPASS_VIP ~= 0 then button(garage, "VIP: double drift cash + VIP car (Robux)", function() Remotes.CarAction:InvokeServer("vip") end) end
button(garage, "Close", function() garage.Visible = false end)
local gb = button(gui, "🚗 Garage", function() refresh(); garage.Visible = not garage.Visible end, 120)
gb.Position = UDim2.new(0, 16, 0, 60)
local rb = button(gui, "↺ Reset car", function() Remotes.ResetCar:FireServer() end, 120)
rb.Position = UDim2.new(0, 16, 0, 100)
plr:GetAttributeChangedSignal("Owned"):Connect(refresh)
plr:GetAttributeChangedSignal("CurCar"):Connect(refresh)

-- ---- input ----
local hb = false
ContextActionService:BindAction("Handbrake", function(_, state)
	hb = state == Enum.UserInputState.Begin
	return Enum.ContextActionResult.Sink
end, true, Enum.KeyCode.Space, Enum.KeyCode.ButtonR1)
ContextActionService:SetTitle("Handbrake", "DRIFT")
ContextActionService:SetPosition("Handbrake", UDim2.new(1, -170, 1, -150))
UserInputService.InputBegan:Connect(function(io, gp)
	if gp then return end
	if io.KeyCode == Enum.KeyCode.F then Remotes.ResetCar:FireServer() end
end)

-- ---- driving model ----
local car, body, lift, rp
local st = { vx = 0, vz = 0, vy = 0, h = 0, x = 0, y = 0, z = 0, gnd = false }
local drift = { pts = 0, t = 0, off = 0 }
local spec = { vm = 40, a0 = 8, bk = 9, hd = 1 }

local function attach(m)
	car = m
	body = m:WaitForChild("Body")
	lift = body:WaitForChild("Lift")
	for _, k in ipairs({ "vm", "a0", "bk", "hd" }) do spec[k] = m:GetAttribute(k) or spec[k] end
	carL.Text = (m:GetAttribute("carName") or "") .. "   ·   W/S gas-brake · A/D steer · Space drift · F reset"
	local cf = body.CFrame
	local lv = cf.LookVector
	st.h = math.atan2(lv.X, lv.Z)
	st.x, st.y, st.z = cf.X / S, cf.Y / S, cf.Z / S
	st.vx, st.vz, st.vy = 0, 0, 0
	rp = RaycastParams.new()
	rp.FilterType = Enum.RaycastFilterType.Exclude
	rp.FilterDescendantsInstances = { m, plr.Character }
	Workspace.CurrentCamera.CameraSubject = body
	local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if hum then hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, false) end
end
Workspace.ChildAdded:Connect(function(c)
	if c.Name == "Car_" .. plr.UserId then attach(c) end
end)
local existing = Workspace:FindFirstChild("Car_" .. plr.UserId)
if existing then task.spawn(attach, existing) end

local function clamp(v, a, b) return v < a and a or v > b and b or v end
local H0 = 0.55 -- body centre above the ground (m)

RunService.RenderStepped:Connect(function(dtr)
	if toastT > 0 then
		toastT -= dtr
		if toastT <= 0 then toastL.Text = "" end
	end
	if not (car and car.Parent and body and body.Parent) then return end
	-- the driver left the seat (should not happen; jumping is off): put them back
	local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if hum and not hum.Sit and os.clock() - (st.reseat or 0) > 3 then st.reseat = os.clock(); Remotes.ResetCar:FireServer() end
	local dt = clamp(dtr, 0.004, 0.05)
	local mv = controls:GetMoveVector()
	local th = math.max(0, -mv.Z)
	local br = math.max(0, mv.Z)
	local steer = -mv.X
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local fs = st.vx * fx + st.vz * fz
	-- steering (Arcade: rate falls with speed, needs speed to turn, handbrake turns sharper)
	st.h += steer * 1.8 * spec.hd / (1 + math.abs(fs) / 18) * clamp(fs / 4, -1, 1) * (hb and 1.5 or 1) * (st.gnd and 1 or 0.2) * dt
	fx, fz = math.sin(st.h), math.cos(st.h)
	local rx, rz = -fz, fx
	fs = st.vx * fx + st.vz * fz
	local ls = st.vx * rx + st.vz * rz
	if st.gnd then
		if th > 0 then
			local ac = spec.a0 * th * (1 - math.pow(math.max(fs, 0) / (spec.vm * 1.05), 2.5))
			if fs < 0 then ac = math.min(ac * 2, spec.bk) end
			fs += ac * dt
		end
		if br > 0 then
			if fs > 0.5 then fs = math.max(0, fs - spec.bk * dt * br) else fs = math.max(-10, fs - 3.5 * dt * br) end
		end
		if hb then fs *= 1 - 0.8 * dt end
		if math.abs(fs) > 0.5 then fs -= math.sign(fs) * 0.5 * dt end
		fs -= fs * 0.012 * dt
		ls *= math.exp(-(hb and 1.1 or ((th > 0 and steer ~= 0 and fs > 15) and 2.4 or 6.5 * spec.hd)) * dt)
	end
	st.vx, st.vz = fx * fs + rx * ls, fz * fs + rz * ls
	-- walls: a ray along the motion; on a hit the car stops against the wall and bounces back a little
	local sp = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	if sp > 0.05 then
		local dir = Vector3.new(st.vx, 0, st.vz) / sp
		local o = Vector3.new(st.x, st.y + 0.3, st.z) * S
		local hit = Workspace:Raycast(o, dir * (sp * dt + 2.4) * S, rp)
		if hit and hit.Normal.Y < 0.6 then
			local n = Vector3.new(hit.Normal.X, 0, hit.Normal.Z).Unit
			local vn = st.vx * n.X + st.vz * n.Z
			if vn < 0 then
				st.vx -= 1.3 * vn * n.X
				st.vz -= 1.3 * vn * n.Z
				if -vn > 6 then toast("Crash! " .. math.floor(-vn * 3.6) .. " km/h") end
				drift.pts = 0
			end
		end
	end
	st.x += st.vx * dt
	st.z += st.vz * dt
	-- ground: ray down from above the car
	local g = Workspace:Raycast(Vector3.new(st.x, st.y + 3, st.z) * S, Vector3.new(0, -40 * S, 0), rp)
	local gy = g and g.Position.Y / S
	if gy and st.y - H0 <= gy + 0.35 and st.vy <= 0.5 then
		st.y = gy + H0
		st.vy = 0
		st.gnd = true
	else
		st.gnd = false
		st.vy -= 9.81 * dt
		st.y += st.vy * dt
		if not gy and st.y < -500 then Remotes.ResetCar:FireServer(); st.y = 0 end
	end
	-- drift points (same formula as the web game, no rarity multiplier)
	local sa = math.abs(math.atan2(ls, math.abs(fs) + 0.5))
	if st.gnd and sp > 8 and sa > 0.22 then
		drift.t += dt
		drift.off = 0
		drift.pts += sa * sp * 8 * dt * (1 + math.min(4, drift.t / 3))
		driftL.Text = "DRIFT  " .. math.floor(drift.pts)
	elseif drift.pts > 0 then
		drift.off += dt
		if drift.off > 0.7 then
			if drift.pts > 40 then
				Remotes.BankDrift:FireServer(drift.pts)
				toast("Drift +" .. math.floor(drift.pts))
			end
			drift.pts = 0
			drift.t = 0
			driftL.Text = ""
		end
	end
	-- place the car (tilted to the ground normal), cancel gravity, report the velocity for other players' interpolation
	local up = (g and st.gnd) and g.Normal or Vector3.yAxis
	local f = Vector3.new(math.sin(st.h), 0, math.cos(st.h))
	local right = f:Cross(up).Unit
	local fwd = up:Cross(right).Unit
	local pos = Vector3.new(st.x, st.y, st.z) * S
	car:PivotTo(CFrame.fromMatrix(pos, right, up, -fwd))
	lift.Force = Vector3.new(0, body.AssemblyMass * Workspace.Gravity, 0)
	body.AssemblyLinearVelocity = Vector3.new(st.vx, 0, st.vz) * S
	body.AssemblyAngularVelocity = Vector3.zero
	spdL.Text = tostring(math.floor(sp * 3.6 + 0.5))
end)
