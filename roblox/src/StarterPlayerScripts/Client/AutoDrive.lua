-- Irbid Drive (Roblox) - auto-drive (key Z; the web game's 11c apInput): follows the GPS route through the SAME car physics as the player
-- (it only supplies steering / throttle / brake, like a wheel), keeps right of the centre line, obeys the speed limit of each street and the
-- red lights, slows for curves and for cars ahead, and stops at the destination. Any steering, throttle, brake or handbrake input hands
-- control back; never teleports; gives up when blocked for 6 s. A simple rule-based driver, not a self-driving system.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Gps = require(Client:WaitForChild("Gps"))
local Signals = require(Client:WaitForChild("Signals"))
local Laws = require(Client:WaitForChild("Laws"))

local AutoDrive = {}
local AP = { on = false, stop = 0, stuck = 0, vt = 0, why = "" }
AutoDrive.state = AP
local st, spec = State.st, State.spec
local CP, legs, total, j, builtFor = nil, nil, 0, 1, nil

local function clamp(v, a, b)
	return v < a and a or v > b and b or v
end

-- the route's centre line and its legs (start / end distance, edge, the node at its end)
local function build(nav)
	CP = Road.path(nav.trs, nil)
	legs = {}
	local s0 = 0
	for ti, tr in ipairs(nav.trs) do
		local s1 = CP.ends[ti]
		legs[ti] = { s0 = s0, s1 = s1, e = tr.e, node = tr.d > 0 and tr.e.b or tr.e.a }
		s0 = s1
	end
	total = CP.c[#CP.c]
	local _, _, i = Road.project(CP, st.x, st.z, 1, #CP.x)
	j = i
	builtFor = nav.P
end

local function off(msg)
	AP.on, AP.stop = false, 0
	Hud.ap.Text = ""
	if msg then Hud.toast(msg) end
end
AutoDrive.off = off

function AutoDrive.toggle()
	if AP.on then
		off("Auto-drive off")
		return
	end
	local nav = Gps.route()
	if not (nav and nav.trs) then
		Hud.toast("Auto-drive follows a route: press M and choose a destination first")
		return
	end
	if State.mission == "race" or State.mission == "duel" then
		Hud.toast("Auto-drive is not available during races")
		return
	end
	if State.mission == "heist" then
		Hud.toast("Auto-drive is not available during a heist")
		return
	end
	AP.on, AP.stop, AP.stuck = true, 0, 0
	builtFor = nil
	Hud.toast("🤖 Auto-drive on (Z): following the route · steer, gas or brake to take over")
end

-- every frame after the controls: user = the player gave any input this frame (keys, pads, a gamepad above 0.15)
function AutoDrive.apply(inp, user, dt)
	if not AP.on then return end
	if user then
		off("Auto-drive off: you took control")
		return
	end
	local nav = Gps.route()
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local u = st.vx * fx + st.vz * fz
	inp.hb, inp.an = false, true
	if not nav or AP.stop ~= 0 then
		AP.stop = 1
		inp.steer, inp.th, inp.br = 0, 0, 1
		if math.abs(u) < 0.4 then off(nav and "Auto-drive off" or "🏁 Auto-drive: arrived") end
		return
	end
	if State.mission == "race" or State.mission == "duel" or State.mission == "heist" then
		off("Auto-drive off")
		return
	end
	if builtFor ~= nav.P then build(nav) end
	-- progress: the car's projection on the route (near the last segment)
	local s, _, jj = Road.project(CP, st.x, st.z, math.max(1, j - 2), math.min(#CP.x, j + 3))
	j = jj
	local ri = State.ri
	local rd = (ri and ri.e and ri.d <= ri.e.w / 2 + 4) and ri.e or nil
	local lane = rd and (rd.ow and rd.w * 0.18 or math.min(2.6, rd.w * 0.25)) or 1.6
	-- steering: pure pursuit on a point Ld ahead, shifted to the right-hand lane
	local Ld = 7 + 0.45 * math.max(0, u)
	local qx, qz, _, qtx, qtz = Road.sample(CP, clamp(s + Ld, 0, total), j)
	local tx, tz = qx - qtz * lane - st.x, qz + qtx * lane - st.z
	local rx, rz = -fz, fx
	local lat, fw = tx * rx + tz * rz, tx * fx + tz * fz
	local d2 = math.max(9, lat * lat + fw * fw)
	local kap = 2 * lat / d2
	local real = State.phys and State.phys.mode == 1
	local sv
	if real then
		local beta = math.abs(math.atan2(st.vx * rx + st.vz * rz, math.abs(u) + 0.5))
		local dm = 0.6 / (1 + math.max(0, u) / (12 + 45 * math.min(1, beta * 2.5)))
		sv = -math.atan(kap * spec.pt.wb * 1.15) / dm
	elseif u > 0.5 then
		sv = -kap * u * (1 + u / 18) / (1.8 * spec.hd * clamp(u / 4, -1, 1))
	else
		sv = -math.sign(kap) * math.min(1, math.abs(kap) * 20)
	end
	inp.steer = clamp(sv, -1, 1)
	-- target speed: the limit, the legs ahead, a big heading error, curvature, red / amber lights, cars ahead, the destination
	local mu = real and State.phys.wx.mu or 1
	local he = math.abs(math.atan2(lat, fw))
	local vt, why = math.min(Laws.limit or 50, 90) / 3.6 * 0.95, "limit"
	for _, L in ipairs(legs) do
		if L.s1 >= s then
			if L.s0 > s + 90 then break end
			local vl = math.min(L.e.lim or 50, 90) / 3.6 * 0.95
			local dd = math.max(0, L.s0 - s - 4)
			if L.s0 <= s then vt = vl else vt = math.min(vt, math.sqrt(vl * vl + 2 * 2.5 * dd)) end
		end
	end
	if he > 0.3 then
		local vh = math.max(3, 14 * (1 - (he - 0.3) / 1.2))
		if vh < vt then vt, why = vh, "turning" end
	end
	local _, _, _, px, pz = Road.sample(CP, clamp(s, 0, total), j)
	for d = 10, 110, 10 do
		local _, _, _, dx, dz = Road.sample(CP, clamp(s + d, 0, total), j)
		local cr, dp = px * dz - pz * dx, px * dx + pz * dz
		local k2 = math.abs(math.atan2(cr, dp)) / 10
		px, pz = dx, dz
		if k2 > 0.004 then
			local vc = math.sqrt(3 * mu / k2)
			local va = math.sqrt(vc * vc + 2 * 3 * mu * math.max(0, d - 10))
			if va < vt then vt, why = va, "curve" end
		end
	end
	-- red / amber: stop 13.5 m before the junction node; once inside at speed, carry on
	for _, L in ipairs(legs) do
		local de = L.s1 - s
		if de >= -2 then
			if de > 95 then break end
			local nd = State.road.nodes[L.node]
			if nd and nd.lit then
				local lt = Signals.at(nd, L.e)
				local dd = de - 13.5
				if (dd > -2 or (dd > -8 and u < 3)) and (lt == "r" or (lt == "y" and dd > u * 1.1)) then
					local vr = math.sqrt(2 * 3 * math.max(0, dd))
					if vr < vt then vt, why = vr, "red light" end
				end
				break
			end
		end
	end
	for _, o in ipairs(State.ai) do
		local dx, dz = o.x - st.x, o.z - st.z
		local f = dx * fx + dz * fz
		if f > 0 and f < 40 and math.abs(dx * rx + dz * rz) < 2.4 then
			local vo = math.max(0, (f - 8) * 0.8)
			if vo < vt then vt, why = vo, "car ahead" end
		end
	end
	local ve = math.sqrt(2 * 2.5 * math.max(0, total - s - 6))
	if ve < vt then vt, why = ve, "arriving" end
	AP.vt, AP.why = vt, why
	local e = vt - u
	inp.th = e > 0 and clamp(e * 0.45, 0, 1) or 0
	-- hold the brake while waiting (no creeping over the stop line)
	inp.br = (vt < 0.3 and u < 2) and 1 or e < -0.8 and clamp(-e * 0.3, 0, 1) or 0
	AP.stuck = (vt > 3 and u < 0.5) and AP.stuck + dt or 0
	if AP.stuck > 6 then
		off("Auto-drive stopped: the way is blocked")
		return
	end
	Hud.ap.Text = "🤖 AUTO · " .. math.floor(vt * 3.6 + 0.5) .. " km/h target · " .. why
end

return AutoDrive
