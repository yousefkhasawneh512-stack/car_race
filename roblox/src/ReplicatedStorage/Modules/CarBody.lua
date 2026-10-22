-- Irbid Drive (Roblox) - the web game's car shapes (07a_cars.js mkPorsche + 07a4_carvis.js addNeon), for the player's car (server, welded)
-- and the AI cars (devices, anchored). Every car is the side profile of its body type (PROF: nose height, bonnet length, rear-deck height,
-- glass-house points, body-height share) across the car's width; a glass house (four points: windscreen, roof, rear screen; two points
-- for open cars: a windscreen and a dark cockpit); a roof panel; a rear wing on race cars; head and tail lamps; four wheels (radius by body
-- type) with metal rims; and the car's own neon light lines in its two name-hashed colours (the web game's light-line layout per car).
-- Roblox cannot extrude a shape at run time, so each flat run of the profile is a block and each sloped edge a wedge: the side view is
-- the web profile (the web game's 0.1 m bevel and its 10,000-pixel detail texture are not reproduced).
-- Model space: the model faces -Z and +X is the car's right (the web mesh: +x left, +z forward); web point (x, y, z) -> (-x, y - lift, -z)
-- with lift = H * 0.34 - 0.12, the height of the root part "Body" above the car's ground point (where Client/Drive puts it).
local CarBody = {}

-- the web game's body profiles (07a PROF)
CarBody.PROF = {
	c = { nf = 0.55, hl = 0.3, rf = 0.85, g = { 0.12, -0.02, -0.26, -0.36 }, bf = 0.5 },
	m = { nf = 0.3, hl = 0.2, rf = 0.8, g = { 0.24, 0.04, -0.14, -0.32 }, bf = 0.56 },
	o = { nf = 0.5, hl = 0.3, rf = 0.85, g = { 0.16, 0.11 }, bf = 0.62 },
	q = { nf = 0.3, hl = 0.2, rf = 0.8, g = { 0.27, 0.22 }, bf = 0.62 },
	s = { nf = 0.8, hl = 0.2, rf = 0.95, g = { 0.18, 0.1, -0.4, -0.42 }, bf = 0.5 },
	p = { nf = 0.8, hl = 0.22, rf = 0.95, g = { 0.18, 0.1, -0.02, -0.05 }, bf = 0.5 },
	r = { nf = 0.3, hl = 0.24, rf = 0.8, g = { 0.1, -0.02, -0.16, -0.26 }, bf = 0.62 },
	v = { nf = 0.9, hl = 0.25, rf = 0.95, g = { 0.12, 0.12, -0.3, -0.3 }, bf = 0.45 },
	h = { nf = 0.6, hl = 0.2, rf = 0.9, g = { 0.18, 0.06, -0.4, -0.46 }, bf = 0.5 },
}
local GLASS, TYRE, RIM, BLACK = Color3.fromHex("#0b121a"), Color3.fromHex("#0e0e0f"), Color3.fromHex("#d4d8dc"), Color3.fromHex("#111111")
local HEAD, TAIL = Color3.fromHex("#fff4c8"), Color3.fromHex("#ff2020")

local function hex(c)
	return Color3.fromRGB(math.floor(c / 65536) % 256, math.floor(c / 256) % 256, c % 256)
end
CarBody.hex = hex

-- the root part's height above the car's ground point (metres)
function CarBody.lift(H)
	return H * 0.34 - 0.12
end

-- c = Config.CARS[i]; color = paint (Color3); opt = {S = studs per metre, anchored, neon (light lines), cop (police light bar)}
function CarBody.build(c, color, opt)
	local S = opt.S or 3
	local L, W, H, k = c.L, c.W, c.H, c.body or "c"
	local P0 = CarBody.PROF[k] or CarBody.PROF.c
	local bh = (H - 0.3) * P0.bf
	local y0 = 0.3 + bh
	local lift = CarBody.lift(H)
	local m = Instance.new("Model")
	m.Name = "Car"
	local root = Instance.new("Part")
	root.Name = "Body"
	root.Size = Vector3.new(W * 0.6 * S, 0.4 * S, L * 0.6 * S)
	root.Transparency = 1
	root.Color = color
	root.Anchored = true
	root.CanCollide, root.CanQuery, root.CanTouch = false, false, false
	root.CFrame = CFrame.new()
	root.Parent = m
	m.PrimaryPart = root
	m:SetAttribute("Paint", color)
	local anchored = opt.anchored == true
	-- one part at web coordinates; cf in model space
	local function add(name, size, cf, col, mat, shape, cls)
		local p = Instance.new(cls or "Part")
		p.Name = name
		p.Size = size
		p.CFrame = cf
		p.Color = col
		p.Material = mat or Enum.Material.SmoothPlastic
		if shape then p.Shape = shape end
		p.CanCollide, p.CanQuery, p.CanTouch = false, false, false
		p.Anchored = anchored
		p.Massless = true
		p.Parent = m
		if not anchored then
			local w = Instance.new("WeldConstraint")
			w.Part0, w.Part1 = root, p
			w.Parent = p
		end
		return p
	end
	local function at(x, y, z)
		return Vector3.new(-x * S, (y - lift) * S, -z * S)
	end
	-- an axis-aligned block between web z0..z1, y0..y1, width w (centred)
	local function block(name, z0, z1, ya, yb, w, col, mat)
		if z1 - z0 < 0.005 or yb - ya < 0.005 then return nil end
		return add(name, Vector3.new(w * S, (yb - ya) * S, (z1 - z0) * S), CFrame.new(at(0, (ya + yb) / 2, (z0 + z1) / 2)), col, mat)
	end
	-- a right-triangle prism of width w: right angle at web (zr, yr), one leg to (zh, yr) (along the car), the other to (zr, yv) (up)
	-- Roblox's WedgePart has its right angle at the bottom-back edge (y = -h/2, z = +d/2) and its slope down to the front (-Z)
	local function wedge(name, zr, yr, zh, yv, w, col, mat)
		local d, h = math.abs(zh - zr), yv - yr
		if d < 0.005 or h < 0.005 then return nil end
		local r = at(0, yr, zr)
		local hdir = (at(0, yr, zh) - r).Unit
		local up = Vector3.new(0, 1, 0)
		local zAxis = -hdir
		local xAxis = up:Cross(zAxis)
		local centre = r + hdir * (d * S / 2) + up * (h * S / 2)
		return add(name, Vector3.new(w * S, h * S, d * S), CFrame.fromMatrix(centre, xAxis, up, zAxis), col, mat, nil, "WedgePart")
	end
	-- ---- the body: the profile A (-L/2, .3) B (L/2, .3) C (L/2, nose) D (bonnet end, y0) E (-0.42 L, y0) F (-L/2, deck) ----
	local Cy, Dz, Ez, Fy = 0.3 + bh * P0.nf, L * (0.5 - P0.hl), -L * 0.42, 0.3 + bh * P0.rf
	local yc = math.min(Cy, Fy)
	block("Shell", -L / 2, L / 2, 0.3, yc, W, color)
	block("Shell", Dz, L / 2, yc, Cy, W, color)
	wedge("Shell", Dz, Cy, L / 2, y0, W, color)
	block("Shell", Ez, Dz, yc, y0, W, color)
	block("Shell", -L / 2, Ez, yc, Fy, W, color)
	wedge("Shell", Ez, Fy, -L / 2, y0, W, color)
	-- ---- the glass house ----
	local a = P0.g
	local function u(f) return f * L end
	if #a == 4 then
		local gw = W * 0.84
		block("Glass", u(a[3]), u(a[2]), y0, H, gw, GLASS, Enum.Material.Glass)
		wedge("Glass", u(a[2]), y0, u(a[1]), H, gw, GLASS, Enum.Material.Glass)
		wedge("Glass", u(a[3]), y0, u(a[4]), H, gw, GLASS, Enum.Material.Glass)
		local rl = u(a[2] - a[3])
		if rl > 0.2 then
			add("Roof", Vector3.new(W * 0.8 * S, 0.08 * S, rl * S), CFrame.new(at(0, H + 0.02, u((a[2] + a[3]) / 2))), color)
		end
	else
		-- open cars: a slanted windscreen and a dark cockpit
		local p0, p1 = at(0, y0, u(a[1]) - 0.06), at(0, H, u(a[2]) - 0.06)
		local len = (p1 - p0).Magnitude
		add("Glass", Vector3.new(W * 0.8 * S, len, 0.1 * S), CFrame.lookAt((p0 + p1) / 2, p1) * CFrame.Angles(math.pi / 2, 0, 0), GLASS, Enum.Material.Glass)
		add("Cockpit", Vector3.new(W * 0.7 * S, 0.25 * S, L * 0.22 * S), CFrame.new(at(0, y0 + 0.05, u(a[1] - 0.2))), BLACK)
	end
	if k == "r" then add("Wing", Vector3.new(W * 0.95 * S, 0.08 * S, 0.6 * S), CFrame.new(at(0, H + 0.15, -L * 0.47)), color) end
	-- ---- lamps (Light: 0 / 1 left / right headlight, 2 / 3 left / right tail light; web sx = +1 is the car's left) ----
	for _, sx in ipairs({ 1, -1 }) do
		local hl = add("Headlight", Vector3.new(0.4 * S, 0.14 * S, 0.06 * S), CFrame.new(at(sx * W * 0.33, 0.3 + bh * P0.nf * 0.8, L / 2 + 0.02)), HEAD, Enum.Material.Neon)
		hl:SetAttribute("Light", sx > 0 and 0 or 1)
		local tl = add("Taillight", Vector3.new(0.45 * S, 0.1 * S, 0.06 * S), CFrame.new(at(sx * W * 0.33, 0.3 + bh * P0.rf * 0.75, -L / 2 - 0.02)), TAIL, Enum.Material.Neon)
		tl:SetAttribute("Light", sx > 0 and 2 or 3)
	end
	-- ---- wheels (Corner: 0 FL, 1 FR, 2 RL, 3 RR) ----
	local wr = (k == "s" or k == "p") and 0.5 or k == "v" and 0.45 or 0.38
	local s = wr / 0.42
	for _, q in ipairs({ { -1, 1 }, { 1, 1 }, { -1, -1 }, { 1, -1 } }) do
		local x, z = q[1] * (W / 2 - 0.12), q[2] * L * 0.31
		local ci = (q[2] > 0 and 0 or 2) + (q[1] > 0 and 0 or 1)
		local w = add("Wheel", Vector3.new(0.3 * S, 0.84 * s * S, 0.84 * s * S), CFrame.new(at(x, wr, z)), TYRE, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
		w:SetAttribute("Corner", ci)
		local rim = add("Rim", Vector3.new(0.32 * S, 0.56 * s * S, 0.56 * s * S), CFrame.new(at(x + q[1] * 0.01, wr, z)), RIM, Enum.Material.Metal, Enum.PartType.Cylinder)
		rim:SetAttribute("Corner", ci)
	end
	-- ---- the car's light lines (addNeon): side strips, front line, rear line (split or not), corner marks ----
	local vis = c.vis
	if opt.neon and vis then
		local A, B = hex(vis.c1), hex(vis.c2)
		if vis.ln.swap then A, B = B, A end
		local ln = vis.ln
		local function strip(col, sx, sy, sz, px, py, pz)
			add("Neon", Vector3.new(sx * S, sy * S, sz * S), CFrame.new(at(px, py, pz)), col, Enum.Material.Neon)
		end
		for _, sd in ipairs({ -1, 1 }) do
			strip(A, 0.05, 0.06, L * ln.sideLen, sd * (W / 2 - 0.03), 0.27, -L * 0.02)
			if ln.side > 1 then strip(B, 0.05, 0.05, L * ln.sideLen * 0.7, sd * (W / 2 - 0.03), 0.19, -L * 0.02) end
			if ln.corners then strip(B, 0.05, 0.18, 0.05, sd * (W / 2 - 0.05), 0.4, L / 2 + 0.02) end
		end
		strip(A, W * ln.front, 0.045, 0.05, 0, 0.3, L / 2 + 0.02)
		if ln.rearSplit then
			for _, sd in ipairs({ -1, 1 }) do strip(B, W * ln.rear * 0.42, 0.045, 0.05, sd * W * ln.rear * 0.3, 0.34, -L / 2 - 0.02) end
		else
			strip(B, W * ln.rear, 0.045, 0.05, 0, 0.34, -L / 2 - 0.02)
		end
	end
	-- ---- police: a red / blue light bar on the roof ----
	if opt.cop then
		add("LightR", Vector3.new(W * 0.3 * S, 0.12 * S, 0.25 * S), CFrame.new(at(W * 0.18, H + 0.1, 0)), Color3.fromRGB(255, 30, 30), Enum.Material.Neon)
		add("LightB", Vector3.new(W * 0.3 * S, 0.12 * S, 0.25 * S), CFrame.new(at(-W * 0.18, H + 0.1, 0)), Color3.fromRGB(30, 80, 255), Enum.Material.Neon)
	end
	return m
end

return CarBody
