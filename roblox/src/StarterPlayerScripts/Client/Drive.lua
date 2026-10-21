-- Irbid Drive (Roblox) - the player's car on this device: driving model, ground and wall tests, bumping into AI cars and other
-- players, drift points, reset, camera, brake lights and the optional engine sound.
-- Driving model = the web game's Arcade handling (10_laws_player.js updP): world velocity, heading turned by steering, the velocity split into
-- forward / sideways parts, the sideways part decays (slowly with the handbrake -> drift). Drift points use the web formula, with the car's
-- rarity multiplier and the Extra Drift Points upgrade. Units: metres and seconds; drawn at Config.SCALE studs per metre.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Drive = {}
local S = Config.SCALE
local plr = Players.LocalPlayer
local st, spec, inp = State.st, State.spec, State.input
local drift = { pts = 0, t = 0, off = 0 }
Drive.drift = drift

local map = Workspace:WaitForChild("IrbidMap")
-- ground = roads + terrain only; walls = buildings only (so road joints and terrain steps never stop the car)
local groundP = RaycastParams.new()
groundP.FilterType = Enum.RaycastFilterType.Include
-- (ground parts exist only when the place has no usable Terrain)
local groundList = { map:WaitForChild("Roads"), map:WaitForChild("Ground") }
local terrain = Workspace:FindFirstChildOfClass("Terrain")
if terrain then groundList[#groundList + 1] = terrain end
groundP.FilterDescendantsInstances = groundList
local wallP = RaycastParams.new()
wallP.FilterType = Enum.RaycastFilterType.Include
wallP.FilterDescendantsInstances = { map:WaitForChild("Buildings") }

local function clamp(v, a, b)
	return v < a and a or v > b and b or v
end

-- ground height (m) under (x, z), looking down from yTop (m) at most 400 m; nil when there is none
function Drive.groundY(x, z, yTop)
	local g = Workspace:Raycast(Vector3.new(x, yTop, z) * S, Vector3.new(0, -400 * S, 0), groundP)
	return g and g.Position.Y / S, g
end

-- ---- car stats: the car's base numbers (Config.CARS) with this player's upgrades ----
function Drive.applySpec()
	local car = State.car
	local ci = (car and car:GetAttribute("carIndex")) or plr:GetAttribute("CurCar") or 1
	local lv, i = { 0, 0, 0, 0 }, 0
	for n in string.gmatch(plr:GetAttribute("Tune") or "", "%d+") do
		i += 1
		lv[i] = tonumber(n)
	end
	local t = Config.tuned(ci, lv)
	local c = Config.CARS[ci] or Config.CARS[1]
	spec.vm, spec.a0, spec.hd, spec.dr, spec.bk, spec.rm = t.vm, t.a0, t.hd, t.dr, t.bk, t.rm
	spec.tier, spec.name, spec.L, spec.W, spec.H = c.tier, c.name, c.L, c.W, c.H
	Hud.car.Text = c.name .. " · " .. Config.RARITY[c.tier + 1].name .. " ×" .. string.format("%.1f", t.rm)
end
plr:GetAttributeChangedSignal("Tune"):Connect(Drive.applySpec)

-- ---- attach to a newly built car ----
local lights, sound = {}, nil
local function attach(m)
	State.car = m
	local body = m:WaitForChild("Body")
	State.body = body
	Drive.applySpec()
	local cf = body.CFrame
	local lv = cf.LookVector
	st.h = math.atan2(lv.X, lv.Z)
	st.x, st.y, st.z = cf.X / S, cf.Y / S, cf.Z / S
	st.vx, st.vz, st.vy = 0, 0, 0
	lights = {}
	for _, p in ipairs(m:GetChildren()) do
		if p.Name == "Taillight" then lights[#lights + 1] = p end
	end
	sound = nil
	if Config.ENGINE_SOUND_ID ~= 0 then
		sound = Instance.new("Sound")
		sound.SoundId = "rbxassetid://" .. Config.ENGINE_SOUND_ID
		sound.Looped = true
		sound.Volume = 0.45
		sound.Parent = body
		sound:Play()
	end
	local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if hum then hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, false) end
	-- the server keeps the car anchored until now
	Remotes.CarReady:FireServer(m)
end
Workspace.ChildAdded:Connect(function(c)
	if c.Name == "Car_" .. plr.UserId then attach(c) end
end)
local existing = Workspace:FindFirstChild("Car_" .. plr.UserId)
if existing then task.spawn(attach, existing) end

-- ---- teleport the car (races, reset): position in metres on the ground, heading h, stopped ----
function Drive.place(x, z, h)
	-- the map's ground lies between about -80 m and +80 m: look down from 300 m, so this works from anywhere (also from under the map)
	local gy = Drive.groundY(x, z, 300)
	st.x, st.z, st.h = x, z, h
	st.y = (gy or st.y) + spec.H * 0.34
	st.vx, st.vz, st.vy = 0, 0, 0
	drift.pts, drift.t = 0, 0
end

-- F / Reset: back onto the nearest road (right-hand lane, facing the way the car was going); far from any road -> the start
function Drive.reset()
	local near = State.road and Road.nearest(State.road, st.x, st.z, 400)
	if not near then
		Remotes.ResetCar:FireServer()
		return
	end
	local d = Road.dirFor(near, math.sin(st.h), math.cos(st.h))
	local tx, tz = near.tx * d, near.tz * d
	local off = Road.lane(near.e)
	Drive.place(near.x - tz * off, near.z + tx * off, math.atan2(tx, tz))
end

-- ---- bumping: the player's car as two circles (front and rear axle, r 1 m) against each AI car's box ----
local function bump(cx, cz, ox, oz, oh, hl, hw, ovx, ovz)
	local fx, fz = math.sin(oh), math.cos(oh)
	local rx, rz = -fz, fx
	local dx, dz = cx - ox, cz - oz
	local lon, lat = dx * fx + dz * fz, dx * rx + dz * rz
	local pl, pw = hl + 1 - math.abs(lon), hw + 1 - math.abs(lat)
	if pl <= 0 or pw <= 0 then return false end
	local nx, nz, pen
	if pw < pl then
		local sg = lat >= 0 and 1 or -1
		nx, nz, pen = rx * sg, rz * sg, pw
	else
		local sg = lon >= 0 and 1 or -1
		nx, nz, pen = fx * sg, fz * sg, pl
	end
	st.x += nx * pen
	st.z += nz * pen
	local rv = (st.vx - ovx) * nx + (st.vz - ovz) * nz
	if rv < 0 then
		st.vx -= 1.3 * rv * nx
		st.vz -= 1.3 * rv * nz
		if -rv > 6 then Hud.toast("Crash! " .. math.floor(-rv * 3.6) .. " km/h", 2) end
		if drift.pts > 0 then
			drift.pts, drift.t = 0, 0
			Hud.drift.Text = ""
			Hud.toast("Drift lost", 1.5)
		end
	end
	return true
end

local others, othersT = {}, 0
local function collide(dt)
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local c1x, c1z, c2x, c2z = st.x + fx * 1.2, st.z + fz * 1.2, st.x - fx * 1.2, st.z - fz * 1.2
	for _, a in ipairs(State.ai) do
		local dx, dz = a.x - st.x, a.z - st.z
		if dx * dx + dz * dz < 64 then
			local avx, avz = math.sin(a.h) * a.v, math.cos(a.h) * a.v
			local hit = bump(c1x, c1z, a.x, a.z, a.h, a.L / 2, a.W / 2, avx, avz)
			hit = bump(c2x, c2z, a.x, a.z, a.h, a.L / 2, a.W / 2, avx, avz) or hit
			if hit then a.hit = a.cop and 0.6 or 2.5 end
		end
	end
	-- other players' cars (moved by their own devices): the player only bounces off them
	othersT -= dt
	if othersT <= 0 then
		othersT = 1
		table.clear(others)
		for _, m in ipairs(Workspace:GetChildren()) do
			if m:IsA("Model") and string.sub(m.Name, 1, 4) == "Car_" and m ~= State.car and m.PrimaryPart then
				others[#others + 1] = m.PrimaryPart
			end
		end
	end
	for _, b in ipairs(others) do
		if b.Parent then
			local p = b.Position / S
			local dx, dz = p.X - st.x, p.Z - st.z
			if dx * dx + dz * dz < 64 then
				local lv = b.CFrame.LookVector
				local v = b.AssemblyLinearVelocity / S
				bump(c1x, c1z, p.X, p.Z, math.atan2(lv.X, lv.Z), b.Size.Z / S / 2, b.Size.X / S / 2, v.X, v.Z)
				bump(c2x, c2z, p.X, p.Z, math.atan2(lv.X, lv.Z), b.Size.Z / S / 2, b.Size.X / S / 2, v.X, v.Z)
			end
		end
	end
end

-- ---- one frame of driving ----
function Drive.step(dtr)
	local car, body = State.car, State.body
	if not (car and car.Parent and body and body.Parent) then return end
	-- the driver left the seat (should not happen; jumping is off): ask the server to seat them again
	local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if hum and not hum.Sit and os.clock() - (st.reseat or 0) > 3 then
		st.reseat = os.clock()
		Remotes.ResetCar:FireServer()
	end
	local dt = clamp(dtr, 0.004, 0.05)
	local th, br, steer, hb = inp.th, inp.br, inp.steer, inp.hb
	if State.ui then th, br, steer, hb = 0, 0.6, 0, false end
	if State.frozen then
		th, br, steer, hb = 0, 1, 0, false
		st.vx, st.vz = 0, 0
	end
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
			if fs > 0.5 then
				fs = math.max(0, fs - spec.bk * dt * br)
			else
				fs = math.max(-10, fs - 3.5 * dt * br)
			end
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
		local hit = Workspace:Raycast(o, dir * (sp * dt + 2.4) * S, wallP)
		if hit and hit.Normal.Y < 0.6 then
			local n = Vector3.new(hit.Normal.X, 0, hit.Normal.Z).Unit
			local vn = st.vx * n.X + st.vz * n.Z
			if vn < 0 then
				st.vx -= 1.3 * vn * n.X
				st.vz -= 1.3 * vn * n.Z
				if -vn > 6 then Hud.toast("Crash! " .. math.floor(-vn * 3.6) .. " km/h", 2) end
				if drift.pts > 0 then
					drift.pts, drift.t = 0, 0
					Hud.drift.Text = ""
					Hud.toast("Drift lost", 1.5)
				end
			end
		end
	end
	st.x += st.vx * dt
	st.z += st.vz * dt
	collide(dt)
	-- ground: ray down from 3 m above the car, 40 m long (it climbs kerbs and terrain steps up to 3 m)
	local H0 = spec.H * 0.34
	local g = Workspace:Raycast(Vector3.new(st.x, st.y + 3, st.z) * S, Vector3.new(0, -40 * S, 0), groundP)
	local gy = g and g.Position.Y / S
	if gy and st.y - H0 <= gy + 0.35 and st.vy <= 0.5 then
		st.y = gy + H0
		st.vy = 0
		st.gnd = true
	else
		st.gnd = false
		st.vy -= 9.81 * dt
		st.y += st.vy * dt
		-- fell off the map (nothing below, well under the lowest ground): back onto a road
		if not gy and st.y < -150 then
			Drive.reset()
		end
	end
	-- drift points (the web game's formula: angle x speed x combo, x Extra Drift Points upgrade, x rarity)
	local sa = math.abs(math.atan2(ls, math.abs(fs) + 0.5))
	if st.gnd and sp > 8 and sa > 0.22 - 0.012 * spec.dr and not State.frozen then
		drift.t += dt
		drift.off = 0
		local combo = 1 + math.min(4, drift.t / 3)
		drift.pts += sa * sp * 8 * dt * combo * (1 + 0.2 * spec.dr) * spec.rm
		Hud.drift.Text = "DRIFT  " .. Hud.fmt(drift.pts) .. "  ×" .. string.format("%.1f", combo)
	elseif drift.pts > 0 then
		drift.off += dt
		if drift.off > 0.7 then
			if drift.pts > 40 then
				local n = math.floor(drift.pts + 0.5)
				Remotes.BankDrift:FireServer(n)
				Hud.toast("Drift +" .. Hud.fmt(n) .. (spec.rm > 1 and ("  (" .. Config.RARITY[spec.tier + 1].name .. " ×" .. string.format("%.1f", spec.rm) .. ")") or ""))
			end
			drift.pts, drift.t = 0, 0
			Hud.drift.Text = ""
		end
	end
	st.sp, st.fs = sp, fs
	-- place the car (tilted to the ground normal), cancel gravity, report the velocity for other players' interpolation
	local up = (g and st.gnd and g.Normal.Y > 0.5) and g.Normal.Unit or Vector3.yAxis
	local f = Vector3.new(math.sin(st.h), 0, math.cos(st.h))
	local right = f:Cross(up).Unit
	local fwd = up:Cross(right).Unit
	car:PivotTo(CFrame.fromMatrix(Vector3.new(st.x, st.y, st.z) * S, right, up, -fwd))
	local lift = body:FindFirstChild("Lift")
	if lift then lift.Force = Vector3.new(0, body.AssemblyMass * Workspace.Gravity, 0) end
	body.AssemblyLinearVelocity = Vector3.new(st.vx, 0, st.vz) * S
	body.AssemblyAngularVelocity = Vector3.zero
	-- brake lights (seen on this device) and engine pitch
	local braking = br > 0 and fs > 0.5
	for _, l in ipairs(lights) do
		l.Color = braking and Color3.fromRGB(255, 40, 40) or Color3.fromRGB(140, 10, 10)
	end
	if sound then sound.PlaybackSpeed = 0.7 + 1.1 * math.min(1, math.abs(fs) / spec.vm) + 0.25 * th end
	Hud.speed.Text = tostring(math.floor(sp * 3.6 + 0.5))
end

-- ---- camera: 0 chase, 1 far chase, 2 Roblox's own orbit camera (mouse / touch drag) ----
local camMode, camPos = 0, nil
function Drive.cycleCam()
	camMode = (camMode + 1) % 3
	local cam = Workspace.CurrentCamera
	if camMode == 2 then
		cam.CameraType = Enum.CameraType.Custom
		if State.body then cam.CameraSubject = State.body end
	end
	camPos = nil
	Hud.toast(({ "Camera: chase", "Camera: far chase", "Camera: free (drag to look around)" })[camMode + 1], 1.5)
end
function Drive.camera(dt)
	if camMode == 2 or not (State.car and State.body) then return end
	local cam = Workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local back, height = camMode == 0 and 7.5 or 13, camMode == 0 and 2.7 or 4.5
	-- look along the direction of travel when moving fast enough (drifts stay readable), else along the car
	local hx, hz = math.sin(st.h), math.cos(st.h)
	if st.sp > 4 and st.fs > 0 then
		local mx, mz = st.vx / st.sp, st.vz / st.sp
		hx, hz = hx * 0.6 + mx * 0.4, hz * 0.6 + mz * 0.4
	end
	local p = Vector3.new(st.x, st.y, st.z)
	local want = (p - Vector3.new(hx, 0, hz) * back + Vector3.new(0, height, 0)) * S
	camPos = camPos and camPos:Lerp(want, 1 - math.exp(-dt * 7)) or want
	cam.CFrame = CFrame.lookAt(camPos, (p + Vector3.new(hx, 0, hz) * 4 + Vector3.new(0, 1, 0)) * S)
end

return Drive
