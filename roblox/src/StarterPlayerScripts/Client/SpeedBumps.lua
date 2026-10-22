-- Irbid Drive (Roblox) - crossing speed bumps, the web game's quarter-car model (07c_realism.js checkSpeedBumpCrossing): per axle the
-- tyre follows the bump profile (or falls back to it no faster than WDROP), the body is a spring-damper on it (natural frequency and
-- damping from the car's handling profile, wheelbase from its spec). The car only gets a short hop when the body rises past full
-- suspension droop (fast crossings), never a launch. Also the body heave / pitch and a short vibration for the car's looks.
-- Taken too fast (the bump stop reached, or the damper compressed faster than ~4 m/s) the crossing is reported to the damage system
-- (SpeedBumps.onImpact(speed, severity, axle 0 front / 1 rear), at most every 0.6 s, as in the web game).
local Workspace = game:GetService("Workspace")
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Ground = require(Client:WaitForChild("Ground"))

local SpeedBumps = {}
local st, spec = State.st, State.spec
local WDROP = 110
local SUSP = { zb = { 0, 0 }, vb = { 0, 0 }, zh = { 0, 0 }, vh = { 0, 0 }, vrel = { 0, 0 }, comp = { 0, 0 }, heave = 0, pitch = 0, jolt = 0, active = false, last = -9 }
-- the suspension travel before the bump stop, by body type (the web game's suspTravel)
local function travel(k)
	return (k == "r" or k == "m" or k == "q") and 0.05 or (k == "s" or k == "p" or k == "v") and 0.11 or 0.075
end
SpeedBumps.SUSP = SUSP

-- prevX, prevZ = the car's position before this frame's move
function SpeedBumps.step(prevX, prevZ, dt)
	if not Ground.anyBumps then return end
	local fn, ze, wb = spec.fn or 1.5, spec.zeta or 0.4, spec.wb or 2.6
	local w = 2 * math.pi * fn
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local hw = wb / 2
	local any = false
	SUSP.jolt *= math.exp(-7 * dt)
	for a = 1, 2 do
		local s = a == 2 and -1 or 1
		local zp = st.gnd and Ground.bumpAt(st.x + fx * hw * s, st.z + fz * hw * s) or 0
		if zp > 0 or Ground.bumpAt((prevX + st.x) / 2 + fx * hw * s, (prevZ + st.z) / 2 + fz * hw * s) > 0
			or SUSP.zh[a] > 1e-4 or math.abs(SUSP.zb[a]) > 1e-4 or math.abs(SUSP.vb[a]) > 1e-3 then
			any = true
			-- sub-steps sample the profile along the axle's path this frame (5 cm apart), so a 0.9 m bump is resolved at any speed
			local n = math.clamp(math.ceil(math.sqrt((st.x - prevX) ^ 2 + (st.z - prevZ) ^ 2) / 0.05), 4, 24)
			local h = dt / n
			local ax, az = fx * hw * s, fz * hw * s
			for k = 1, n do
				local f = k / n
				local zpk = st.gnd and Ground.bumpAt(prevX + (st.x - prevX) * f + ax, prevZ + (st.z - prevZ) * f + az) or 0
				SUSP.vh[a] -= WDROP * h
				local zh = SUSP.zh[a] + SUSP.vh[a] * h
				if zh <= zpk then
					SUSP.vh[a] = (zpk - SUSP.zh[a]) / h
					zh = zpk
				end
				if zh > zpk + 0.02 then
					zh = zpk + 0.02
					SUSP.vh[a] = math.min(SUSP.vh[a], 0)
				end
				SUSP.zh[a] = zh
				local vrel = SUSP.vh[a] - SUSP.vb[a]
				local acc = -w * w * (SUSP.zb[a] - zh) + 2 * ze * w * vrel
				SUSP.vb[a] += acc * h
				SUSP.zb[a] += SUSP.vb[a] * h
				SUSP.vrel[a] = vrel
				SUSP.jolt = math.max(SUSP.jolt, math.abs(vrel))
			end
			SUSP.zb[a] = math.clamp(SUSP.zb[a], -0.15, 0.3)
			SUSP.comp[a] = SUSP.zh[a] - SUSP.zb[a]
			-- harshness: hitting the bump stop (main term), or compressing faster than the damper can soak up
			local sev = math.max((SUSP.comp[a] - travel(spec.body)) / 0.02, (SUSP.vrel[a] - 4) / 2)
			local now = Workspace.DistributedGameTime
			if sev > 0 and now - SUSP.last > 0.6 then
				SUSP.last = now
				if SpeedBumps.onImpact then SpeedBumps.onImpact(math.sqrt(st.vx * st.vx + st.vz * st.vz), sev, a - 1) end
			end
			-- the axle leaves the ground only when the body rises past full suspension droop (~6 cm): a short hop
			if st.gnd and SUSP.vb[a] > 0 and SUSP.zb[a] - SUSP.zh[a] > 0.06 then st.vy = math.max(st.vy, math.min(1.2, SUSP.vb[a] * 0.5)) end
		end
	end
	SUSP.active = any
	SUSP.heave = (SUSP.zb[1] + SUSP.zb[2]) / 2
	SUSP.pitch = math.atan2(SUSP.zb[2] - SUSP.zb[1], wb)
end

-- extra body movement for the car's CFrame: heave (m), pitch (rad, nose up +), roll (rad)
local t = 0
function SpeedBumps.visual(dt)
	t += dt
	local heave, pitch, roll = 0, 0, 0
	if SUSP.active then
		heave, pitch = SUSP.heave, -SUSP.pitch
	end
	if SUSP.jolt > 0.15 then
		local j = math.min(1, SUSP.jolt / 6)
		heave += math.sin(t * 83) * 0.012 * j
		roll += math.sin(t * 61) * 0.012 * j
		pitch += math.sin(t * 71) * 0.008 * j
	end
	return heave, pitch, roll
end

return SpeedBumps
