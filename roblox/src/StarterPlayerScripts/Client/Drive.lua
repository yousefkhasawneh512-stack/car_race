-- Irbid Drive (Roblox) - the player's car on this device: attaching to it, the driving model, placing it, reset.
-- The driving model is the web game's updP (10_laws_player.js) in its two handling modes (key H, as in the web game), both line for line
-- in Modules/CarPhysics (checked against the web build by tests/physics_equiv.js):
--   Arcade (default): steering (rate falls with speed, needs speed, sharper with the handbrake, weak in the air); grip from the surface
--     under the car (paved road / drift zone 1, unpaved track .75, built-up ground .9, open ground .65) scaling acceleration and braking;
--     gravity along the slope; extra drag on poor surfaces; handbrake; rolling and air drag; the sideways velocity decaying.
--   Realistic: engine torque curve, automatic or manual gearbox, traction limit with load transfer, aero drag and rolling resistance,
--     engine braking, a two-axle slip-angle tyre model, ABS / traction / stability control, optional tyre temperature and brake fade,
--     a sprung body; frames longer than 1/60 s are split into equal steps (the web game's updPStep).
-- Height: the web game's groundH (terrain + ramps): the car follows the ground, and leaves it where the ground drops away faster
-- (ramps, crests). Units: metres, seconds.
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
-- the physics input and environment (with the Realistic state: gearbox, tyres, assists...), reused every frame (no allocation per frame)
local pin = { th = 0, br = 0, steer = 0, hb = false, an = false }
local penv = CarPhysics.newState()
penv.sfc, penv.frozen, penv.TH, penv.mode = 1, false, Ground.TH, 0
Drive.phys = penv
State.phys = penv
Drive.drift = DriftScore.state
Drive.applySpec = CarSpec.apply
Drive.cycleCam = Camera.cycle
Drive.camera = Camera.step
st.pgh, st.pitch, st.bp, st.br, st.h0, st.al = 0, 0, 0, 0, 0, 0

local clamp = CarPhysics.clamp
-- the web game's wrap: an angle into (-pi, pi]
local function wrap(a)
	return math.atan2(math.sin(a), math.cos(a))
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

-- paved surface under the car (the sounds: squeal on tarmac, gravel crunch off it)
function Drive.paved()
	return surfK() >= 1
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

-- ---- one physics step (the web game's updP): the car model, walls, moving, ground, body, other cars, laws ----
local function sim(dt, frozen, thA, brA, steer, hb)
	pin.th, pin.br, pin.steer, pin.hb, pin.an = thA, brA, steer, hb, inp.an == true
	penv.frozen = frozen
	penv.sfc = surfK()
	-- damage (CarDamage): the effects on driving and the burnout test before the step, the tyres after it (the web game's order)
	local dmg = Drive.damage
	if dmg then dmg.pre(penv) end
	local fs, ls = CarPhysics.step(st, spec, pin, penv, dt)
	if dmg then dmg.post(dt, thA, brA, hb, fs, ls, frozen, penv.sfc) end
	local fx, fz = math.sin(st.h), math.cos(st.h)
	DriftScore.step(dt, math.abs(math.atan2(ls, math.abs(fs) + 0.5)), math.sqrt(st.vx * st.vx + st.vz * st.vz), st.gnd)
	-- move; buildings stop the car (the web game's static colliders, colB): an impact above 1.8 m/s is reported first (damage, sound),
	-- then the car bounces off with the web game's factor 1.4 (restitution 0.4); the drift is lost
	local prevX, prevZ = st.x, st.z
	local sp0 = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	if sp0 > 0.05 then
		local hit = Ground.wall(st.x, st.y + 0.3, st.z, st.vx / sp0, st.vz / sp0, sp0 * dt + 2.4)
		if hit then
			local n = Vector3.new(hit.Normal.X, 0, hit.Normal.Z).Unit
			local vn = st.vx * n.X + st.vz * n.Z
			if vn < 0 then
				if -vn > 1.8 and Drive.onWall then Drive.onWall(-vn, n.X, n.Z, hit.Instance) end
				st.vx -= 1.4 * vn * n.X
				st.vz -= 1.4 * vn * n.Z
				DriftScore.lose()
			end
		end
	end
	st.x += st.vx * dt
	st.z += st.vz * dt
	SpeedBumps.step(prevX, prevZ, dt)
	-- height: follow the ground; where it falls away faster than the car (ramp ends, crests) the car flies
	local gh = Ground.groundH(st.x, st.z)
	local vy0 = st.vy
	st.vy -= 9.81 * dt
	st.y += st.vy * dt
	if st.y <= gh then
		-- touchdown: the vertical speed of the last airborne step (the web game's registerLanding)
		if not st.gnd and Drive.onLand then Drive.onLand(vy0) end
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
	-- Realistic: the sprung body (pitch / roll / heave springs)
	if penv.mode == 1 then CarPhysics.body(st, spec, penv, dt, frozen, fs) end
	-- other cars (the web game's circles); then the laws
	Bump.step(dt)
	local sp = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	st.sp, st.fs = sp, fs
	if not frozen then Laws.step(sp * 3.6) end
	return fs
end

-- the Realistic line under the speed (the web game's ptHud): gear, rpm, wheelspin, locked wheels, assists acting, temperatures
local function realLine()
	if penv.mode ~= 1 or not spec.pt then return "" end
	local P, X = penv.pts, penv.simx
	local s = (spec.pt.ev and "EV" or ((P.man ~= 0 and "M" or "G") .. P.gear)) .. " · " .. tostring(math.floor(P.rpm / 100 + 0.5) * 100) .. " rpm"
	if P.spin > 0.25 then s ..= " · wheelspin" end
	if P.flock ~= 0 then s ..= " · LOCKED" end
	if P.absA ~= 0 then s ..= " · ABS" end
	if P.tcA ~= 0 then s ..= " · TC" end
	if P.escA ~= 0 then s ..= " · ESC" end
	if X.tt then s ..= " · tyres " .. math.floor(X.tT + 0.5) .. "°C" end
	if X.bf then s ..= " · brakes " .. math.floor(X.bT + 0.5) .. "°C" .. (X.bk < 0.97 and " FADE" or "") end
	return s
end
Drive.realLine = realLine
local hudT = 0

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
	local frozen = State.frozen
	if not (st.x == st.x and st.y == st.y and st.z == st.z and st.vx == st.vx and st.vz == st.vz and st.h == st.h) then
		Drive.place(0, 0, Meta.startHeading)
	end
	local thA, brA, steer, hb = inp.th, inp.br, inp.steer, inp.hb
	-- a menu open = no input, brakes on (the web game: ui -> brake)
	if State.ui then thA, brA, steer, hb = 0, 1, 0, false end
	local n = CarPhysics.substeps(penv.mode, dt)
	local fs = 0
	for _ = 1, n do
		fs = sim(dt / n, frozen, thA, brA, steer, hb)
	end
	-- place the car: yaw, then pitch and roll (web pitch is nose-down positive; this model faces -Z). Realistic: the sprung body's
	-- heave / pitch / roll replace the Arcade body lean (the web game's ptBody)
	local heave, bpitch, broll = SpeedBumps.visual(dt)
	local lean, roll = st.bp, st.br
	if penv.mode == 1 then
		heave += penv.pts.hz
		lean, roll = penv.pts.pz, penv.pts.rz
	end
	-- Full damage: a flat tyre, a bent driveline or bent rims shake the body (the web game's damageTick vibration, looks only)
	local dmg = Drive.damage
	if dmg and dmg.mode() == 2 and st.gnd and st.sp > 2 then
		local vib = dmg.fx.vib
		if vib > 0 then
			local a = vib * 0.011 * math.min(1, st.sp / 18)
			roll += (math.random() - 0.5) * a
			bpitch += (math.random() - 0.5) * a * 0.6
		end
	end
	local pos = Vector3.new(st.x, st.y + spec.H * 0.34 - 0.12 + heave, st.z) * S
	car:PivotTo(CFrame.new(pos) * CFrame.Angles(0, st.h + math.pi, 0) * CFrame.Angles(-(st.pitch + lean) + bpitch, 0, roll + broll))
	local lift = body:FindFirstChild("Lift")
	if lift then lift.Force = Vector3.new(0, body.AssemblyMass * Workspace.Gravity, 0) end
	body.AssemblyLinearVelocity = Vector3.new(st.vx, st.vy, st.vz) * S
	body.AssemblyAngularVelocity = Vector3.zero
	CarFx.step(brA, fs, thA)
	Hud.speed.Text = tostring(math.floor(st.sp * 3.6 + 0.5))
	hudT -= dt
	if hudT <= 0 then
		hudT = 0.1
		Hud.gear.Text = realLine()
	end
end

return Drive
