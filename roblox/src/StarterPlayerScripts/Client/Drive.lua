-- Irbid Drive (Roblox) - the player's car on this device: attaching to it, the driving model, placing it, reset.
-- The driving model is the web game's Arcade updP (10_laws_player.js), line for line: steering (rate falls with speed, needs speed, sharper
-- with the handbrake, weak in the air); grip from the surface under the car (paved road / drift zone 1, unpaved track .75, built-up
-- ground .9, open ground .65) scaling acceleration and braking; gravity along the slope; extra drag on poor surfaces; handbrake;
-- rolling and air drag; the sideways velocity decaying (slowly with the handbrake -> drift). Height: the web game's groundH (terrain
-- + ramps): the car follows the ground, and leaves it where the ground drops away faster (ramps, crests). Units: metres, seconds.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local CarPhysics = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("CarPhysics"))
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Ground = require(Client:WaitForChild("Ground"))
local CarSpec = require(Client:WaitForChild("CarSpec"))
local DriftScore = require(Client:WaitForChild("DriftScore"))
local Bump = require(Client:WaitForChild("Bump"))
local CarFx = require(Client:WaitForChild("CarFx"))
local Camera = require(Client:WaitForChild("Camera"))
local SpeedBumps = require(Client:WaitForChild("SpeedBumps"))
local Laws = require(Client:WaitForChild("Laws"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Drive = {}
local S = Config.SCALE
local plr = Players.LocalPlayer
local st, spec, inp = State.st, State.spec, State.input
-- the physics input and environment, reused every frame (no allocation per frame)
local pin, penv = { th = 0, br = 0, steer = 0, hb = false }, { sfc = 1, frozen = false, TH = Ground.TH }
Drive.drift = DriftScore.state
Drive.applySpec = CarSpec.apply
Drive.cycleCam = Camera.cycle
Drive.camera = Camera.step
st.pgh, st.pitch, st.bp, st.br, st.h0, st.al = 0, 0, 0, 0, 0, 0

local clamp = CarPhysics.clamp
local function wrap(a)
	return (a + math.pi) % (2 * math.pi) - math.pi
end

-- the visible ground (roads, terrain) under (x, z), looking down from yTop at most 400 m
function Drive.groundY(x, z, yTop)
	return Ground.below(x, z, yTop, 400)
end

-- the web game's surface grip (surfK)
local function surfK()
	if State.inDrift then return 1 end
	local r = State.ri
	if r and r.d <= r.e.w / 2 + 0.3 then return r.e.track and 0.75 or 1 end
	return Ground.urban(st.x, st.z) and 0.9 or 0.65
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
	st.x, st.z = cf.X / S, cf.Z / S
	st.y = Ground.groundH(st.x, st.z)
	st.pgh = st.y
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

-- ---- the web game's warp(): put the car at (x, z), heading h, stopped, on the ground ----
function Drive.place(x, z, h)
	st.x, st.z, st.h = x, z, h
	st.vx, st.vz, st.vy = 0, 0, 0
	st.y = Ground.groundH(x, z)
	st.pgh = st.y
	DriftScore.clear()
end

-- F / Reset: back to the start on Baghdad Street (as in the web game)
function Drive.reset()
	Drive.place(0, 0, Meta.startHeading)
end

-- onto the nearest road (right-hand lane, facing the way the car was going); used when a car is stuck far from the start
function Drive.toRoad()
	local near = State.road and Road.nearest(State.road, st.x, st.z, 400)
	if not near then
		Drive.reset()
		return
	end
	local d = Road.dirFor(near, math.sin(st.h), math.cos(st.h))
	local tx, tz = near.tx * d, near.tz * d
	local off = Road.lane(near.e)
	Drive.place(near.x - tz * off, near.z + tx * off, math.atan2(tx, tz))
end

-- ---- one frame of driving (the web game's Arcade updP) ----
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
	local frozen = State.frozen
	if not (st.x == st.x and st.y == st.y and st.z == st.z and st.vx == st.vx and st.vz == st.vz and st.h == st.h) then
		Drive.place(0, 0, Meta.startHeading)
	end
	local thA, brA, steer, hb = inp.th, inp.br, inp.steer, inp.hb
	-- a menu open = no input, brakes on (the web game: ui -> brake)
	if State.ui then thA, brA, steer, hb = 0, 1, 0, false end
	pin.th, pin.br, pin.steer, pin.hb = thA, brA, steer, hb
	penv.frozen = frozen
	penv.sfc = surfK()
	local fs, ls = CarPhysics.step(st, spec, pin, penv, dt)
	local fx, fz = math.sin(st.h), math.cos(st.h)
	DriftScore.step(dt, math.abs(math.atan2(ls, math.abs(fs) + 0.5)), math.sqrt(st.vx * st.vx + st.vz * st.vz), st.gnd)
	-- move; buildings stop the car (the web game's static colliders): it stops against the wall and bounces back a little, the drift is lost
	local prevX, prevZ = st.x, st.z
	local sp0 = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	if sp0 > 0.05 then
		local hit = Ground.wall(st.x, st.y + 0.3, st.z, st.vx / sp0, st.vz / sp0, sp0 * dt + 2.4)
		if hit then
			local n = Vector3.new(hit.Normal.X, 0, hit.Normal.Z).Unit
			local vn = st.vx * n.X + st.vz * n.Z
			if vn < 0 then
				st.vx -= 1.3 * vn * n.X
				st.vz -= 1.3 * vn * n.Z
				DriftScore.lose()
			end
		end
	end
	st.x += st.vx * dt
	st.z += st.vz * dt
	SpeedBumps.step(prevX, prevZ, dt)
	-- height: follow the ground; where it falls away faster than the car (ramp ends, crests) the car flies
	local gh = Ground.groundH(st.x, st.z)
	st.vy -= 9.81 * dt
	st.y += st.vy * dt
	if st.y <= gh then
		st.y = gh
		st.vy = (gh - st.pgh) / dt
		st.gnd = true
	else
		st.gnd = false
	end
	st.pgh = gh
	-- body: pitch with the slope (or the flight path), and a little pitch / roll from acceleration and cornering
	local sl = (Ground.groundH(st.x + fx * 2, st.z + fz * 2) - Ground.groundH(st.x - fx * 2, st.z - fz * 2)) / 4
	local pt = st.gnd and -math.atan(sl) or -math.atan2(st.vy, math.max(fs, 5)) * 0.7
	st.pitch += (pt - st.pitch) * math.min(1, dt * 8)
	local yr = wrap(st.h - st.h0) / dt
	st.h0 = st.h
	local al = (st.gnd and not frozen) and clamp(st.al, -12, 8) or 0
	local ay = (st.gnd and not frozen) and clamp(fs * yr, -12, 12) or 0
	st.bp += (-al * 0.0022 - st.bp) * math.min(1, dt * 6)
	st.br += (ay * 0.0065 - st.br) * math.min(1, dt * 6)
	-- other cars (the web game's circles); then the laws
	Bump.step(dt)
	local sp = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	st.sp, st.fs = sp, fs
	if not frozen then Laws.step(sp * 3.6) end
	-- place the car: yaw, then pitch and roll (web pitch is nose-down positive; this model faces -Z)
	local heave, bpitch, broll = SpeedBumps.visual(dt)
	local pos = Vector3.new(st.x, st.y + spec.H * 0.34 - 0.12 + heave, st.z) * S
	car:PivotTo(CFrame.new(pos) * CFrame.Angles(0, st.h + math.pi, 0) * CFrame.Angles(-(st.pitch + st.bp) + bpitch, 0, st.br + broll))
	local lift = body:FindFirstChild("Lift")
	if lift then lift.Force = Vector3.new(0, body.AssemblyMass * Workspace.Gravity, 0) end
	body.AssemblyLinearVelocity = Vector3.new(st.vx, st.vy, st.vz) * S
	body.AssemblyAngularVelocity = Vector3.zero
	CarFx.step(brA, fs, thA)
	Hud.speed.Text = tostring(math.floor(sp * 3.6 + 0.5))
end

return Drive
