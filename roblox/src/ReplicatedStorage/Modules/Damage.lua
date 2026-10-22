-- Irbid Drive (Roblox) - vehicle damage, tyres and repairs: the web game's 07c_realism.js (records, impacts, landings, speed bumps,
-- engine heat, effects on driving), 07d_tyres.js (per-wheel load, slip, heat, wear, punctures, burnouts), the logic of 07h_dmgparts.js
-- (bumpers, mirrors, bonnet / boot lid, doors, glass cracks, bent rims, flat-tyre rolling drag) and 08d_repair.js (the repair bay: items,
-- prices x rarity tier, one repair at a time, full inspection) with 07f's diagnostics rows. Line for line, as a PURE module (no Roblox
-- services), shared by the devices (driving) and the server (it checks saved records and prices repairs). tests/damage_equiv.js runs it
-- next to the web build and compares the records.
-- Modes: 0 Off (nothing recorded; driving unchanged), 1 Cosmetic (visible damage only), 2 Full (also mechanical damage and tyre grip).
-- EVERY mass, layout, threshold and price is the web game's GAMEPLAY ESTIMATE (no crash-test data, no workshop quotes).
-- car = Config.CARS[i]: dmg = carSpec numbers (mass, drive, eng, b0, b1, maxC, thr, comp, tyre, ...), geo = the body outline (dpGeo).
-- Arrays are 1-based here (the web game's wheel / light / pane j is index j + 1).
local Damage = {}

local function cl(v, a, b)
	return v < a and a or v > b and b or v
end
local function hypot(a, b)
	return math.sqrt(a * a + b * b)
end
-- JavaScript's +x.toFixed(3) and Math.round
local function fix3(x)
	return tonumber(string.format("%.3f", x))
end
local function jsround(x)
	return math.floor(x + 0.5)
end
Damage.jsround = jsround

Damage.MODE_NAMES = { "Off", "Cosmetic", "Full" }
Damage.ZONES = { "fl", "fr", "l", "r", "rl", "rr", "roof", "u" }
Damage.ZONE_NAMES = { fl = "front-left", fr = "front-right", l = "left side", r = "right side", rl = "rear-left", rr = "rear-right", roof = "roof", u = "underbody" }
Damage.WHEEL_NAMES = { "FL", "FR", "RL", "RR" }
Damage.LIGHT_NAMES = { "left headlight", "right headlight", "left tail light", "right tail light" }
Damage.GLASS_NAMES = { "windscreen", "rear screen", "left windows", "right windows" }
Damage.DP_KEYS = { "bf", "br", "ml", "mr", "hood", "trunk", "dl", "dr" }
Damage.DP_NAMES = { bf = "Front bumper", br = "Rear bumper", ml = "Left mirror", mr = "Right mirror", hood = "Bonnet (hood)", trunk = "Boot lid (trunk)",
	dl = "Left doors", dr = "Right doors" }
-- zone centres in car-local metres as fractions of (W, L): +x = the car's left, +z = forward (the order matters: the web game iterates it)
local ZC = { { "fl", 0.3, 0.45 }, { "fr", -0.3, 0.45 }, { "l", 0.5, 0 }, { "r", -0.5, 0 }, { "rl", 0.3, -0.45 }, { "rr", -0.3, -0.45 } }
local COMP_KEYS = { "body", "engine", "tyres", "suspension", "brakes", "cooling", "trans", "driveline", "steer" }

-- ---- records (one per car; the web game keys them by car name, Roblox by car index) ----
function Damage.newWheel()
	return { tread = 100, temp = 25, health = 100, punct = false, km = 0, tmax = 25, wear = { burn = 0, slide = 0, spin = 0, lock = 0, roll = 0 } }
end
function Damage.newRecord(car)
	return {
		v = 2, durability = car.dmg.durability, body = 100, engine = 100, tyres = 100, suspension = 100, brakes = 100, cooling = 100, trans = 100, driveline = 100, steer = 100,
		zones = { fl = 100, fr = 100, l = 100, r = 100, rl = 100, rr = 100, roof = 100, u = 100 }, susp = { 100, 100, 100, 100 }, align = { 0, 0, 0, 0 },
		lights = { 0, 0, 0, 0 }, glass = { 0, 0, 0, 0 }, wheels = { Damage.newWheel(), Damage.newWheel(), Damage.newWheel(), Damage.newWheel() }, dents = {},
		parts = { bf = 0, br = 0, ml = 0, mr = 0, hood = 0, trunk = 0, dl = 0, dr = 0 }, cracks = { {}, {}, {}, {} }, rims = { 0, 0, 0, 0 }, engTemp = 90,
		impacts = 0, lastHit = -99, lastX = 0, lastZ = 0, log = {},
	}
end

-- a record from storage or another device, checked field by field: numbers finite and in range, arrays of the right length (the web
-- game's migrateRecord, stricter because a Roblox server must not trust a device)
local function num(v, d, a, b)
	if type(v) ~= "number" or v ~= v or v == math.huge or v == -math.huge then return d end
	return cl(v, a, b)
end
function Damage.clean(s, car)
	local n = Damage.newRecord(car)
	if type(s) ~= "table" then return n end
	for _, k in ipairs(COMP_KEYS) do n[k] = num(s[k], 100, 0, 100) end
	n.engTemp = num(s.engTemp, 90, 60, 140)
	n.impacts = math.floor(num(s.impacts, 0, 0, 1e9))
	if type(s.zones) == "table" then
		for _, z in ipairs(Damage.ZONES) do n.zones[z] = num(s.zones[z], 100, 0, 100) end
	end
	for _, a in ipairs({ { "susp", 100, 0, 100 }, { "align", 0, -6, 6 }, { "lights", 0, 0, 1 }, { "glass", 0, 0, 1 }, { "rims", 0, 0, 1 } }) do
		local src = s[a[1]]
		if type(src) == "table" then
			for j = 1, 4 do n[a[1]][j] = num(src[j], a[2], a[3], a[4]) end
		end
	end
	if type(s.wheels) == "table" then
		for j = 1, 4 do
			local w, o = n.wheels[j], s.wheels[j]
			if type(o) == "table" then
				w.tread, w.temp, w.health = num(o.tread, 100, 0, 100), num(o.temp, 25, 20, 320), num(o.health, 100, 0, 100)
				w.punct = o.punct == true
				w.km, w.tmax = num(o.km, 0, 0, 1e7), num(o.tmax, 25, 20, 320)
				if type(o.wear) == "table" then
					for _, k in ipairs({ "burn", "slide", "spin", "lock", "roll" }) do w.wear[k] = num(o.wear[k], 0, 0, 100) end
				end
			end
		end
	end
	if type(s.parts) == "table" then
		for _, k in ipairs(Damage.DP_KEYS) do n.parts[k] = num(s.parts[k], 0, 0, 1) end
	end
	if type(s.dents) == "table" then
		for i = 1, math.min(16, #s.dents) do
			local d = s.dents[i]
			if type(d) == "table" and #d == 7 then
				n.dents[#n.dents + 1] = { num(d[1], 0, -4, 4), num(d[2], 0.55, 0, 3), num(d[3], 0, -4, 4), num(d[4], 0, -1, 1), num(d[5], 0, -1, 1), num(d[6], 0, 0, 0.6), num(d[7], 0.42, 0, 2) }
			end
		end
	end
	if type(s.cracks) == "table" then
		for j = 1, 4 do
			local L = s.cracks[j]
			if type(L) == "table" then
				for i = 1, math.min(3, #L) do
					local c = L[i]
					if type(c) == "table" and #c == 3 then n.cracks[j][#n.cracks[j] + 1] = { num(c[1], 0.5, 0, 1), num(c[2], 0.5, 0, 1), num(c[3], 0, 0, 1) } end
				end
			end
		end
	end
	-- the impact log (shown in the diagnostics): checked strings and numbers, at most 8
	if type(s.log) == "table" then
		local function str(v, m)
			return type(v) == "string" and string.sub(v, 1, m) or ""
		end
		for i = 1, math.min(8, #s.log) do
			local e = s.log[i]
			if type(e) == "table" then
				n.log[#n.log + 1] = { t = num(e.t, 0, -1e9, 1e9), kmh = num(e.kmh, 0, 0, 1000), ebs = num(e.ebs, 0, 0, 1000), zone = str(e.zone, 30), face = str(e.face, 12), obj = str(e.obj, 40) }
			end
		end
	end
	Damage.syncAggregates(n)
	return n
end

-- the old aggregate fields (body / tyres / suspension) stay meaningful for the HUD and the toasts
function Damage.syncAggregates(s)
	local z = 0
	for j = 1, 6 do z += s.zones[Damage.ZONES[j]] end
	s.body = z / 6
	local t, u = 0, 0
	for j = 1, 4 do
		local w = s.wheels[j]
		t += w.punct and 0 or math.min(w.tread, w.health)
		u += s.susp[j]
	end
	s.tyres, s.suspension = t / 4, u / 4
end

-- is anything on the car damaged (the Repair button)
function Damage.hurt(s)
	for _, k in ipairs(COMP_KEYS) do
		if s[k] < 99.9 then return true end
	end
	if #s.dents > 0 then return true end
	for j = 1, 4 do
		if s.lights[j] ~= 0 or s.glass[j] ~= 0 or s.rims[j] > 0.001 or s.wheels[j].tread < 99.9 then return true end
	end
	for _, k in ipairs(Damage.DP_KEYS) do
		if s.parts[k] > 0.001 then return true end
	end
	return false
end

-- ---- grip of one tyre (07d tyreMu): 1 = new and in its working range ----
function Damage.tyreMu(w)
	if w.punct then return 0.35 end
	local t = w.tread
	local tf = t >= 50 and 1 or t >= 5 and 0.78 + 0.22 * (t - 5) / 45 or 0.6 + 0.18 * t / 5
	local T = w.temp
	local hf = T <= 110 and 1 or cl(1 - (T - 110) / 180, 0.7, 1)
	local cf = w.health >= 60 and 1 or 0.75 + 0.25 * w.health / 60
	return tf * hf * cf
end

-- ---- effects on driving (Full only; F is filled in place, no allocation): 07c damageEffects + 07h dpEffects ----
function Damage.effects(s, car, mode, F)
	if mode ~= 2 or not s then
		F.maxSpeed, F.accel, F.steering, F.grip, F.brakes, F.lat, F.limp = 1, 1, 1, 1, 1, 1, 1
		F.pull, F.vib, F.roll = 0, 0, 0
		return F
	end
	local sp, W, mu = car.dmg, s.wheels, Damage.tyreMu
	local m0, m1, m2, m3 = mu(W[1]), mu(W[2]), mu(W[3]), mu(W[4])
	local muF, muR = (m0 + m1) / 2, (m2 + m3) / 2
	local muA = (muF + muR) / 2
	local muD = sp.drive == "FWD" and muF or sp.drive == "RWD" and muR or muA
	local sF, sR = (s.susp[1] + s.susp[2]) / 200, (s.susp[3] + s.susp[4]) / 200
	local sA = (sF + sR) / 2
	local hE, hT, hD, hS, hB = cl(s.engine / 100, 0, 1), cl(s.trans / 100, 0, 1), cl(s.driveline / 100, 0, 1), cl(s.steer / 100, 0, 1), cl(s.brakes / 100, 0, 1)
	local punct = W[1].punct or W[2].punct or W[3].punct or W[4].punct
	local limp = s.engTemp > 112 and cl(1 - (s.engTemp - 112) / 50, 0.55, 1) or 1
	F.limp = limp
	F.maxSpeed = cl((0.55 + 0.45 * math.pow(hE, 0.7)) * limp * (0.72 + 0.28 * hT) * (0.85 + 0.15 * sA) * (punct and 0.62 or 1), 0.4, 1)
	F.accel = cl((0.35 + 0.65 * math.pow(hE, 0.8)) * limp * (0.6 + 0.4 * hT) * (0.8 + 0.2 * hD) * (0.5 + 0.5 * muD), 0.3, 1)
	F.steering = cl((0.58 + 0.42 * hS) * math.pow(muF, 0.7) * (0.8 + 0.2 * sF), 0.45, 1)
	F.grip = cl(muA * (0.85 + 0.15 * sA), 0.35, 1)
	F.brakes = cl(0.5 + 0.5 * hB, 0.5, 1)
	F.lat = cl(muR * (0.75 + 0.25 * sR), 0.45, 1)
	-- pull (rad/s at speed, + = left): toe from wheel hits plus a punctured tyre dragging its side
	F.pull = (s.align[1] + s.align[2] + 0.5 * (s.align[3] + s.align[4])) * 0.012 + ((W[1].punct or W[3].punct) and 0.07 or 0) - ((W[2].punct or W[4].punct) and 0.07 or 0)
	F.vib = cl((punct and 0.8 or 0) + (1 - hD) * 0.6 + (1 - sA) * 0.5 + (1 - math.min(m0, m1, m2, m3)) * 0.4, 0, 1)
	F.roll = 0
	-- 07h: bent rims vibrate, pull and lose a little grip; a flat tyre drags (about ten times a healthy tyre's rolling resistance)
	local r = s.rims
	local b = (r[1] + r[2] + r[3] + r[4]) / 4
	F.vib = cl(F.vib + b * 0.5, 0, 1)
	F.pull += (r[1] - r[2]) * 0.03 + (r[3] - r[4]) * 0.015
	F.grip *= 1 - 0.08 * b
	local flats = 0
	for j = 1, 4 do
		if W[j].punct then flats += 1 end
	end
	F.roll = flats * 0.45
	return F
end

-- ---- the obstacle (07e objectImpact, the two kinds the Roblox map has: buildings and cars) ----
-- ob = {type = "solid" | "vehicle", hw, hd (half sizes, m), r (pole radius)} -> equivalent barrier speed, speed given away, label
local function objectImpact(ob, vn, mass)
	if ob and ob.type == "vehicle" then
		local m2 = 1400
		return vn * math.sqrt(m2 / (2 * (mass + m2))), 0, false, "Car"
	end
	return vn, 0, false, (ob and ob.r ~= nil) and "Structure" or "Wall"
end

-- ---- 07h dpImpact: bumpers, mirrors, lids, doors, glass cracks, rims (Cosmetic and Full). Returns the parts torn off. ----
local function crackAdd(s, j, u, v, sev)
	if sev <= 0 then return end
	local L = s.cracks[j]
	local near = nil
	for _, c in ipairs(L) do
		if hypot(c[1] - u, c[2] - v) < 0.22 then
			near = c
			break
		end
	end
	if near then
		near[3] = fix3(math.min(1, near[3] + sev))
	else
		L[#L + 1] = { fix3(u), fix3(v), fix3(math.min(1, sev)) }
		if #L > 3 then table.remove(L, 1) end
	end
end
local function dpImpact(s, sp, g, face, cx, cz, crush, kmh, tang)
	local q = s.parts
	local b4 = { bf = q.bf, br = q.br, ml = q.ml, mr = q.mr }
	local function add(k, v)
		if v > 0 then q[k] = cl(q[k] + v, 0, 1) end
	end
	local fi = face == "front" and 0 or face == "rear" and 1 or 2
	local sc = math.max(0, kmh - sp.thr[1]) * 0.006
	if face == "front" then
		add("bf", crush / 48 + sc)
		if crush > 58 then q.bf = 1 end
		add("hood", math.max(0, crush - 15) / 40)
	end
	if face == "rear" then
		add("br", crush / 44 + sc)
		if crush > 52 then q.br = 1 end
		add("trunk", math.max(0, crush - 14) / 38)
	end
	if fi == 2 then
		local sd = face == "left" and "l" or "r"
		if math.abs(cz) < g.L * 0.33 then add("d" .. sd, crush / 28 + sc * 0.5) end
		if cz > g.L * 0.36 then add("bf", crush / 70) end
		if cz < -g.L * 0.36 then add("br", crush / 70) end
		if math.abs(cz - (g.ws[1] - 0.08)) < 0.9 then add("m" .. sd, crush / 10 + (tang > 6 and 0.45 or 0) + sc) end
	end
	-- a scrape along a side (high tangential, low normal speed) takes the mirror on that side
	if fi < 2 and tang > 9 and math.abs(cx) > g.W * 0.35 then add(cx > 0 and "ml" or "mr", 0.35) end
	-- glass: crack origin in pane coordinates (u across, v up), merged with a nearby crack
	local ux = cl(0.5 - cx / g.W, 0.08, 0.92)
	if face == "front" and kmh > sp.thr[3] then crackAdd(s, 1, ux, 0.22 + math.min(0.5, crush / 180), (kmh - sp.thr[3]) / 35) end
	if face == "rear" and kmh > sp.thr[3] then crackAdd(s, 2, 1 - ux, 0.3, (kmh - sp.thr[3]) / 35) end
	if fi == 2 and crush > 6 and math.abs(cz) < g.L * 0.3 then
		local j = face == "left" and 3 or 4
		local span = g.ws[1] - (g.four and g.rs[1] or g.ws[1] - 1)
		if span == 0 then span = 1 end
		crackAdd(s, j, cl((g.ws[1] - cz) / span, 0.1, 0.9), 0.45, crush / 25)
	end
	for j = 1, 4 do
		local m = 0
		for _, c in ipairs(s.cracks[j]) do m = math.max(m, c[3]) end
		s.glass[j] = math.max(s.glass[j], m)
	end
	-- rims: a hard hit at a wheel bends the rim
	for j = 1, 4 do
		local wx = ((j - 1) % 2 == 0 and 1 or -1) * (g.W / 2 - 0.12)
		local wz = (j <= 2 and 1 or -1) * g.L * 0.31
		local wf = math.max(0, 1 - hypot(cx - wx, cz - wz) / 1.0)
		local wk = kmh * wf
		if wk > 18 then s.rims[j] = cl(s.rims[j] + (wk - 18) / 40, 0, 1) end
	end
	local torn = {}
	for _, k in ipairs({ "bf", "br", "ml", "mr" }) do
		if q[k] >= 1 and b4[k] < 1 then torn[#torn + 1] = k end
	end
	return torn
end

-- ---- an impact (07c registerPlayerImpact) ----
-- c = {v (normal closing speed m/s), ob (obstacle), nx, nz (contact normal from the obstacle to the car), x, z, h, vx, vz (the car), t (s)}
-- -> nil when nothing was recorded, else {gave, face, kmh, ebs, crush, zone, label, toast, torn = {parts torn off}, cx, cz}
function Damage.impact(s, car, mode, c)
	if mode == 0 or not (c.v == c.v) or c.v < 2.8 then return nil end
	local sp, t = car.dmg, c.t
	-- one hit per contact interval (pressed against a wall it is not counted every frame)
	if t - s.lastHit < 0.48 and hypot(c.x - s.lastX, c.z - s.lastZ) < 2.8 then return nil end
	s.lastHit, s.lastX, s.lastZ = t, c.x, c.z
	s.impacts = (s.impacts or 0) + 1
	local ebs, gave, broke, label = objectImpact(c.ob, c.v, sp.mass)
	local kmh = ebs * 3.6
	-- the contact point on the car's outline, in car-local metres (+x = the car's left, +z = forward)
	local sh, ch = math.sin(c.h), math.cos(c.h)
	local dx, dz = -(c.nx or 0), -(c.nz or 0)
	local lf, lr = dx * sh + dz * ch, dx * -ch + dz * sh
	local X, Z = -lr, lf
	local L, W = sp.L, sp.W
	local tX = math.abs(X) > 1e-6 and W / 2 / math.abs(X) or 1e9
	local tZ = math.abs(Z) > 1e-6 and L / 2 / math.abs(Z) or 1e9
	local tt = math.min(tX, tZ)
	local cx, cz = X * tt, Z * tt
	local face = tZ <= tX and (Z > 0 and "front" or "rear") or (X > 0 and "left" or "right")
	local fi = face == "front" and 0 or face == "rear" and 1 or 2
	local crush = math.max(0, kmh - sp.b0[fi + 1]) / sp.b1[fi + 1]
	-- contact area: a pole concentrates the load (narrow, deeper dent), a wall or a car spreads it (wider, shallower)
	local ob = c.ob
	local narrow = ob ~= nil and ob.r ~= nil and ob.r < 0.7
	local wide = ob ~= nil and (ob.type == "vehicle" or (ob.hw or 0) > 2.5 or (ob.hd or 0) > 2.5)
	local dk = narrow and 1.3 or wide and 0.85 or 1
	local rk = narrow and 0.6 or wide and 1.2 or 1
	local vn0 = c.vx * (c.nx or 0) + c.vz * (c.nz or 0)
	local tang = hypot(c.vx - vn0 * (c.nx or 0), c.vz - vn0 * (c.nz or 0))
	-- spread over the zones by distance from the contact point
	local best, bw = "", 0
	local maxC = sp.maxC[fi + 1]
	local scuff = kmh > sp.thr[1] and math.min(2.5, (kmh - sp.thr[1]) * 0.25) or 0
	for _, zc in ipairs(ZC) do
		local z = zc[1]
		local d = hypot(cx - W * zc[2], cz - L * zc[3])
		local w = math.exp(-((d / (0.8 + crush / 200)) ^ 2))
		if w > bw then bw, best = w, z end
		if w > 0.05 then s.zones[z] = cl(s.zones[z] - (crush / maxC * 100 + scuff) * w, 0, 100) end
	end
	-- a dent at the contact point (merged with a nearby earlier dent; at most 16, the deepest kept)
	if crush > 1.5 then
		local depth = math.min(fi == 2 and 0.3 or 0.5, crush / 100 * 0.8 * dk)
		local rad = (0.42 + math.min(0.9, crush / 100 * 0.9)) * rk
		local il = hypot(cx, cz)
		if il == 0 then il = 1 end
		local d = { fix3(cx), 0.55, fix3(cz), fix3(-cx / il), fix3(-cz / il), fix3(depth), fix3(rad) }
		local near = nil
		for _, q in ipairs(s.dents) do
			if hypot(q[1] - d[1], q[3] - d[3]) < 0.35 then
				near = q
				break
			end
		end
		if near then
			near[6] = fix3(math.min(fi == 2 and 0.32 or 0.52, hypot(near[6], d[6])))
			near[7] = math.max(near[7], d[7])
		else
			s.dents[#s.dents + 1] = d
			if #s.dents > 16 then
				-- the web game's stable sort by depth (deepest first), then the first 16
				local idx = {}
				for i, q in ipairs(s.dents) do idx[i] = { q, i } end
				table.sort(idx, function(a, b)
					if a[1][6] ~= b[1][6] then return a[1][6] > b[1][6] end
					return a[2] < b[2]
				end)
				local keep = {}
				for i = 1, 16 do keep[i] = idx[i][1] end
				s.dents = keep
			end
		end
	end
	-- lights (visible, so recorded in Cosmetic and Full)
	if kmh > sp.thr[2] then
		local lx = W * 0.33
		if face == "front" or face == "rear" or math.abs(cz) > L * 0.36 then
			local base = cz > 0 and 1 or 3
			for sd = 0, 1 do
				local sx = sd == 0 and lx or -lx
				if math.abs(cx - sx) < 0.55 + crush / 100 then s.lights[base + sd] = 1 end
			end
		end
	end
	local torn = dpImpact(s, sp, car.geo, face, cx, cz, crush, kmh, tang)
	if mode == 2 then
		local cc = sp.comp
		local center = 1 - math.min(1, math.abs(cx) / (W / 2)) * 0.5
		-- the radiator sits behind the front bumper (air-cooled cars: at the engine)
		local coolFace = sp.air and (sp.eng == "F" and "front" or "rear") or "front"
		if face == coolFace then s.cooling = cl(s.cooling - math.max(0, crush - 8) * 1.6 * center / cc.cooling, 0, 100) end
		local engFace = sp.eng == "F" and "front" or "rear"
		local engDepth = sp.eng == "F" and 22 or sp.eng == "M" and 30 or 18
		if face == engFace then s.engine = cl(s.engine - math.max(0, crush - engDepth) * 1.4 * center / cc.engine, 0, 100) end
		if fi == 2 and sp.eng == "M" and cz < -L * 0.05 then s.engine = cl(s.engine - math.max(0, crush - 20) * 0.8 / cc.engine, 0, 100) end
		if (face == "front" and sp.eng == "F" and crush > 40) or (face == "rear" and sp.eng ~= "F" and crush > 25) then
			s.trans = cl(s.trans - (crush - (face == "front" and 40 or 25)) * 0.8 / cc.trans, 0, 100)
		end
		-- wheels within reach of the contact point (or behind a deep front / rear crush): tyre, suspension, brakes, steering, alignment
		local reach = L / 2 - L * 0.31 - 0.3
		for j = 1, 4 do
			local wx = ((j - 1) % 2 == 0 and 1 or -1) * (W / 2 - 0.12)
			local wz = (j <= 2 and 1 or -1) * L * 0.31
			local wf = math.max(0, 1 - hypot(cx - wx, cz - wz) / 1.0)
			if fi < 2 and (j <= 2) == (face == "front") and crush / 100 > reach then wf = math.max(wf, math.min(1, (crush / 100 - reach) / 0.4)) end
			if wf > 0 then
				local wk = kmh * wf
				local w = s.wheels[j]
				w.health = cl(w.health - wk * 1.1 / sp.tyre.dur, 0, 100)
				if wk > 32 or w.health < 12 then w.punct = true end
				s.susp[j] = cl(s.susp[j] - math.max(0, wk - 6) * 1.6 / cc.susp, 0, 100)
				s.brakes = cl(s.brakes - math.max(0, wk - 15) * 0.4 / cc.brakes, 0, 100)
				local toe = math.max(0, wk - 8) * 0.06 * (fi == 2 and (face == "left" and -1 or 1) or ((j - 1) % 2 == 0 and 1 or -1))
				s.align[j] = cl(s.align[j] + toe, -6, 6)
				if j <= 2 then s.steer = cl(s.steer - math.max(0, wk - 10) * 1.0 / cc.steer, 0, 100) end
			end
		end
	end
	Damage.syncAggregates(s)
	table.insert(s.log, 1, { t = jsround(t), kmh = jsround(c.v * 3.6), ebs = jsround(kmh), zone = Damage.ZONE_NAMES[best] or best, face = face, obj = label })
	while #s.log > 8 do table.remove(s.log) end
	local toast = (broke and ("💥 " .. label .. " broke · ") or gave > 0 and (label .. " shoved · ") or "Impact · ") .. jsround(c.v * 3.6) .. " km/h · "
		.. (Damage.ZONE_NAMES[best] or face) .. " · body condition " .. jsround(s.body) .. "%" .. (mode == 2 and (" · engine " .. jsround(s.engine) .. "%") or "")
	return { gave = gave, face = face, kmh = jsround(c.v * 3.6), ebs = kmh, crush = crush, zone = best, label = label, toast = toast, torn = torn, cx = cx, cz = cz }
end

-- ---- a hard landing (ramps, crests): vy = vertical speed just before touchdown (07c registerLanding) -> toast or nil ----
function Damage.landing(s, car, mode, vy, t)
	if mode == 0 or vy > -5.5 then return nil end
	local sp = car.dmg
	local e = -vy - 5.5
	local cc = sp.comp
	s.zones.u = cl(s.zones.u - e * 6, 0, 100)
	if mode == 2 then
		for j = 1, 4 do
			s.susp[j] = cl(s.susp[j] - e * 7 / cc.susp, 0, 100)
			s.wheels[j].health = cl(s.wheels[j].health - e * 2 / sp.tyre.dur, 0, 100)
		end
		s.driveline = cl(s.driveline - math.max(0, -vy - 8) * 4 / cc.driveline, 0, 100)
		s.trans = cl(s.trans - math.max(0, -vy - 9) * 3 / cc.trans, 0, 100)
		s.engine = cl(s.engine - math.max(0, -vy - 10) * 3 / cc.engine, 0, 100)
	end
	Damage.syncAggregates(s)
	table.insert(s.log, 1, { t = jsround(t), kmh = jsround(-vy * 3.6), ebs = 0, zone = "underbody", face = "landing", obj = "hard landing" })
	while #s.log > 8 do table.remove(s.log) end
	return "Hard landing · " .. jsround(-vy * 3.6) .. " km/h vertical · check suspension"
end

-- ---- a speed bump taken too fast: sev from the quarter-car (bump stop / damper speed), axle 0 front / 1 rear (07c) -> toast or nil ----
function Damage.speedBump(s, car, mode, speed, sev, axle)
	if mode == 0 then return nil end
	sev = cl(sev == nil and (speed - 11) * 0.12 or sev, 0, 3)
	if sev <= 0 then return nil end
	local sp = car.dmg
	local J = axle == 1 and { 3, 4 } or axle == 0 and { 1, 2 } or { 1, 2, 3, 4 }
	s.zones.u = cl(s.zones.u - sev * 2.2, 0, 100)
	if mode == 2 then
		for _, j in ipairs(J) do
			s.susp[j] = cl(s.susp[j] - sev * 3 / sp.comp.susp, 0, 100)
			s.wheels[j].health = cl(s.wheels[j].health - sev * 1.4 / sp.tyre.dur, 0, 100)
			if sev > 2.2 and s.wheels[j].health < 30 then s.wheels[j].punct = true end
		end
	end
	Damage.syncAggregates(s)
	return sev > 1.2 and "Hard speed-bump impact: suspension bottomed out" or "Speed bump taken too fast"
end
-- the suspension travel before the bump stop, by body type (07c suspTravel)
function Damage.suspTravel(k)
	return (k == "r" or k == "m" or k == "q") and 0.05 or (k == "s" or k == "p" or k == "v") and 0.11 or 0.075
end

-- ---- engine temperature (Full): a damaged radiator cannot reject the heat of sustained throttle (07c damageTick) ----
-- -> true when the engine smokes (badly damaged or overheating)
function Damage.engineTick(s, mode, thr, dt)
	if mode ~= 2 then return false end
	local c = s.cooling / 100
	local heat = thr * ((1 - c) * 6 + 0.4)
	local cool = (s.engTemp - 90) * (0.02 + 0.08 * c)
	s.engTemp = cl(s.engTemp + (heat - cool) * dt, 60, 140)
	if s.engTemp > 125 then s.engine = cl(s.engine - (s.engTemp - 125) * 0.02 * dt, 0, 100) end
	return s.engine < 28 or s.engTemp > 118
end

-- ---- tyres (07d): burnouts, then per-wheel load, slip, heat and wear every frame (Cosmetic and Full) ----
function Damage.newTyreState()
	return { thr = 0, burn = false, burnT = 0, h0 = nil, yaw = 0, fz = { 0, 0, 0, 0 }, sl = { 0, 0, 0, 0 }, sa = { 0, 0, 0, 0 }, pw = { 0, 0, 0, 0 }, mu = { 1, 1, 1, 1 } }
end
-- throttle + brake (FWD: + handbrake) at a standstill burns out when the drivetrain beats the driven wheels' grip plus what holds them
-- p = {gnd, bk, a0}; sfc = the surface grip; dfxAccel = damage effect on acceleration (Full)
function Damage.burnoutState(T, car, mode, th, thA, br, brA, hb, fs, p, sfc, dfxAccel)
	T.burn = false
	if mode == 0 or not th or not p.gnd or math.abs(fs) > 2.5 or not (br or hb) then return false end
	local sp = car.dmg
	local m, g = sp.mass, 9.81
	local Ff, Fr = m * g * sp.fw * sfc, m * g * (1 - sp.fw) * sfc
	local b = br and (brA ~= 0 and brA or 1) or 0
	local holdF = 0.68 * m * p.bk * b
	local holdR = 0.32 * m * p.bk * b + (hb and 0.22 * m * g or 0)
	local Fd = m * p.a0 * 1.8 * (thA ~= 0 and thA or 1) * (mode == 2 and dfxAccel or 1)
	local need = sp.drive == "FWD" and Ff + holdF or sp.drive == "RWD" and Fr + holdR or Ff + Fr + holdF + holdR
	T.burn = Fd > need
	return T.burn
end
local TYRE_AMB, TY_WEAR, TY_HEAT = 25, 5.5e-5, 6e-4
-- the web game keeps the wheel loads in a Float32Array (TYS.fz): each load is rounded to a 32-bit float before it is used
local function f32(x)
	return (string.unpack("<f", string.pack("<f", x)))
end
Damage.f32 = f32
-- p = {gnd, h, al, a0, vm, bk}; -> the index (1-4) of a tyre that just failed, or nil. T.smoke = slip of each wheel for the smoke.
function Damage.tyreStep(T, s, car, mode, dt, thr, brk, hb, fs, ls, frozen, p, sfc)
	T.thr = thr
	if mode == 0 or not (dt > 0) then return nil end
	local sp, W = car.dmg, s.wheels
	local m, g, au = sp.mass, 9.81, math.abs(fs)
	if not p.gnd or frozen then
		for j = 1, 4 do
			local w = W[j]
			w.temp = math.max(TYRE_AMB, w.temp - (w.temp - TYRE_AMB) * 0.05 * dt)
		end
		T.h0, T.burn = p.h, false
		return nil
	end
	if T.h0 == nil then T.h0 = p.h end
	local dh = p.h - T.h0
	local r = math.atan2(math.sin(dh), math.cos(dh)) / dt
	T.h0, T.yaw = p.h, r
	local v, road = -ls, sfc >= 1
	local ax, ay = cl(p.al, -12, 12), cl(fs * r, -12, 12)
	local dX, dY = m * ax * sp.hcg / sp.wb, m * ay * sp.hcg / sp.tr
	local sf, sr = m * g * sp.fw / 2, m * g * (1 - sp.fw) / 2
	local F = T.fz
	-- load per wheel: accelerating moves load rearward, a left turn (ay > 0) moves it to the right-hand wheels
	F[1], F[2], F[3], F[4] = f32(sf - dX / 2 - dY / 2), f32(sf - dX / 2 + dY / 2), f32(sr + dX / 2 - dY / 2), f32(sr + dX / 2 + dY / 2)
	for j = 1, 4 do
		if F[j] < 50 then F[j] = 50 end
	end
	-- lateral slip velocity: rear axle from sideslip + yaw; the fronts slip less while counter-steering a slide (estimate)
	local vr = math.abs(v - r * sp.wb / 2)
	local slide = math.abs(math.atan2(v, au + 0.5)) > 0.15
	local vf = slide and vr * 0.55 or vr
	local latG = math.min(1, math.abs(ay) / g)
	local dF, dR = sp.drive ~= "RWD", sp.drive ~= "FWD"
	local nd = (dF and 2 or 0) + (dR and 2 or 0)
	local spin = T.burn and cl(p.a0 * 2.4, 5, 24) * thr or 0
	local demand = (thr > 0 and not T.burn) and m * p.a0 * 1.8 * thr * math.max(0, 1 - math.pow(math.max(fs, 0) / (p.vm * 1.05), 2.5)) or 0
	if T.burn then T.burnT += dt end
	local blown = nil
	for j = 1, 4 do
		local front = j <= 2
		local isD = front and dF or (not front and dR)
		local w = W[j]
		local mu = Damage.tyreMu(w) * sfc
		local cap = mu * F[j]
		T.mu[j] = mu
		local sl, fl = 0, 0
		if isD and T.burn then
			sl, fl = spin, cap
		elseif isD and demand > 0 then
			local e = demand / nd - cap
			if e > 0 then sl, fl = math.min(18, e / cap * 6), cap end
		end
		if not front and hb and au > 1 then
			-- the handbrake locks the rear wheels
			sl, fl = math.max(sl, au), cap
		elseif brk > 0.6 and au > 3 and not T.burn then
			-- ABS-limited braking slip
			sl = math.max(sl, 0.08 * au)
			fl = math.max(fl, F[j] * math.min(1, p.bk * brk / g))
		end
		local sa = front and vf or vr
		local fa = slide and cap or F[j] * math.min(mu, latG)
		local pl, pa = fl * sl, fa * sa
		local pw = pl + pa
		T.sl[j], T.sa[j], T.pw[j] = sl, sa, pw
		-- heat: slip power in; convection (faster when rolling) and a steep loss above 150 C out
		w.temp = cl(w.temp + (pw * TY_HEAT * sp.tyre.heat * (road and 1 or 0.8) - (w.temp - TYRE_AMB) * (0.05 + 0.006 * au) - math.max(0, w.temp - 150) * 0.5) * dt, TYRE_AMB - 5, 320)
		-- wear: strongly non-linear in slip power and faster when hot; unpaved ground adds more; plus a tiny rolling wear per metre
		local tm = 1 + math.max(0, (w.temp - 90) / 45) ^ 2
		local kw = math.pow(pw / 1000, 2) * TY_WEAR * tm * (road and 1 or 1.6) / sp.tyre.dur * dt
		local roll = au * dt * 2.5e-6 * (road and 1 or 3)
		w.tread = math.max(0, w.tread - kw - roll)
		w.wear.roll += roll
		w.km += au * dt / 1000
		if w.temp > w.tmax then w.tmax = w.temp end
		if kw > 0 then
			local fa2 = pa / (pw ~= 0 and pw or 1)
			local lw = kw * (1 - fa2)
			w.wear.slide += kw * fa2
			if T.burn and isD then
				w.wear.burn += lw
			elseif not front and hb and au > 1 then
				w.wear.lock += lw
			else
				w.wear.spin += lw
			end
		end
		-- the carcass suffers once the tread is gone or the rubber blisters; below 10 % it fails (blow-out)
		if w.tread < 3 and pw > 2000 then w.health = math.max(0, w.health - pw / 1000 * 0.25 * dt) end
		if w.temp > 230 then w.health = math.max(0, w.health - (w.temp - 230) * 0.05 * dt) end
		if not w.punct and w.health < 10 then
			w.punct = true
			blown = j
		end
	end
	if blown then Damage.syncAggregates(s) end
	return blown
end

-- ---- diagnostics rows (07f diagRows): {label, condition %, effect text} ----
function Damage.diagRows(s, car, full)
	local sp = car.dmg
	local ev = sp.ev
	local rows = {}
	local function eff(t)
		return full and t or "visual only in Cosmetic mode"
	end
	local lim = s.engTemp > 112 and cl(1 - (s.engTemp - 112) / 50, 0.55, 1) or 1
	local hE, hT = s.engine / 100, s.trans / 100
	rows[#rows + 1] = { ev and "Motor / inverter" or "Engine", s.engine, eff("power −" .. jsround((1 - (0.35 + 0.65 * math.pow(hE, 0.8)) * lim) * 100) .. "%" .. (s.engine < 28 and " · smoking" or "")) }
	rows[#rows + 1] = { ev and "Battery & motor cooling" or "Cooling (radiator)", s.cooling, eff((ev and "drive unit " or "engine ") .. jsround(s.engTemp) .. " °C"
		.. (s.cooling < 70 and " · overheats under sustained throttle" or "") .. (lim < 1 and (" · power limited " .. jsround((1 - lim) * 100) .. "%") or "")) }
	rows[#rows + 1] = { ev and "Reduction gear" or "Transmission", s.trans, eff("top speed −" .. jsround((1 - (0.72 + 0.28 * hT)) * 100) .. "%, acceleration −" .. jsround((1 - (0.6 + 0.4 * hT)) * 100) .. "%") }
	rows[#rows + 1] = { "Driveline", s.driveline, eff(s.driveline < 90 and ("vibration, acceleration −" .. jsround((1 - (0.8 + 0.2 * s.driveline / 100)) * 100) .. "%") or "no effect") }
	rows[#rows + 1] = { "Steering", s.steer, eff("steering response −" .. jsround((1 - (0.58 + 0.42 * s.steer / 100)) * 100) .. "%") }
	rows[#rows + 1] = { "Brakes", s.brakes, eff("braking −" .. jsround((1 - (0.5 + 0.5 * s.brakes / 100)) * 100) .. "%") }
	for j = 1, 4 do
		rows[#rows + 1] = { "Suspension " .. Damage.WHEEL_NAMES[j], s.susp[j], eff(s.susp[j] < 60 and "camber/instability, less grip" or s.susp[j] < 95 and "slightly softer" or "no effect") }
	end
	local toe = s.align[1] + s.align[2] + 0.5 * (s.align[3] + s.align[4])
	rows[#rows + 1] = { "Wheel alignment", 100 - math.min(100, math.abs(toe) * 25), eff(math.abs(toe) < 0.05 and "straight" or ("pulls " .. (toe > 0 and "left" or "right") .. " (toe " .. string.format("%.1f", toe) .. "°)")) }
	return rows
end

-- ---- the repair bay (08d): items with prices (base + per % lost, x the rarity tier), repairing one item ----
Damage.REP_TIER = { 1, 1.25, 1.6, 2.1, 2.8 }
local REP_ZN = { fl = "Front-left panels (bumper, wing)", fr = "Front-right panels (bumper, wing)", l = "Left side panels (doors, sill)", r = "Right side panels (doors, sill)",
	rl = "Rear-left panels (bumper, quarter)", rr = "Rear-right panels (bumper, quarter)", roof = "Roof", u = "Underbody / floor" }
local function cap1(s)
	return string.upper(string.sub(s, 1, 1)) .. string.sub(s, 2)
end
-- the zone of a dent: the nearest zone centre
local function dentZone(d, sp)
	local b, bd = "", 1e9
	for _, zc in ipairs(ZC) do
		local q = hypot(d[1] - zc[2] * sp.W, d[3] - zc[3] * sp.L)
		if q < bd then bd, b = q, zc[1] end
	end
	return b
end
local function hasZC(z)
	return z ~= "roof" and z ~= "u"
end
function Damage.repairItems(s, car)
	local sp = car.dmg
	local cf = Damage.REP_TIER[(car.tier or 0) + 1]
	local it = {}
	local function pr(b, k, loss)
		return jsround((b + k * loss) * cf)
	end
	local dr = Damage.diagRows(s, car, true)
	for _, z in ipairs(Damage.ZONES) do
		local loss = 100 - s.zones[z]
		local nd = 0
		if hasZC(z) then
			for _, d in ipairs(s.dents) do
				if dentZone(d, sp) == z then nd += 1 end
			end
		end
		if not (loss < 0.5 and nd == 0) then
			it[#it + 1] = { id = "z:" .. z, grp = "Body", label = REP_ZN[z], cond = s.zones[z],
				eff = (nd > 0 and (nd .. " dent" .. (nd > 1 and "s" or "") .. " · ") or "") .. (z == "u" and "scrapes from landings / bumps" or "scuffs"), price = pr(30, 4, loss) }
		end
	end
	for j = 1, 4 do
		if s.lights[j] ~= 0 then it[#it + 1] = { id = "li:" .. (j - 1), grp = "Body", label = cap1(Damage.LIGHT_NAMES[j]), cond = 0, eff = "broken", price = pr(35, 0, 0) } end
	end
	for _, k in ipairs(Damage.DP_KEYS) do
		local v = s.parts[k]
		if v >= 0.005 then
			local c1 = string.sub(k, 1, 1)
			it[#it + 1] = { id = "p:" .. k, grp = "Body", label = Damage.DP_NAMES[k], cond = 100 - v * 100,
				eff = (v >= 1 and c1 ~= "h" and c1 ~= "t" and c1 ~= "d") and "torn off · replace" or v > 0.6 and "badly damaged · replace" or v > 0.3 and "cracked / bent" or "scuffed",
				price = pr(c1 == "m" and 40 or c1 == "b" and 70 or (k == "hood" or k == "trunk") and 80 or 90, c1 == "m" and 0.6 or 1.2, v * 100) }
		end
	end
	for j = 1, 4 do
		if s.glass[j] > 0 then it[#it + 1] = { id = "gl:" .. (j - 1), grp = "Body", label = cap1(Damage.GLASS_NAMES[j]), cond = 100 - s.glass[j] * 100, eff = "cracked", price = pr(j <= 2 and 90 or 50, 0, 0) } end
	end
	for _, q in ipairs({ { "engine", 1, 60, 6 }, { "cooling", 2, 25, 2.5 }, { "trans", 3, 50, 5 }, { "driveline", 4, 30, 3 }, { "steer", 5, 30, 3 }, { "brakes", 6, 20, 2.5 } }) do
		local k = q[1]
		local loss = 100 - s[k]
		if loss >= 0.5 then it[#it + 1] = { id = "c:" .. k, grp = "Mechanical", label = dr[q[2]][1], cond = s[k], eff = dr[q[2]][3], price = pr(q[3], q[4], loss) } end
	end
	for j = 1, 4 do
		local loss = 100 - s.susp[j]
		local al = math.abs(s.align[j]) > 0.01
		if not (loss < 0.5 and not al) then
			it[#it + 1] = { id = "s:" .. (j - 1), grp = "Suspension", label = "Suspension " .. Damage.WHEEL_NAMES[j] .. (al and " + alignment" or ""), cond = s.susp[j],
				eff = dr[6 + j][3] .. (al and (" · toe " .. string.format("%.1f", s.align[j]) .. "°") or ""), price = pr(25, 2.5, loss) + (al and jsround(20 * cf) or 0) }
		end
	end
	for j = 1, 4 do
		local w = s.wheels[j]
		local c = w.punct and 0 or math.min(w.tread, w.health)
		if not (c > 99.5 and w.temp < 200) then
			it[#it + 1] = { id = "t:" .. (j - 1), grp = "Tyres", label = "Tyre " .. Damage.WHEEL_NAMES[j], cond = c,
				eff = w.punct and "punctured" or ("tread " .. jsround(w.tread) .. "% · carcass " .. jsround(w.health) .. "%"), price = pr(45, 0, 0) }
		end
	end
	for j = 1, 4 do
		if s.rims[j] > 0.005 then
			it[#it + 1] = { id = "rim:" .. (j - 1), grp = "Tyres", label = "Rim " .. Damage.WHEEL_NAMES[j], cond = 100 - s.rims[j] * 100,
				eff = s.rims[j] > 0.5 and "bent · replace" or "buckled · straighten", price = pr(40, 1.1, s.rims[j] * 100) }
		end
	end
	return it
end
-- apply one repair (no charge here: the server charges) -> true when the id was known
function Damage.repairPart(s, car, id)
	local k, a = string.match(id, "^(%a+):(.+)$")
	if not k then return false end
	local j = tonumber(a)
	local sp = car.dmg
	if k == "z" and s.zones[a] then
		s.zones[a] = 100
		if hasZC(a) then
			local keep = {}
			for _, d in ipairs(s.dents) do
				if dentZone(d, sp) ~= a then keep[#keep + 1] = d end
			end
			s.dents = keep
		end
	elseif k == "li" and j and s.lights[j + 1] then
		s.lights[j + 1] = 0
	elseif k == "gl" and j and s.glass[j + 1] then
		s.glass[j + 1] = 0
		s.cracks[j + 1] = {}
	elseif k == "p" and s.parts[a] then
		s.parts[a] = 0
	elseif k == "rim" and j and s.rims[j + 1] then
		s.rims[j + 1] = 0
	elseif k == "c" and s[a] and a ~= "body" then
		s[a] = 100
		if a == "cooling" or a == "engine" then s.engTemp = 90 end
	elseif k == "s" and j and s.susp[j + 1] then
		s.susp[j + 1] = 100
		s.align[j + 1] = 0
	elseif k == "t" and j and s.wheels[j + 1] then
		s.wheels[j + 1] = Damage.newWheel()
	else
		return false
	end
	Damage.syncAggregates(s)
	return true
end
-- every part's condition, damaged or not, with its price when it needs work (08d inspectRows)
function Damage.inspectRows(s, car)
	local it, R = {}, {}
	for _, q in ipairs(Damage.repairItems(s, car)) do it[q.id] = q end
	local function add(id, grp, label, cond)
		R[#R + 1] = { id = id, grp = grp, label = label, cond = it[id] and it[id].cond or cond, price = it[id] and it[id].price or 0 }
	end
	for _, z in ipairs(Damage.ZONES) do add("z:" .. z, "Body", REP_ZN[z], s.zones[z]) end
	for j = 1, 4 do add("li:" .. (j - 1), "Body", cap1(Damage.LIGHT_NAMES[j]), s.lights[j] ~= 0 and 0 or 100) end
	for _, k in ipairs(Damage.DP_KEYS) do add("p:" .. k, "Body", Damage.DP_NAMES[k], 100 - s.parts[k] * 100) end
	for j = 1, 4 do add("gl:" .. (j - 1), "Body", cap1(Damage.GLASS_NAMES[j]), 100 - s.glass[j] * 100) end
	for _, q in ipairs({ { "engine", "Engine" }, { "cooling", "Cooling / radiator" }, { "trans", "Gearbox" }, { "driveline", "Driveline" }, { "steer", "Steering" }, { "brakes", "Brakes" } }) do
		add("c:" .. q[1], "Mechanical", q[2], s[q[1]])
	end
	for j = 1, 4 do add("s:" .. (j - 1), "Suspension", "Suspension " .. Damage.WHEEL_NAMES[j], s.susp[j]) end
	for j = 1, 4 do
		local w = s.wheels[j]
		add("t:" .. (j - 1), "Tyres", "Tyre " .. Damage.WHEEL_NAMES[j], w.punct and 0 or math.min(w.tread, w.health))
	end
	for j = 1, 4 do add("rim:" .. (j - 1), "Tyres", "Rim " .. Damage.WHEEL_NAMES[j], 100 - s.rims[j] * 100) end
	return R
end

return Damage
