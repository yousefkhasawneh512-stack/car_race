-- Irbid Drive (Roblox) - vehicle damage on this device (the web game's 07c / 07d / 07h, rules in Modules/Damage): the mode (setting "dm",
-- key I: Off / Cosmetic / Full), the current car's record (kept on the server per car, Game/DamageStore), the hooks into the driving
-- (damage effects and burnouts before each physics step, the tyres after it), impacts with buildings and cars, hard landings, speed
-- bumps taken too fast, the engine temperature, and saving (every 8 s and after an impact). Off = nothing is recorded and the driving is
-- exactly the undamaged physics (CarPhysics.NO_DAMAGE). The looks are in CarDamageFx, the report in Diagnostics.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Damage = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Damage"))
local CarPhysics = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("CarPhysics"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Settings = require(Client:WaitForChild("Settings"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local CarDamage = { tyres = Damage.newTyreState(), changed = {} }
local st, spec = State.st, State.spec
local F = {}
for k, v in pairs(CarPhysics.NO_DAMAGE) do F[k] = v end
CarDamage.fx = F
local rec, ci = nil, nil
local T = CarDamage.tyres
local mode = 0
local lastToast, saveT, dirty, saving = -99, 0, false, false
Settings.provide("dm")

local function now()
	return Workspace.DistributedGameTime
end
local function car()
	return Config.CARS[ci or 1]
end
function CarDamage.mode()
	return mode
end
function CarDamage.record()
	return rec
end
-- something changed: the looks, the Repair button, the diagnostics
local function changed()
	for _, fn in ipairs(CarDamage.changed) do fn(rec, mode) end
end
local function toast(msg, gap)
	local t = now()
	if t - lastToast > (gap or 0.7) then
		lastToast = t
		Hud.toast(msg)
	end
end

-- the record of the car the player drives (asked from the server when the car changes)
local function load(i)
	ci = i
	local ok, r = pcall(function() return Remotes.Damage:InvokeServer("get", i) end)
	rec = Damage.clean(ok and type(r) == "table" and r or nil, Config.CARS[i])
	T.h0, T.burn, T.burnT = nil, false, 0
	changed()
end
function CarDamage.attach(i)
	if i ~= ci or not rec then task.spawn(load, i) end
end

function CarDamage.save()
	if not (rec and ci) or saving then return end
	saving, dirty = true, false
	local r, i = rec, ci
	task.spawn(function()
		pcall(function() Remotes.Damage:InvokeServer("save", i, r) end)
		saving = false
	end)
end

-- a repaired record from the server (the repair bay)
function CarDamage.setRecord(r)
	if type(r) == "table" and ci then
		rec = Damage.clean(r, car())
		changed()
	end
end

Settings.onChange(function(k, v)
	if k ~= "dm" then return end
	local was = mode
	mode = v
	if was ~= v then changed() end
end)
-- I: the next mode (the web game's toasts)
function CarDamage.cycle()
	Settings.set("dm", (mode + 1) % 3)
	Hud.toast("Vehicle damage: " .. Damage.MODE_NAMES[mode + 1] .. (mode == 2 and " — tyres, engine, suspension and brakes active" or mode == 1 and " — visual damage only" or " — disabled"))
end

-- ---- the physics hooks (Drive.sim): effects + burnout before the step, the tyres after it ----
local burnFn = function(th, thA, br, brA, hb, fs)
	return Damage.burnoutState(T, car(), mode, th, thA, br, brA, hb, fs, { gnd = st.gnd, bk = spec.bk, a0 = spec.a0 }, State.phys.sfc, F.accel)
end
local tp = { gnd = true, h = 0, al = 0, a0 = 0, vm = 0, bk = 0 }
function CarDamage.pre(env)
	if mode == 0 or not rec then
		env.dfx, env.burnout = CarPhysics.NO_DAMAGE, nil
		return
	end
	Damage.effects(rec, car(), mode, F)
	env.dfx, env.burnout = F, burnFn
end
function CarDamage.post(dt, thr, brk, hb, fs, ls, frozen, sfc)
	if mode == 0 or not rec then
		T.thr = thr
		return
	end
	tp.gnd, tp.h, tp.al, tp.a0, tp.vm, tp.bk = st.gnd, st.h, st.al, spec.a0, spec.vm, spec.bk
	local blown = Damage.tyreStep(T, rec, car(), mode, dt, thr, brk, hb, fs, ls, frozen, tp, sfc)
	if blown then
		dirty = true
		changed()
		Hud.toast("💥 Tyre " .. Damage.WHEEL_NAMES[blown] .. " failed — the car will pull and lose grip")
	end
end

-- ---- impacts ----
-- a building wall (Drive.onWall): v = closing speed along the wall normal (m/s), n from the wall to the car, the building part
function CarDamage.wall(v, nx, nz, part)
	local hw = part and part.Size.X / Config.SCALE / 2 or 6
	local hd = part and part.Size.Z / Config.SCALE / 2 or 6
	return CarDamage.impact(v, { type = "solid", hw = hw, hd = hd }, nx, nz)
end
-- a roadside object (RoadsideObjects: a collider of Modules/Objects)
function CarDamage.object(v, ob, nx, nz)
	return CarDamage.impact(v, ob, nx, nz)
end
-- another car (Bump.onImpact)
function CarDamage.vehicle(v, nx, nz)
	return CarDamage.impact(v, { type = "vehicle" }, nx, nz)
end
function CarDamage.impact(v, ob, nx, nz)
	if mode == 0 or not rec then return nil end
	local r = Damage.impact(rec, car(), mode, { v = v, ob = ob, nx = nx, nz = nz, x = st.x, z = st.z, h = st.h, vx = st.vx, vz = st.vz, t = now(), rnd = math.random })
	if not r then return nil end
	toast(r.toast)
	for _, k in ipairs(r.torn) do Hud.toast("💥 " .. Damage.DP_NAMES[k] .. " torn off") end
	CarDamage.lastImpact = r
	dirty = true
	changed()
	if CarDamage.onImpact then CarDamage.onImpact(r, v, nx, nz) end
	CarDamage.save()
	return r
end
-- a hard landing (Drive.onLand: the vertical speed just before touchdown, negative)
function CarDamage.landing(vy)
	if mode == 0 or not rec then return end
	local msg = Damage.landing(rec, car(), mode, vy, now())
	if msg then
		dirty = true
		changed()
		toast(msg, 0.8)
	end
end
-- a speed bump taken too fast (SpeedBumps.onImpact)
function CarDamage.speedBump(speed, sev, axle)
	if mode == 0 or not rec then return end
	local msg = Damage.speedBump(rec, car(), mode, speed, sev, axle)
	if msg then
		dirty = true
		changed()
		toast(msg, 0.8)
		if CarDamage.onBump then CarDamage.onBump(sev) end
	end
end

-- ---- every frame: the engine temperature (Full), smoke, saving every 8 s ----
function CarDamage.step(dt)
	if spec.ci and spec.ci ~= ci then CarDamage.attach(spec.ci) end
	-- a new model of the same car (reset, respawn): the looks again
	if State.car ~= CarDamage.model then
		CarDamage.model = State.car
		if rec then changed() end
	end
	if mode == 0 or not rec then
		CarDamage.smoking = false
		return
	end
	local e0 = rec.engine
	CarDamage.smoking = Damage.engineTick(rec, mode, T.thr, dt)
	if rec.engine ~= e0 then dirty = true end
	saveT += dt
	if saveT > 8 then
		saveT = 0
		Damage.syncAggregates(rec)
		if dirty then CarDamage.save() end
		changed()
	end
end

return CarDamage
