-- Irbid Drive (Roblox) - the player's car physics: the web game's updP (10_laws_player.js) and its Realistic handling (07g_drive.js),
-- line for line, as a PURE module (no Roblox services, only math), so tests/physics_equiv.js can run it next to the web build and compare
-- every frame. Drive.lua feeds it the input and the surface grip and does the moving, the ground height, the walls and the visuals.
--   st:   x, z, h (heading, forward = (sin h, cos h)), vx, vz (m/s), gnd (wheels on the ground), al (forward acceleration of the last step)
--   spec: vm (top speed m/s), a0 (acceleration m/s²), bk (brakes m/s²), hd (handling) [the web game's applyTune values]; ci (car index)
--         and pt (the car's Realistic data, the web game's ptSpec + ptGeom, exported by tools/make_roblox.js)
--   inp:  th, br (0..1), steer (-1..1, + = left), hb (handbrake), an (steering from an analog axis: the web game's wheel path)
--   env:  sfc (surface grip), TH (terrain height function (x, z) -> m), frozen (race countdown), mode (0 Arcade / 1 Realistic),
--         dfx (damage effects, 1 = none), and the Realistic state tables from CarPhysics.newState (pts, tslip, simx, assist, wx)
-- Realistic numbers are the web game's GAMEPLAY ESTIMATES (solved from each car's top speed and 0-100 time), not manufacturer data.
local CarPhysics = {}

local function clamp(v, a, b)
	return v < a and a or v > b and b or v
end
CarPhysics.clamp = clamp
local function hypot(a, b)
	return math.sqrt(a * a + b * b)
end

-- no damage: every effect neutral (the web game's damageEffects() with damage Off)
CarPhysics.NO_DAMAGE = { maxSpeed = 1, accel = 1, steering = 1, grip = 1, brakes = 1, lat = 1, pull = 0, roll = 0 }

-- the Realistic state (the web game's PTS, TSLIP, SIMX, ASSIST; WX = weather grip and wetness)
function CarPhysics.newState()
	return {
		pts = { yr = 0, dl = 0, h0 = 0, gear = 1, rpm = 850, shift = 0, spin = 0, lim = 0, hz = 0, hv = 0, pz = 0, pv = 0, rz = 0, rv = 0, idx = -1,
			man = 0, req = 0, deny = 0, flock = 0, absA = 0, tcA = 0, escA = 0 },
		tslip = { f = 0, r = 0, lock = 0, spin = 0, sa = 0, af = 0, ar = 0 },
		-- optional tyre temperature (tt) and brake fade (bf): off by default (= the plain Realistic handling)
		simx = { tt = false, bf = false, tT = 24, bT = 24, gk = 1, bk = 1 },
		-- driver assists: ABS on, traction control off, stability control off (the web game's defaults)
		assist = { abs = true, tc = false, esc = false },
		wx = { mu = 1, wet = 0 },
	}
end

-- after a car change or a handling switch (the web game's setHandling): gear back to 1, springs at rest
function CarPhysics.resetRealistic(env)
	local p = env.pts
	p.idx, p.yr, p.dl = -1, 0, 0
	p.hz, p.hv, p.pz, p.pv, p.rz, p.rv = 0, 0, 0, 0, 0, 0
end

-- ---- engine and gearbox (07g ptCurve / ptGear / ptShare) ----
-- generic engine torque shape vs x = rpm / redline (petrol NA / turbo blend); EV: constant torque, then constant power
local function ptCurve(x, ev)
	if ev then return x < 0.35 and 1 or 0.35 / x end
	if x < 0.12 then return 0.5 end
	if x < 0.6 then return 0.55 + 0.45 * math.sin((x - 0.12) / 0.48 * math.pi / 2) end
	if x < 0.85 then return 1 end
	return math.max(0.6, 1 - (x - 0.85) * 1.3)
end
CarPhysics.ptCurve = ptCurve
-- engine rpm at road speed v in gear g (clutch locked)
local function ptGear(s, v: number, g: number): number
	return v * s.ratio[g] / s.rw * 60 / (2 * math.pi)
end
CarPhysics.ptGear = ptGear
-- share of the car's weight on the driven wheels at forward acceleration a (longitudinal load transfer)
local function ptShare(s, a)
	local d = a * s.hcg / (s.wb * 9.81)
	if s.drive == "AWD" then return 1 end
	if s.drive == "FWD" then return clamp(s.fw - d, 0.2, 0.9) end
	return clamp(1 - s.fw + d, 0.2, 0.9)
end

-- ---- 07g ptAccel: longitudinal acceleration (throttle, gearbox, traction limit, drag, rolling, engine braking) ----
local function ptAccel(st, spec, env, dt, thA, fs, sfc, dfx)
	local P, A = env.pts, env.assist
	if P.escA ~= 0 then thA *= 0.3 end
	local s = spec.pt
	local kv = math.max(0.3, (spec.vm / s.vref) * dfx.maxSpeed)
	local ka = (spec.a0 / s.aref) * dfx.accel
	local v = math.max(0, fs)
	if P.idx ~= spec.ci then
		P.idx, P.gear, P.shift, P.spin = spec.ci, 1, 0, 0
	end
	local red, idl = s.red, s.idle
	local g = P.gear
	local rpm = ptGear(s, v, g) / kv
	if P.shift > 0 then
		P.shift -= dt
	elseif P.man ~= 0 then
		-- manual (Q / E, paddles): a downshift that would over-rev is refused
		local q = P.req
		P.req = 0
		if q > 0 and g < s.ng then
			g += 1
			P.gear, P.shift = g, s.shiftT
			rpm = ptGear(s, v, g) / kv
		elseif q < 0 and g > 1 then
			if ptGear(s, v, g - 1) / kv <= red * 1.03 then
				g -= 1
				P.gear, P.shift = g, s.shiftT * 0.6
				rpm = ptGear(s, v, g) / kv
			else
				P.deny = 1
			end
		end
	elseif g < s.ng and rpm >= red * (thA > 0.6 and 0.97 or 0.6) then
		g += 1
		P.gear, P.shift = g, s.shiftT
		rpm = ptGear(s, v, g) / kv
	elseif g > 1 and ptGear(s, v, g - 1) / kv < red * (thA > 0.6 and 0.86 or 0.5) and rpm < red * (thA > 0.6 and 0.55 or 0.3) then
		g -= 1
		P.gear, P.shift = g, s.shiftT * 0.6
		rpm = ptGear(s, v, g) / kv
	end
	local F = 0
	local eng = math.max(rpm, idl)
	local gov = s.gov > 0 and v >= s.gov * kv
	if P.shift <= 0 and thA > 0 and not gov and not (P.man ~= 0 and rpm >= red) then
		local r = math.min(math.max(eng, (v < 6 and g == 1 and not s.ev) and red * 0.45 * thA or 0), red)
		F = s.T * ka * thA * ptCurve(r / red, s.ev) * s.ratio[g] / s.rw * s.eff
	elseif thA <= 0 and P.shift <= 0 and not s.ev and v > 1 then
		-- engine braking (EV regeneration is not modelled)
		F = -s.T * 0.12 * (eng / red) * s.ratio[g] / s.rw
	end
	local al = clamp(st.al == st.al and st.al or 0, -12, 12)
	local lim = s.mu * sfc * 9.81 * ptShare(s, math.max(0, al)) * s.m
	P.lim = lim
	P.tcA = 0
	if A.tc and F > lim * 0.97 then
		F = lim * 0.97
		P.tcA = 1
	end
	if F > lim then
		P.spin = math.min(1, P.spin + dt * 4 * (F / lim - 1) + dt)
		F = lim * 0.9
	else
		P.spin = math.max(0, P.spin - dt * 3)
	end
	P.rpm = P.spin > 0.2 and math.min(red, math.max(eng, red * (0.55 + 0.4 * P.spin))) or math.min(eng, red)
	return (F - 0.5 * 1.2 * s.CdA / (kv * kv * kv) * v * v * math.sign(fs) - s.crr * s.m * 9.81 * math.sign(fs) * (math.abs(fs) > 0.3 and 1 or 0)) / s.m
end

-- ---- 07g ptDyn: the two-axle tyre model (slip angles, load transfer, friction circle, locked-rear handbrake, yaw inertia) ----
local C_PAC = 1.4
local function ptDyn(st, spec, env, dt, steer, an, hb, u, v, sfc, ax, frozen, dfx)
	local P, T = env.pts, env.tslip
	local s = spec.pt
	local m, a, b, mu = s.m, s.a, s.b, s.mu * sfc
	if frozen then
		P.yr, P.dl = 0, 0
		return u, v
	end
	local beta = math.abs(math.atan2(v, math.abs(u) + 0.5))
	local dmax = 0.6 * dfx.steering / (1 + math.max(0, u) / (12 + 45 * math.min(1, beta * 2.5)))
	local tgt = steer * dmax
	if an then
		P.dl = tgt
	else
		local rt = (tgt * P.dl < 0 or tgt == 0) and 6 or 4
		P.dl += clamp(tgt - P.dl, -rt * dt, rt * dt)
	end
	local d = P.dl
	local cd, sd = math.cos(d), math.sin(d)
	if not st.gnd then
		st.h += P.yr * dt
		P.yr *= 1 - 0.8 * dt
		return u, v
	end
	local g = 9.81 * m
	local dT = m * clamp(ax, -12, 12) * s.hcg / s.wb
	local dn = 0.6 * s.cl * u * u
	local Ff = math.max(0.15 * g, g * s.fw - dT + dn * 0.45)
	local Fr = math.max(0.15 * g, g * (1 - s.fw) + dT + dn * 0.55)
	local Fx = m * math.min(12, math.abs(ax))
	local sh = ax > 0.3 and (s.drive == "FWD" and 1 or s.drive == "AWD" and 0.4 or 0) or ax < -0.3 and 0.65 or 0.5
	local function ci(c, f)
		return math.max(0.3 * c, math.sqrt(math.max(0, c * c - f * f)))
	end
	local cF, cR = ci(mu * Ff, Fx * sh), ci(mu * Fr, Fx * (1 - sh))
	local sp = P.spin
	if P.flock ~= 0 then cF *= 0.15 end
	if sp > 0 then
		if s.drive == "FWD" then
			cF *= 1 - 0.6 * sp
		else
			cR *= 1 - (s.drive == "RWD" and 0.65 or 0.3) * sp
		end
	end
	local n = math.min(12, math.ceil(dt * 240))
	local h = dt / n
	local kin = clamp((u - 2) / 4, 0, 1)
	local r, af, ar, lk = P.yr, 0, 0, 0
	for _ = 1, n do
		local fyf, fyr, fxr = 0, 0, 0
		if kin > 0 then
			local au = math.max(math.abs(u), 0.5)
			local vr = v + b * r
			af = math.atan2(v - a * r, au) + d
			ar = math.atan2(vr, au)
			fyf = -cF * math.sin(C_PAC * math.atan(s.B * af))
			if hb then
				local q = hypot(u, vr)
				if q == 0 then q = 1 end
				local fsl = 0.8 * mu * Fr
				fyr, fxr, lk = -fsl * vr / q, -fsl * u / q, 1
			else
				fyr = -cR * math.sin(C_PAC * math.atan(s.B * ar))
			end
		end
		local rd = r + (-a * fyf * cd + b * fyr) / s.Iz * h
		local rk = u * math.tan(d) / s.wb
		r = kin * rd + (1 - kin) * rk
		v = kin * (v + ((fyf * cd + fyr) / m + u * r) * h) + (1 - kin) * v * math.exp(-8 * h)
		u += kin * ((fxr - math.abs(fyf * sd) * math.sign(u)) / m - v * r) * h
		if hb and kin < 1 then u *= math.exp(-2.5 * (1 - kin) * h) end
		st.h += r * h
	end
	P.escA = 0
	if env.assist.esc and kin > 0.5 and u > 6 and not hb then
		local rk = u * math.tan(d) / s.wb
		if math.abs(r - rk) > 0.12 then
			r += (rk - r) * math.min(1, 6 * dt)
			P.escA = 1
		end
	end
	P.yr = r
	T.af = kin * math.abs(af) / s.pk
	T.ar = kin * math.abs(ar) / s.pk
	T.f = kin * clamp(math.abs(af) / s.pk - 1, 0, 3)
	T.r = kin * math.max(clamp(math.abs(ar) / s.pk - 1, 0, 3), lk * clamp((hypot(u, v) - 3) / 6, 0, 2))
	T.lock = math.max(lk, P.flock ~= 0 and 1 or 0)
	return u, v
end

-- ---- 07g slipTick: tyre slip for smoke / squeal / audio in both modes (never physics) ----
local function slipTick(st, env, fs, ls, frozen, bo)
	local T = env.tslip
	local sa = math.abs(math.atan2(ls, math.abs(fs) + 0.5))
	local sp = hypot(fs, ls)
	T.sa = sa
	T.spin = bo and 1 or (env.mode == 1 and env.pts.spin or 0)
	if env.mode ~= 1 then
		T.r = (st.gnd and not frozen and sp > 5) and clamp((sa - 0.12) / 0.15, 0, 3) or 0
		T.f = T.r * 0.3
		T.lock = 0
	end
end

-- ---- 07g simxTick: optional tyre temperature and brake fade (Realistic only) ----
local function simxGrip(t)
	if t < 90 then return 1 - 0.08 * math.min(1, ((90 - t) / 65) ^ 2) end
	return 1 - 0.15 * math.min(1, ((t - 90) / 50) ^ 2)
end
CarPhysics.simxGrip = simxGrip
local function simxTick(st, env, dt, fs, bd)
	local X, P, T = env.simx, env.pts, env.tslip
	local v = math.abs(fs)
	local amb = 24 - 8 * env.wx.wet
	if X.tt then
		local ax = math.min(12, math.abs(st.al or 0))
		local ay = math.min(12, math.abs(fs * P.yr))
		local sl = 0.5 * T.f + T.r + 2 * P.spin
		X.tT += ((0.0145 * (ax + ay) + 0.05) * v + 0.32 * sl * math.min(v, 20) - (X.tT - amb) * (0.02 + 0.012 * math.sqrt(v))) * dt
		X.tT = clamp(X.tT, amb - 5, 160)
		X.gk = simxGrip(X.tT)
	else
		X.tT, X.gk = amb, 1
	end
	if X.bf then
		X.bT += (0.31 * bd * v - (X.bT - amb) * (0.004 + 0.0008 * v)) * dt
		X.bT = clamp(X.bT, amb - 5, 900)
		X.bk = X.bT < 400 and 1 or math.max(0.6, 1 - 0.4 * (X.bT - 400) / 300)
	else
		X.bT, X.bk = amb, 1
	end
end

-- ---- one physics step of the web game's updP, up to P.al (+ the slip / temperature ticks). Returns fs, ls. ----
function CarPhysics.step(st, spec, inp, env, dt)
	local thA, brA, steer, hb = inp.th, inp.br, inp.steer, inp.hb
	local th, br = thA > 0, brA > 0
	local frozen = env.frozen
	local real = env.mode == 1
	local dfx = env.dfx or CarPhysics.NO_DAMAGE
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local fs = st.vx * fx + st.vz * fz
	if not real then
		st.h += steer * 1.8 * spec.hd * dfx.steering / (1 + math.abs(fs) / 18) * clamp(fs / 4, -1, 1) * (hb and 1.5 or 1) * (st.gnd and 1 or 0.2) * dt
	end
	if dfx.pull ~= 0 and st.gnd and not frozen then st.h += dfx.pull * clamp(fs / 12, -1, 1) * dt end
	fx, fz = math.sin(st.h), math.cos(st.h)
	local rx, rz = -fz, fx
	fs = st.vx * fx + st.vz * fz
	local ls = st.vx * rx + st.vz * rz
	local sfc = env.sfc * dfx.grip * (real and env.wx.mu * env.simx.gk or 1)
	local vmEff, aEff = math.max(2, spec.vm * dfx.maxSpeed), spec.a0 * dfx.accel
	local bkEff = spec.bk * dfx.brakes * (real and env.simx.bk or 1)
	-- slope along the car's new heading (TH 2 m ahead minus 2 m behind), as the web game measures it after steering
	local slp = (env.TH(st.x + fx * 2, st.z + fz * 2) - env.TH(st.x - fx * 2, st.z - fz * 2)) / 4
	local pfs = fs
	-- burnout (damage Cosmetic / Full only; the damage module sets env.burnout)
	local bo = st.gnd and not frozen and env.burnout ~= nil and env.burnout(th, thA, br, brA, hb, fs) or false
	if real then
		env.pts.flock, env.pts.absA = 0, 0
	end
	if st.gnd and not frozen then
		if bo then
			fs *= math.exp(-5 * dt)
		else
			if real and fs > -0.5 and not (br and fs <= 0.5) then
				fs += ptAccel(st, spec, env, dt, th and thA or 0, fs, sfc, dfx) * dt
			elseif th then
				local ac = aEff * thA * (1 - math.pow(math.max(fs, 0) / (vmEff * 1.05), 2.5)) * (0.5 + 0.5 * sfc)
				if fs < 0 then ac = math.min(ac * 2, bkEff * sfc) end
				fs += ac * dt
			end
			if br then
				if fs > 0.5 then
					-- ABS (Realistic): without it a brake demand above the tyre limit locks the wheels; with it the plain brake line runs
					if real and fs > 2 and bkEff * brA > 0.92 * spec.pt.mu * 9.81 then
						if env.assist.abs then
							env.pts.absA = 1
						else
							env.pts.flock = 1
							fs = math.max(0, fs - 0.8 * spec.pt.mu * 9.81 * sfc * dt)
						end
					end
					if not (real and env.pts.flock ~= 0) then fs = math.max(0, fs - bkEff * sfc * dt * brA) end
				else
					fs = math.max(-10, fs - 3.5 * dt * brA)
				end
			end
		end
		if not (bo or (math.abs(fs) < 1 and not th and (br or hb or math.abs(slp) < 0.15))) then
			fs -= 9.81 * slp / math.sqrt(1 + slp * slp) * dt
		end
		if sfc < 1 and math.abs(fs) > 0.5 then fs -= math.sign(fs) * (1 - sfc) * 1.5 * dt end
		if dfx.roll ~= 0 and math.abs(fs) > 0.3 then fs -= math.sign(fs) * math.min(math.abs(fs) - 0.3, dfx.roll * dt) end
		if hb and not real then fs *= 1 - 0.8 * dt end
		if not real then
			if math.abs(fs) > 0.5 then fs -= math.sign(fs) * 0.5 * dt end
			fs -= fs * 0.012 * dt
			ls *= math.exp(-(hb and 1.1 or ((th and steer ~= 0 and fs > 15) and 2.4 or 6.5 * spec.hd)) * dfx.lat * dt)
		end
	end
	if real then
		fs, ls = ptDyn(st, spec, env, dt, steer, inp.an == true, hb, fs, ls, sfc * dfx.lat, (fs - pfs) / dt, frozen, dfx)
		fx, fz = math.sin(st.h), math.cos(st.h)
		rx, rz = -fz, fx
	end
	st.vx, st.vz = fx * fs + rx * ls, fz * fs + rz * ls
	if frozen then st.vx, st.vz = 0, 0 end
	st.al = (fs - pfs) / dt
	slipTick(st, env, fs, ls, frozen, bo)
	if real then simxTick(st, env, dt, fs, (st.gnd and not frozen and br and fs > 0.5) and math.min(12, bkEff * brA) or 0) end
	return fs, ls, bo
end

-- Realistic: a long frame is split into equal physics steps of at most 1/60 s (the web game's updPStep); Arcade: one step per frame
function CarPhysics.substeps(mode, dt)
	if mode ~= 1 or dt <= 1 / 60 + 1e-6 then return 1 end
	return math.min(4, math.ceil(dt * 60 - 1e-6))
end

-- ---- 07g ptBody (Realistic): the sprung body, pitch / roll / heave spring-dampers driven by acceleration and by bump impulses ----
-- call once per physics step after the move; returns heave (m), pitch (rad, nose down +), roll (rad) to add to the body
function CarPhysics.body(st, spec, env, dt, frozen, fs)
	local P = env.pts
	local s = spec.pt
	local w, z = 2 * math.pi * s.fn, s.zeta
	local k2 = (1.8 / s.fn) * (1.8 / s.fn)
	local dh = st.h - P.h0
	local yr = math.atan2(math.sin(dh), math.cos(dh)) / math.max(dt, 1e-4)
	local al = (st.gnd and not frozen) and clamp(st.al, -12, 8) or 0
	local ay = (st.gnd and not frozen) and clamp(fs * yr, -12, 12) or 0
	local tp, tr = -al * 0.0026 * k2, ay * 0.0075 * k2
	local h = math.min(dt, 1 / 30)
	P.pv += (w * w * (tp - P.pz) - 2 * z * w * P.pv) * h
	P.pz += P.pv * h
	P.rv += (w * w * (tr - P.rz) - 2 * z * w * P.rv) * h
	P.rz += P.rv * h
	P.hv += (-w * w * P.hz - 2 * z * w * P.hv) * h
	P.hz += P.hv * h
	P.h0 = st.h
	P.pz, P.rz, P.hz = clamp(P.pz, -0.09, 0.09), clamp(P.rz, -0.1, 0.1), clamp(P.hz, -0.12, 0.12)
	return P.hz, P.pz, P.rz
end

-- manual gearbox request (the web game's gearKey for Q / E / paddles): -> message or nil. d = +1 up, -1 down.
function CarPhysics.requestShift(spec, env, d)
	if env.mode ~= 1 then return "Gears are simulated in Realistic handling (press H)" end
	local s = spec.pt
	if s.ev or s.ng < 2 then return "Single-speed drive: no gears to shift" end
	local P = env.pts
	local msg = nil
	if P.man == 0 then
		P.man = 1
		msg = "Gearbox: Manual (Q down · E up · gamepad LB / RB)"
	end
	P.req, P.deny = d, 0
	return msg
end

return CarPhysics
