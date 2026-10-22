-- Irbid Drive (Roblox) - the web game's roadside objects as a PURE module (no Roblox services): the colliders of 05b_decor.js (addCol /
-- removeCol / colB: circles and turned boxes in 100 m cells, the car pushed out and bounced with factor 1.4) and the object rules of
-- 07e_objects.js (OBJ_CLASS, objectImpact, materialImpact, the sliding dumpsters of objectsTick), line for line. tests/damage_equiv.js runs
-- it next to the web build. The client draws what happens (Client/Objects.lua: poles and trees fall, signs bend, dumpsters slide, rails
-- deflect); this module only decides it.
-- Classes: breakable (street lights, utility poles, road signs: bend above `bend` x their break energy, snap above it), movable (dumpsters:
-- shoved, may tip), tree (wood: accumulates damage, only slim trunks fall), masonry (garden walls), deflect (guardrails), rigid (the rest).
-- breakAt = the speed (m/s) at which a 1,500 kg car breaks it (energy based: heavier cars break it sooner). EVERY mass and threshold is the
-- web game's gameplay ESTIMATE (OSM has no material data for these props). With vehicle damage Off every object is rigid, as in the web game.
local Objects = {}

local function cl(v, a, b)
	return v < a and a or v > b and b or v
end
local function hypot(a, b)
	return math.sqrt(a * a + b * b)
end

Objects.CLASS = {
	streetLight = { cls = "breakable", label = "Street light", mass = 180, breakAt = 17, bend = 0.3 },
	utilityPole = { cls = "breakable", label = "Utility pole", mass = 450, breakAt = 12.5, bend = 0.35 },
	sign = { cls = "breakable", label = "Road sign", mass = 25, breakAt = 4.5, bend = 0.35 },
	bin = { cls = "movable", label = "Dumpster", mass = 160 },
	guardrail = { cls = "deflect", label = "Guardrail" },
	busShelter = { cls = "rigid", label = "Bus shelter", glass = true },
	tree = { cls = "tree", label = "Tree" },
	gardenWall = { cls = "masonry", label = "Garden wall" },
	monument = { cls = "rigid", label = "Monument" },
	structure = { cls = "rigid", label = "Structure" },
	solid = { cls = "rigid", label = "Wall" },
	vehicle = { cls = "vehicle", label = "Car", mass = 1400 },
	speedBump = { cls = "traversable", label = "Speed bump" },
}
local CLASS = Objects.CLASS
function Objects.class(o)
	return CLASS[o and o.type] or ((o and o.r ~= nil) and CLASS.structure or CLASS.solid)
end
local objClass = Objects.class
local function breakEnergy(o, c)
	local v = o.breakAt or c.breakAt or 99
	return 0.5 * 1500 * v * v
end
function Objects.treeBreakV(o)
	return 30 * math.pow(math.max(0.1, o.trunkD or 0.5) / 0.3, 1.5)
end

-- ---- the collider cells (05b addCol / removeCol), 100 m, keyed like the web game ----
local cells = {}
Objects.cells = cells
local function ck(i, j)
	return (i + 1000) * 10000 + (j + 1000)
