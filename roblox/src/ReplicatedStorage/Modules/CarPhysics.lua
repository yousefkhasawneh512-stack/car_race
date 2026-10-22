-- Irbid Drive (Roblox) - the player's car physics: the web game's updP (10_laws_player.js), line for line, as a PURE module (no Roblox
-- services, only math), so tests/physics_equiv.js can run it next to the web build and compare every frame. Drive.lua feeds it the
-- surface grip and slope and does the moving, the ground height and the visuals.
-- st: h (heading, forward = (sin h, cos h)), vx, vz (m/s), gnd (wheels on the ground), al (forward acceleration of the last frame)
-- spec: vm (top speed m/s), a0 (acceleration m/s²), bk (brakes m/s²), hd (handling)   [the web game's applyTune values]
-- inp: th, br (0..1), steer (-1..1, + = left), hb (handbrake)
-- env: sfc (surface grip), TH (terrain height function (x, z) -> m), frozen (race countdown); st.x, st.z = the car's position
local CarPhysics = {}

local function clamp(v, a, b)
	return v < a and a or v > b and b or v
end
CarPhysics.clamp = clamp

-- one frame of the web game's Arcade updP, up to P.al. Returns fs, ls (forward / sideways speed after the frame).
function CarPhysics.step(st, spec, inp, env, dt)
	local thA, brA, steer, hb = inp.th, inp.br, inp.steer, inp.hb
	local th, br = thA > 0, brA > 0
	local frozen = env.frozen
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local fs = st.vx * fx + st.vz * fz
	st.h += steer * 1.8 * spec.hd / (1 + math.abs(fs) / 18) * clamp(fs / 4, -1, 1) * (hb and 1.5 or 1) * (st.gnd and 1 or 0.2) * dt
	fx, fz = math.sin(st.h), math.cos(st.h)
	local rx, rz = -fz, fx
	fs = st.vx * fx + st.vz * fz
	local ls = st.vx * rx + st.vz * rz
	local sfc = env.sfc
	local vmEff, aEff, bkEff = math.max(2, spec.vm), spec.a0, spec.bk
	-- slope along the car's new heading (TH 2 m ahead minus 2 m behind), as the web game measures it after steering
	local slp = (env.TH(st.x + fx * 2, st.z + fz * 2) - env.TH(st.x - fx * 2, st.z - fz * 2)) / 4
	local pfs = fs
	if st.gnd and not frozen then
		if th then
			local ac = aEff * thA * (1 - math.pow(math.max(fs, 0) / (vmEff * 1.05), 2.5)) * (0.5 + 0.5 * sfc)
			if fs < 0 then ac = math.min(ac * 2, bkEff * sfc) end
			fs += ac * dt
		end
		if br then
			if fs > 0.5 then
				fs = math.max(0, fs - bkEff * sfc * dt * brA)
			else
				fs = math.max(-10, fs - 3.5 * dt * brA)
			end
		end
		if not (math.abs(fs) < 1 and not th and (br or hb or math.abs(slp) < 0.15)) then
			fs -= 9.81 * slp / math.sqrt(1 + slp * slp) * dt
		end
		if sfc < 1 and math.abs(fs) > 0.5 then fs -= math.sign(fs) * (1 - sfc) * 1.5 * dt end
		if hb then fs *= 1 - 0.8 * dt end
		if math.abs(fs) > 0.5 then fs -= math.sign(fs) * 0.5 * dt end
		fs -= fs * 0.012 * dt
		ls *= math.exp(-(hb and 1.1 or ((th and steer ~= 0 and fs > 15) and 2.4 or 6.5 * spec.hd)) * dt)
	end
	st.vx, st.vz = fx * fs + rx * ls, fz * fs + rz * ls
	if frozen then st.vx, st.vz = 0, 0 end
	st.al = (fs - pfs) / dt
	return fs, ls
end

return CarPhysics
