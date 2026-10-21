-- Irbid Drive (Roblox) - the player's car on this device: attaching to it, the driving model, placing it, reset.
-- Driving model = the web game's Arcade handling (10_laws_player.js updP): world velocity, heading turned by steering, the velocity split into
-- forward / sideways parts, the sideways part decays (slowly with the handbrake -> drift). Units: metres and seconds; drawn at
-- Config.SCALE studs per metre. Helpers: Ground (ray tests), Bump (cars), DriftScore, CarSpec (stats + upgrades), CarFx, Camera.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Ground = require(Client:WaitForChild("Ground"))
local CarSpec = require(Client:WaitForChild("CarSpec"))
local DriftScore = require(Client:WaitForChild("DriftScore"))
local Bump = require(Client:WaitForChild("Bump"))
local CarFx = require(Client:WaitForChild("CarFx"))
local Camera = require(Client:WaitForChild("Camera"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Drive = {}
local S = Config.SCALE
local plr = Players.LocalPlayer
local st, spec, inp = State.st, State.spec, State.input
Drive.drift = DriftScore.state
Drive.applySpec = CarSpec.apply
Drive.cycleCam = Camera.cycle
Drive.camera = Camera.step

local function clamp(v, a, b)
	return v < a and a or v > b and b or v
end

-- ground height (m) under (x, z), looking down from yTop (m) at most 400 m; nil when there is none
function Drive.groundY(x, z, yTop)
	return Ground.below(x, z, yTop, 400)
end

-- ---- attach to a newly built car ----
local function attach(m)
	State.car = m
	local body = m:WaitForChild("Body")
	State.body = body
	CarSpec.apply()
	local cf = body.CFrame
	local lv = cf.LookVector
	st.h = math.atan2(lv.X, lv.Z)
	st.x, st.y, st.z = cf.X / S, cf.Y / S, cf.Z / S
	st.vx, st.vz, st.vy = 0, 0, 0
	CarFx.attach(m, body)
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
	DriftScore.clear()
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
		local hit = Ground.wall(st.x, st.y + 0.3, st.z, st.vx / sp, st.vz / sp, sp * dt + 2.4)
		if hit then
			local n = Vector3.new(hit.Normal.X, 0, hit.Normal.Z).Unit
			local vn = st.vx * n.X + st.vz * n.Z
			if vn < 0 then
				st.vx -= 1.3 * vn * n.X
				st.vz -= 1.3 * vn * n.Z
				if -vn > 6 then Hud.toast("Crash! " .. math.floor(-vn * 3.6) .. " km/h", 2) end
				DriftScore.lose()
			end
		end
	end
	st.x += st.vx * dt
	st.z += st.vz * dt
	Bump.step(dt)
	-- ground: ray down from 3 m above the car, 40 m long (it climbs kerbs and terrain steps up to 3 m)
	local H0 = spec.H * 0.34
	local gy, g = Ground.below(st.x, st.z, st.y + 3, 40)
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
	DriftScore.step(dt, math.abs(math.atan2(ls, math.abs(fs) + 0.5)), sp, st.gnd)
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
	CarFx.step(br, fs, th)
	Hud.speed.Text = tostring(math.floor(sp * 3.6 + 0.5))
end

return Drive