end
function Objects.add(c)
	local R = (c.r ~= nil and c.r or hypot(c.hw, c.hd)) + 3
	c.cells = {}
	for i = math.floor((c.x - R) / 100), math.floor((c.x + R) / 100) do
		for j = math.floor((c.z - R) / 100), math.floor((c.z + R) / 100) do
			local k = ck(i, j)
			local L = cells[k]
			if not L then
				L = {}
				cells[k] = L
			end
			L[#L + 1] = c
			c.cells[#c.cells + 1] = k
		end
	end
	return c
end
function Objects.remove(c)
	if not c or c.broken then return end
	c.broken = true
	for _, k in ipairs(c.cells or {}) do
		local L = cells[k]
		if L then
			local i = table.find(L, c)
			if i then table.remove(L, i) end
			if #L == 0 then cells[k] = nil end
		end
	end
end
function Objects.near(x, z)
	return cells[ck(math.floor(x / 100), math.floor(z / 100))]
end

-- the exported rows (make_roblox.js): type, x, z (cm), r or hw, hd (cm, -1 = circle), heading (1e-4 rad), break speed (cm/s), height (cm),
-- trunk diameter (mm), canopies, visual, pole height, pole base y (cm), wall height (cm)
Objects.list = {}
function Objects.load(mods)
	for _, d in ipairs(mods) do
		local v, w = {}, d.w
		for n in string.gmatch(d.rows, "-?%d+") do v[#v + 1] = tonumber(n) end
		for i = 1, #v, w do
			local t = d.types[v[i] + 1]
			local c = { id = #Objects.list + 1, type = t ~= "-" and t or nil, x = v[i + 1] / 100, z = v[i + 2] / 100 }
			if v[i + 4] < 0 then
				c.r = v[i + 3] / 100
			else
				local h = v[i + 5] / 1e4
				c.hw, c.hd, c.c, c.s = v[i + 3] / 100, v[i + 4] / 100, math.cos(h), math.sin(h)
			end
			if v[i + 6] > 0 then c.breakable, c.breakAt = true, v[i + 6] / 100 end
			if v[i + 7] > 0 then c.height = v[i + 7] / 100 end
			if v[i + 8] > 0 then c.trunkD = v[i + 8] / 1000 end
			if v[i + 9] > 0 then c.canopies = v[i + 9] end
			if v[i + 10] == 1 then c.visual, c.vh, c.vy = true, v[i + 11] / 100, v[i + 12] / 100 end
			if v[i + 13] > 0 then c.wallH = v[i + 13] / 100 end
			Objects.list[c.id] = c
			Objects.add(c)
		end
	end
end

-- ---- colB: push a car out of the first collider it overlaps (q = its radius: the player 2.2 m, AI cars 1.3 m). With a speed (o.vx, o.vz)
-- the speed into the object is reflected with factor 1.4; an AI car (o.v) is slowed (x0.9 with a radius, else x0.6). impact(incoming, c,
-- nx, nz) (the player only) is called above 1.8 m/s and returns the speed the car loses when the object gave way: then no bounce. ----
function Objects.collide(o, q, impact)
	local L = Objects.near(o.x, o.z)
	if not L then return false end
	for _, a in ipairs(L) do
		if not a.broken then
			local nx, nz, pen
			local dx, dz = o.x - a.x, o.z - a.z
			local hit = true
			if a.r ~= nil then
				local d = hypot(dx, dz)
				if d >= a.r + q then
					hit = false
				else
					nx = d > 1e-4 and dx / d or 1
					nz = d > 1e-4 and dz / d or 0
					pen = a.r + q - d
				end
			else
				local lx, lz = dx * a.c - dz * a.s, dx * a.s + dz * a.c
				local cx, cz = cl(lx, -a.hw, a.hw), cl(lz, -a.hd, a.hd)
				local ex, ez = lx - cx, lz - cz
				local d = hypot(ex, ez)
				if d >= q then
					hit = false
				else
					if d < 1e-4 then
						local px, pz = a.hw - math.abs(lx), a.hd - math.abs(lz)
						if px < pz then
							ex, ez, pen = (lx < 0 and -1 or 1), 0, px + q
						else
							ex, ez, pen = 0, (lz < 0 and -1 or 1), pz + q
						end
						d = 1
					else
						pen = q - d
					end
					ex, ez = ex / d, ez / d
					nx, nz = ex * a.c + ez * a.s, -ex * a.s + ez * a.c
				end
			end
			if hit then
				if impact then
					local incoming = -(o.vx * nx + o.vz * nz)
					if incoming > 1.8 then
						local gv = impact(incoming, a, nx, nz)
						if gv and gv > 0 then
							o.vx += nx * gv
							o.vz += nz * gv
							return true, a
						end
					end
				end
				o.x += nx * pen
				o.z += nz * pen
				if o.vx ~= nil then
					local vn = o.vx * nx + o.vz * nz
					if vn < 0 then
						o.vx -= vn * nx * 1.4
						o.vz -= vn * nz * 1.4
					end
				else
					o.v *= (o.rad and 0.9 or 0.6)
				end
				return true, a
			end
		end
	end
	return false
end

-- ---- objectImpact (07e, with the v44 materialImpact branch): what the object does when the car hits it at vn (m/s along the normal,
-- n from the object to the car). Returns R = {ebs (the equivalent barrier speed for the car's crush), gave (the car's speed loss when the
-- object gave way), broke, label, act (what to draw: "break" / "lean" / "fell" / "shake" / "deflect" / "shove" / "collapse" / "glass" /
-- "mark" / nil), amt}. rnd() = a random number in [0, 1) (a shoved dumpster's spin). ----
local R = { ebs = 0, gave = 0, broke = false, label = "", act = nil, amt = 0 }
Objects.MOVERS = {}
local function materialImpact(o, c, vn, mass, nx, nz, t)
	if c.cls == "breakable" or c.cls == "movable" or c.cls == "vehicle" or c.cls == "traversable" then return false end
	local E = 0.5 * mass * vn * vn
	if t - (o.mhT or -9) < 0.5 then return c.cls == "tree" or c.cls == "masonry" or c.cls == "deflect" end
	o.mhT = t
	if c.cls == "tree" then
		local vb = Objects.treeBreakV(o)
		local Eb = 0.5 * 1500 * vb * vb
		o.dmg = (o.dmg or 0) + E / Eb
		R.label = c.label
		if o.dmg >= 1 and o.visual then
			Objects.remove(o)
			R.act, R.broke = "fell", true
			local Ea = Eb * 0.7
			R.gave = vn - math.sqrt(math.max(0, vn * vn - 2 * Ea / mass))
			R.ebs = math.min(vn, math.sqrt(Ea / mass) * 1.1)
			return true
		end
		if o.visual and vn > 3 then
			R.amt = math.min(0.12, E / Eb * 0.6)
			o.bent = math.min(0.18, (o.bent or 0) + R.amt)
			R.act = "shake"
		end
		R.ebs = vn
		return true
	end
	if c.cls == "masonry" then
		local vb = 10 + 3 * cl((o.wallH or 1.5) - 1, 0, 1)
		local Eb = 0.5 * 1500 * vb * vb
		o.dmg = (o.dmg or 0) + E / Eb
		R.label = c.label
		if o.dmg >= 1 and o.visual then
			Objects.remove(o)
			R.act, R.broke = "collapse", true
			local Ea = Eb * 0.55
			R.gave = vn - math.sqrt(math.max(0, vn * vn - 2 * Ea / mass))
			R.ebs = math.min(vn, math.sqrt(Ea / mass) * 1.2)
			return true
		end
		if vn > 5 then R.act = "mark" end
		R.ebs = vn
		return true
	end
	if c.cls == "deflect" then
		if o.visual and vn > 3 then
			R.amt = math.min(0.3, E / (0.5 * 1500 * 20 * 20) * 0.6)
			o.defl = math.min(0.45, (o.defl or 0) + R.amt)
			R.act = "deflect"
		end
		R.ebs = vn * 0.8
		R.label = c.label
		return true
	end
	if c.glass and vn > 4 and o.visual and not o.glassBroken then
		o.glassBroken = true
		R.act, R.label = "glass", "Bus shelter glass"
	end
	if c.cls == "rigid" and not c.glass and vn > 6 and (o.type == "solid" or o.type == nil or o.type == "structure" or o.type == "monument") then R.act = "mark" end
	return false
end
function Objects.impact(o, vn, mass, nx, nz, t, rnd)
	local c = objClass(o)
	R.ebs, R.gave, R.broke, R.label, R.act, R.amt = vn, 0, false, c.label, nil, 0
	if materialImpact(o, c, vn, mass, nx, nz, t) then return R end
	if c.cls == "vehicle" then
		local m2 = c.mass
		R.ebs = vn * math.sqrt(m2 / (2 * (mass + m2)))
		return R
	end
	if c.cls == "breakable" then
		local E, Eb = 0.5 * mass * vn * vn, breakEnergy(o, c)
		if o.breakable and not o.broken and E >= Eb then
			Objects.remove(o)
			local Ea = Eb * 0.6
			R.act, R.broke = "break", true
			R.gave = vn - math.sqrt(math.max(0, vn * vn - 2 * Ea / mass))
			R.ebs = math.min(vn, math.sqrt(Ea / mass))
			return R
		end
		if E > Eb * c.bend and not (t - (o.hitT or -9) < 0.6) then
			o.hitT = t
			o.bent = math.min(0.42, (o.bent or 0) + 0.42 * (E - Eb * c.bend) / (Eb * (1 - c.bend)))
			R.act = "lean"
			R.ebs = vn * 0.85
		end
		return R
	end
	if c.cls == "movable" and vn > 1.5 and o.visual then
		local mb = c.mass
		local vc = mass * vn / (mass + mb)
		R.gave = vn - vc
		R.ebs = vn * math.sqrt(mb / (2 * (mass + mb)))
		R.label = c.label
		if not o.moving then
			Objects.remove(o)
			o.moving = true
			local m = { o = o, x = o.x, z = o.z, vx = -nx * vc * 1.15, vz = -nz * vc * 1.15, ry = math.atan2(o.s, o.c), spin = ((rnd and rnd() or 0.5) - 0.5) * 2, tip = 0,
				tipV = vc > 5 and 2.4 or 0, ry0 = math.atan2(o.s, o.c), x0 = o.x, z0 = o.z }
			o.mover = m
			table.insert(Objects.MOVERS, m)
			R.act = "shove"
		end
		R.gave = math.max(R.gave, 0)
		return R
	end
	return R
end

-- ---- shoved dumpsters slide with friction (0.55 g), turn, maybe tip; their collider comes back where they stop (objectsTick) ----
-- -> the movers that stopped this step are returned in `stopped` (the client stops drawing them as moving)
function Objects.step(dt, t, stopped)
	local M = Objects.MOVERS
	for i = #M, 1, -1 do
		local q = M[i]
		local v = hypot(q.vx, q.vz)
		local dv = math.min(v, 0.55 * 9.81 * dt)
		if v > 0 then
			q.vx -= q.vx / v * dv
			q.vz -= q.vz / v * dv
		end
		q.x += q.vx * dt
		q.z += q.vz * dt
		q.ry += q.spin * v * 0.12 * dt
		if q.tipV ~= 0 then
			q.tip = math.min(math.pi / 2, q.tip + q.tipV * dt)
			if q.tip >= math.pi / 2 then q.tipV = 0 end
		end
		if v - dv < 0.05 and q.tipV == 0 then
			local o = q.o
			o.x, o.z, o.c, o.s = q.x, q.z, math.cos(q.ry), math.sin(q.ry)
			o.broken, o.moving, o.hitT = false, false, t
			Objects.add(o)
			table.remove(M, i)
			if stopped then stopped[#stopped + 1] = q end
		end
	end
end

return Objects
