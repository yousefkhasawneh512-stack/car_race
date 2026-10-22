-- Irbid Drive (Roblox) - what damage looks like on the player's car (the web game's 07c refreshDamageVisual + 07h dpVisual), built from
-- parts on this device only (other players see the car undamaged, as the web game is single player):
--   bumpers that crack (darker, then bare metal), hang and tear off (they fall and lie on the road for 90 s, at most 8); mirrors that fold
--   and snap off; a buckled bonnet / boot lid (a creased copy of the panel); bowed doors; glass cracks drawn as lines from the stored crack
--   origins (the web game's deterministic pattern; a failed tempered pane frosts over); dark broken lamps; dents (shaded patches at the
--   impact points, their size and depth from the record); paint scratches on the damaged zones; flat tyres (squashed), corners that lean
--   (camber) and toe out; bent rims that wobble; smoke from a badly damaged engine; sparks at hard impacts; tyre smoke.
-- Roblox cannot deform a mesh or draw a canvas texture at run time, so dents, creases and cracks are approximated with parts.
-- Web mesh coordinates (+x the car's left, +z forward, y up from the ground) -> model (+X right, -Z forward): (-x, y - lift, -z).
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Damage = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Damage"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Ground = require(Client:WaitForChild("Ground"))

local Fx = {}
local S = Config.SCALE
local st, spec = State.st, State.spec
local built = nil -- {car, body, geo, parts = {bf, br, ml, mr, hood, trunk, dl, dr}, wheels = {[corner] = {part, base}}, lights, overlay}
local debris = {}
local METAL, LIGHT_DEAD, CRACK, SCRATCH = Color3.fromRGB(140, 143, 148), Color3.fromRGB(42, 43, 45), Color3.fromRGB(236, 241, 246), Color3.fromRGB(205, 208, 212)

-- a point in the web game's car-local metres -> an offset from the body part's centre (studs)
local function off(x, y, z)
	local lift = spec.H * 0.34 - 0.12
	return CFrame.new(-x * S, (y - lift) * S, -z * S)
end
-- a web rotation (x about the car's left, y about up, z about forward; applied y, then x, then z) in the model frame
local function rot(rx, ry, rz)
	return CFrame.Angles(0, ry or 0, 0) * CFrame.Angles(-(rx or 0), 0, 0) * CFrame.Angles(0, 0, -(rz or 0))
end
local function part(name, size, color, mat, parent)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	p.CanCollide, p.CanQuery, p.CanTouch, p.Massless = false, false, false, true
	p.Parent = parent
	return p
end
-- place p at an offset from the body and weld it there
local function weld(p, body, cf)
	p.CFrame = body.CFrame * cf
	local w = p:FindFirstChildOfClass("WeldConstraint")
	if not w then
		w = Instance.new("WeldConstraint")
		w.Part0, w.Part1 = body, p
		w.Parent = p
	end
end
local function paintColor(v, paint)
	if v > 0.6 then return METAL end
	if v > 0.15 then return Color3.new(paint.R * 0.68, paint.G * 0.68, paint.B * 0.68) end
	return paint
end

-- ---- the tagged parts, once per car model ----
local function build(car)
	local body = car:FindFirstChild("Body")
	local c = Config.CARS[car:GetAttribute("carIndex") or spec.ci or 1]
	if not (body and c and c.geo) then return nil end
	local g = c.geo
	local B = { car = car, body = body, geo = g, parts = {}, wheels = {}, rims = {}, lights = {}, paint = car:GetAttribute("Paint") or body.Color }
	local folder = Instance.new("Folder")
	folder.Name = "DamageParts"
	folder.Parent = car
	B.folder = folder
	local bh = math.min(0.2, (g.ny - 0.3) * 0.75)
	for _, q in ipairs({ { "bf", 1 }, { "br", -1 } }) do
		local p = part(q[1], Vector3.new((g.W - 0.02) * S, bh * S, 0.16 * S), body.Color, nil, folder)
		B.parts[q[1]] = { p = p, base = { 0, 0.3 + bh / 2, q[2] * (g.L / 2 + 0.01) } }
	end
	for _, q in ipairs({ { "ml", 1 }, { "mr", -1 } }) do
		local p = part(q[1], Vector3.new(0.15 * S, 0.1 * S, 0.09 * S), body.Color, nil, folder)
		B.parts[q[1]] = { p = p, base = { q[2] * (g.W / 2 + 0.1), g.y0 + 0.07, g.ws[1] - 0.08 } }
	end
	-- bonnet / boot lid: two halves meeting at the crease, hidden until damaged
	local function lid(key, z0, y0, z1, y1, w, pk)
		local a = part(key .. "A", Vector3.new(w * S, 0.02 * S, 1), body.Color, nil, folder)
		local b = part(key .. "B", Vector3.new(w * S, 0.02 * S, 1), body.Color, nil, folder)
		a.Transparency, b.Transparency = 1, 1
		B.parts[key] = { a = a, b = b, z0 = z0, y0 = y0, z1 = z1, y1 = y1, pk = pk }
	end
	lid("hood", g.L / 2 - 0.14, g.ny, g.hz + 0.04, g.y0, g.W * 0.86, 0.55)
	lid("trunk", -g.L / 2 + 0.12, g.ty, g.rz - 0.04, g.y0, g.W * 0.84, 0.5)
	local dz0 = g.ws[1] + 0.1
	local dz1 = g.four and math.max(g.rs[1] - 0.1, dz0 - 1.6) or dz0 - 1.1
	for _, q in ipairs({ { "dl", 1 }, { "dr", -1 } }) do
		local p = part(q[1], Vector3.new(0.02 * S, (g.y0 - 0.42) * S, (dz0 - dz1) * S), body.Color, nil, folder)
		p.Transparency = 1
		B.parts[q[1]] = { p = p, base = { q[2] * (g.W / 2 - 0.005), (g.y0 + 0.42) / 2, (dz0 + dz1) / 2 }, sx = q[2] }
	end
	for _, p in ipairs(car:GetChildren()) do
		if p.Name == "Wheel" and p:GetAttribute("Corner") then
			B.wheels[p:GetAttribute("Corner")] = { p = p, base = body.CFrame:ToObjectSpace(p.CFrame), size = p.Size }
		elseif p.Name == "Rim" and p:GetAttribute("Corner") then
			B.rims[p:GetAttribute("Corner")] = { p = p, base = body.CFrame:ToObjectSpace(p.CFrame), size = p.Size }
		elseif (p.Name == "Headlight" or p.Name == "Taillight") and p:GetAttribute("Light") then
			B.lights[p:GetAttribute("Light")] = { p = p, color = p.Color, mat = p.Material }
		end
	end
	-- smoke (engine), sparks (impacts), tyre smoke (one emitter per corner)
	local function emitter(name, tex, color, size, life, speed)
		local a = Instance.new("Attachment")
		a.Name = name
		a.Parent = body
		local e = Instance.new("ParticleEmitter")
		e.Name = "E"
		e.Texture = tex
		e.Color = ColorSequence.new(color)
		e.Size = NumberSequence.new(size)
		e.Lifetime = NumberRange.new(life[1], life[2])
		e.Speed = NumberRange.new(speed[1], speed[2])
		e.Rate = 0
		e.Enabled = true
		e.Parent = a
		return a, e
	end
	local engZ = (c.dmg.eng == "F" and 0.37 or -0.37) * g.L
	B.smokeA, B.smoke = emitter("EngineSmoke", "rbxasset://textures/particles/smoke_main.dds", Color3.fromRGB(119, 124, 128), 0.6 * S, { 1.2, 2 }, { 1 * S, 2 * S })
	B.smokeA.Position = off(0, 0.52, engZ).Position
	B.sparkA, B.spark = emitter("Sparks", "rbxasset://textures/particles/sparkles_main.dds", Color3.fromRGB(255, 190, 110), 0.12 * S, { 0.18, 0.34 }, { 1.5 * S, 3.5 * S })
	B.tyreA, B.tyre = {}, {}
	for j = 0, 3 do
		local a, e = emitter("TyreSmoke" .. j, "rbxasset://textures/particles/smoke_main.dds", Color3.fromRGB(237, 237, 237), 1.2 * S, { 1.2, 2 }, { 0.5 * S, 1.2 * S })
		e.Transparency = NumberSequence.new(0.55)
		local zw, xw = (j < 2 and 1 or -1) * g.L * 0.31, (j % 2 == 0 and 1 or -1) * (g.W / 2 - 0.12)
		a.Position = off(xw, 0.3, zw).Position
		B.tyreA[j], B.tyre[j] = a, e
	end
	return B
end

-- a part torn off: a copy falls and lies on the road (the web game's dpDetach: at most 8, each removed after 90 s)
local function detach(B, k)
	local q = B.parts[k]
	if not (q and q.p) then return end
	local c = q.p:Clone()
	for _, w in ipairs(c:GetChildren()) do w:Destroy() end
	c.Anchored = true
	c.Transparency = 0
	c.Name = "Debris_" .. k
	c.Parent = Workspace
	local k2 = string.sub(k, 1, 1) == "b" and 0.55 or 0.85
	debris[#debris + 1] = { p = c, vx = st.vx * k2 + (math.random() - 0.5) * 2, vz = st.vz * k2 + (math.random() - 0.5) * 2, vy = 1.2 + math.random(),
		sp = (math.random() - 0.5) * 6, age = 0, rest = false, hh = string.sub(k, 1, 1) == "b" and 0.08 or 0.05 }
	while #debris > 8 do table.remove(debris, 1).p:Destroy() end
end

-- the web game's deterministic random numbers for the crack pattern (dpRand)
local function dpRand(seed)
	local s = seed ~= 0 and seed or 1
	return function()
		s = (s * 1103515245 + 12345) % 2147483648
		return s / 2147483647
	end
end
-- the glass panes: origin (centre), u (across) and v (up) half-axes in web car-local metres, size (m)
local function panes(g)
	local P = {}
	local function slope(j, za, ya, zb, yb, wd)
		local cz, cy = (za + zb) / 2, (ya + yb) / 2
		local len = math.sqrt((zb - za) ^ 2 + (yb - ya) ^ 2)
		P[j] = { c = { 0, cy + 0.05, cz }, u = { 1, 0, 0 }, v = { 0, (yb - ya) / len, (zb - za) / len }, w = wd, h = len }
	end
	slope(1, g.ws[1], g.y0, g.ws[2], g.H, g.W * 0.78)
	if g.rs then slope(2, g.rs[1], g.y0, g.rs[2], g.H, g.W * 0.74) end
	local zc = g.four and (g.ws[2] + g.rs[2]) / 2 or g.ws[1] - 0.45
	local zl = g.four and math.abs(g.ws[2] - g.rs[2]) + 0.5 or 0.7
	for _, q in ipairs({ { 3, 1 }, { 4, -1 } }) do
		P[q[1]] = { c = { q[2] * (g.W * 0.42 + 0.1), (g.y0 + g.H) / 2, zc }, u = { 0, 0, -q[2] }, v = { 0, 1, 0 }, w = zl, h = (g.H - g.y0) * 0.78 }
	end
	return P
end
-- a line on a pane from (u0, v0) to (u1, v1) in pane units (0..1)
local function paneLine(B, pane, u0, v0, u1, v1, width)
	local function at(u, v)
		local a, b = (u - 0.5) * pane.w, (v - 0.5) * pane.h
		return pane.c[1] + pane.u[1] * a + pane.v[1] * b, pane.c[2] + pane.u[2] * a + pane.v[2] * b, pane.c[3] + pane.u[3] * a + pane.v[3] * b
	end
	local x0, y0, z0 = at(u0, v0)
	local x1, y1, z1 = at(u1, v1)
	local p0, p1 = (B.body.CFrame * off(x0, y0, z0)).Position, (B.body.CFrame * off(x1, y1, z1)).Position
	local len = (p1 - p0).Magnitude
	if len < 0.01 then return end
	local p = part("Crack", Vector3.new(width * S, width * S, len), CRACK, Enum.Material.SmoothPlastic, B.overlay)
	p.Transparency = 0.1
	p.CFrame = CFrame.lookAt((p0 + p1) / 2, p1)
	local w = Instance.new("WeldConstraint")
	w.Part0, w.Part1 = B.body, p
	w.Parent = p
end

-- ---- rebuild the looks from the record (after every change of the record or the mode) ----
function Fx.refresh(rec, mode)
	local car = State.car
	if not (car and car.Parent) then return end
	if not built or built.car ~= car then
		built = build(car)
		if not built then return end
	end
	local B, g = built, built.geo
	local show = mode ~= 0 and rec ~= nil
	if B.overlay then B.overlay:Destroy() end
	B.overlay = Instance.new("Folder")
	B.overlay.Name = "DamageOverlay"
	B.overlay.Parent = car
	local q = show and rec.parts or {}
	-- bumpers and mirrors
	for _, k in ipairs({ "bf", "br", "ml", "mr" }) do
		local o = B.parts[k]
		local v = q[k] or 0
		o.p.Transparency = v >= 1 and 1 or 0
		o.p.Color = paintColor(v, B.paint)
		local x, y, z = o.base[1], o.base[2], o.base[3]
		local rx, ry, rz = 0, 0, 0
		if string.sub(k, 1, 1) == "b" and v > 0.3 then
			local front = k == "bf"
			local sd = (rec.zones[front and "fl" or "rl"] < rec.zones[front and "fr" or "rr"]) and 1 or -1
			local zs = front and 1 or -1
			z -= zs * math.min(0.12, v * 0.12)
			ry = sd * v * 0.06 * zs
			if v > 0.6 then
				rz = sd * (v - 0.6) * 0.55
				y -= (v - 0.6) * 0.22
			end
		elseif string.sub(k, 1, 1) == "m" and v > 0.4 then
			local sx = k == "ml" and 1 or -1
			rz, ry, y = sx * -1.1 * (v - 0.3), sx * 0.6 * v, y - 0.06
		end
		weld(o.p, B.body, off(x, y, z) * rot(rx, ry, rz))
		-- torn off now: the debris falls
		if v >= 1 and not o.gone then detach(B, k) end
		o.gone = v >= 1
	end
	-- bonnet / boot lid: two halves creased at pk, the crease raised by sev * 0.11 m (the web game's dpBend tent)
	for _, k in ipairs({ "hood", "trunk" }) do
		local o = B.parts[k]
		local v = q[k] or 0
		local on = show and v > 0.12
		o.a.Transparency, o.b.Transparency = on and 0 or 1, on and 0 or 1
		if on then
			local zp, yp = o.z0 + (o.z1 - o.z0) * o.pk, o.y0 + (o.y1 - o.y0) * o.pk + v * 0.11 + 0.02
			for _, seg in ipairs({ { o.a, o.z0, o.y0 + 0.02 }, { o.b, o.z1, o.y1 + 0.02 } }) do
				local pa, pb = (B.body.CFrame * off(0, seg[3], seg[2])).Position, (B.body.CFrame * off(0, yp, zp)).Position
				seg[1].Size = Vector3.new(seg[1].Size.X, seg[1].Size.Y, math.max(0.05, (pb - pa).Magnitude))
				seg[1].Color = Color3.new(B.paint.R * 0.68, B.paint.G * 0.68, B.paint.B * 0.68)
				seg[1].CFrame = CFrame.lookAt((pa + pb) / 2, pb, B.body.CFrame.UpVector)
				weld(seg[1], B.body, B.body.CFrame:ToObjectSpace(seg[1].CFrame))
			end
		end
	end
	-- doors: bowed in towards the dents on that side
	for _, k in ipairs({ "dl", "dr" }) do
		local o = B.parts[k]
		local v = q[k] or 0
		local on = show and v > 0.15
		o.p.Transparency = on and 0 or 1
		if on then
			o.p.Color = Color3.new(B.paint.R * 0.68, B.paint.G * 0.68, B.paint.B * 0.68)
			weld(o.p, B.body, off(o.base[1] - o.sx * v * 0.09 * 0.5, o.base[2], o.base[3]) * rot(0, o.sx * v * 0.05, 0))
		end
	end
	-- lamps
	for j = 0, 3 do
		local L = B.lights[j]
		if L then
			local broken = show and rec.lights[j + 1] ~= 0
			L.p.Color = broken and LIGHT_DEAD or L.color
			L.p.Material = broken and Enum.Material.SmoothPlastic or L.mat
			local beam = L.p:FindFirstChild("Beam")
			if beam and broken then beam.Enabled = false end
			L.p:SetAttribute("Broken", broken)
		end
	end
	-- wheels: flat (squashed, lower), camber on a damaged corner, toe from the alignment
	for j = 0, 3 do
		local w = B.wheels[j]
		if w then
			local ww = show and rec.wheels[j + 1] or nil
			local size, drop = w.size, 0
			if ww and ww.punct then
				size = Vector3.new(w.size.X * 1.14, w.size.Y * 0.82, w.size.Z)
				drop = w.size.Y * 0.09
			end
			local camber = (show and rec.susp[j + 1] < 60) and (60 - rec.susp[j + 1]) / 60 * 0.16 or 0
			local side = j % 2 == 0 and 1 or -1
			local toe = show and (j < 2 and 1 or 0.5) * rec.align[j + 1] * math.pi / 180 or 0
			w.p.Size = size
			w.cf = w.base * CFrame.new(0, -drop, 0) * rot(0, toe, side * camber)
			weld(w.p, B.body, w.cf)
			-- the rim goes with its wheel, and a bent one is squashed a little (the web game's dpVisual)
			local rm = B.rims[j]
			if rm then
				local b = show and rec.rims[j + 1] or 0
				rm.p.Size = b > 0.05 and Vector3.new(rm.size.X, rm.size.Y * (1 - b * 0.07), rm.size.Z * (1 + b * 0.04)) or rm.size
				rm.cf = rm.base * CFrame.new(0, -drop, 0) * rot(0, toe, side * camber)
				rm.bent = b
				weld(rm.p, B.body, rm.cf)
			end
		end
	end
	if not show then return end
	-- dents: a shaded patch at each impact point, sized by the dent radius, set in by its depth
	for _, d in ipairs(rec.dents) do
		local p = part("Dent", Vector3.new(0.02 * S, d[7] * 0.9 * S, d[7] * 0.9 * S), Color3.new(B.paint.R * 0.55, B.paint.G * 0.55, B.paint.B * 0.55), nil, B.overlay)
		p.Shape = Enum.PartType.Cylinder
		local cf = off(d[1] + d[4] * d[6] * 0.3, d[2], d[3] + d[5] * d[6] * 0.3)
		local look = Vector3.new(d[4], 0, d[5])
		if look.Magnitude < 1e-6 then look = Vector3.new(0, 0, 1) end
		-- the cylinder's axis (X) along the dent normal (web n -> model (-nx, 0, -nz))
		p.CFrame = B.body.CFrame * cf * CFrame.fromMatrix(Vector3.zero, Vector3.new(-look.X, 0, -look.Z).Unit, Vector3.new(0, 1, 0))
		local wcf = B.body.CFrame:ToObjectSpace(p.CFrame)
		weld(p, B.body, wcf)
	end
	-- scratches on the zones that lost condition
	for _, z in ipairs({ { "fl", 1, 0.33 }, { "fr", -1, 0.33 }, { "l", 1, 0 }, { "r", -1, 0 }, { "rl", 1, -0.33 }, { "rr", -1, -0.33 } }) do
		local loss = 100 - rec.zones[z[1]]
		if loss >= 1.5 then
			local len = math.min(g.L * 0.3, 0.35 + loss * 0.025)
			local h = math.min(0.3, 0.08 + loss * 0.006)
			local p = part("Scratch", Vector3.new(0.01 * S, h * S, len * S), SCRATCH, nil, B.overlay)
			p.Transparency = 0.25
			weld(p, B.body, off(z[2] * (g.W / 2 + 0.012), 0.42 + ((z[3] * 7) % 3) * 0.03, z[3] * g.L))
		end
	end
	-- glass cracks (laminated windscreen: lines from each origin, rings when severe; tempered panes frost over when they fail)
	local P = panes(g)
	for j = 1, 4 do
		local pane = P[j]
		local L = rec.cracks[j]
		if pane and #L > 0 then
			for _, c in ipairs(L) do
				local cu, cv, sev = c[1], c[2], c[3]
				local r = dpRand(Damage.jsround(cu * 977 + cv * 331 + (j - 1) * 71))
				local arms = Damage.jsround(6 + sev * 12)
				local reach = (40 + sev * 170) / 256
				for k = 0, arms - 1 do
					local a = k / arms * math.pi * 2 + r() * 0.4
					local mid = 0.45 + r() * 0.2
					local a2 = a + (r() - 0.5) * 0.5
					local u1, v1 = cu + math.cos(a) * reach * mid, cv + math.sin(a) * reach * mid
					local u2, v2 = u1 + math.cos(a2) * reach * (1 - mid), v1 + math.sin(a2) * reach * (1 - mid)
					paneLine(B, pane, cu, cv, math.clamp(u1, 0, 1), math.clamp(v1, 0, 1), 0.008)
					paneLine(B, pane, math.clamp(u1, 0, 1), math.clamp(v1, 0, 1), math.clamp(u2, 0, 1), math.clamp(v2, 0, 1), 0.006)
				end
				if j >= 2 and sev >= 0.85 then
					-- tempered glass crazes into small cubes over the whole pane: a frosted sheet over it
					local p = part("Crazed", Vector3.new(pane.w * S, pane.h * S, 0.01 * S), Color3.fromRGB(205, 210, 216), Enum.Material.Glass, B.overlay)
					p.Transparency = 0.35
					local x, y, z = pane.c[1], pane.c[2], pane.c[3]
					local pc = (B.body.CFrame * off(x, y, z)).Position
					local vx, vy, vz = pane.v[1], pane.v[2], pane.v[3]
					local ux, uz = pane.u[1], pane.u[3]
					local right = (B.body.CFrame * off(x + ux, y, z + uz)).Position - pc
					local up = (B.body.CFrame * off(x + vx, y + vy, z + vz)).Position - pc
					p.CFrame = CFrame.fromMatrix(pc, right.Unit, up.Unit)
					weld(p, B.body, B.body.CFrame:ToObjectSpace(p.CFrame))
				end
			end
		end
	end
end

-- ---- every frame: debris, bent rims, smoke ----
local phase, smA = 0, 0
function Fx.step(dt, mode, T)
	for i = #debris, 1, -1 do
		local d = debris[i]
		d.age += dt
		if d.age > 90 then
			d.p:Destroy()
			table.remove(debris, i)
		elseif not d.rest then
			d.vy -= 9.81 * dt
			local pos = d.p.Position / S + Vector3.new(d.vx, d.vy, d.vz) * dt
			local gy = Ground.TH(pos.X, pos.Z) + 0.06 + d.hh
			if pos.Y < gy then
				pos = Vector3.new(pos.X, gy, pos.Z)
				d.vy = math.abs(d.vy) > 2 and -d.vy * 0.25 or 0
				d.vx *= 0.5
				d.vz *= 0.5
				d.sp *= 0.4
				if math.sqrt(d.vx * d.vx + d.vz * d.vz) < 0.3 and d.vy == 0 then d.rest = true end
			end
			d.p.CFrame = CFrame.new(pos * S) * (d.p.CFrame - d.p.CFrame.Position) * CFrame.Angles(d.sp * 0.4 * dt, d.sp * dt, 0)
		end
	end
	local B = built
	if not (B and B.car.Parent) or mode == 0 then
		if B and B.smoke then B.smoke.Rate = 0 end
		return
	end
	-- bent rims wobble with the wheel's rotation (the web game's dpTick)
	local v = st.vx * math.sin(st.h) + st.vz * math.cos(st.h)
	phase += v * dt / 0.33
	for j = 0, 3 do
		local r = B.rims[j]
		if r and (r.bent or 0) > 0.05 then r.p.CFrame = B.body.CFrame * r.cf * CFrame.Angles(0, math.sin(phase + j) * r.bent * 0.07, 0) end
	end
	-- engine smoke (Full: a badly damaged or overheating engine)
	B.smoke.Rate = State.damageSmoke and 12 or 0
	-- tyre smoke from burnouts and slides (the web game: every wheel slipping more than 4 puffs, faster in a burnout)
	if T and (T.burn or (T.sl[1] + T.sl[2] + T.sl[3] + T.sl[4] > 12)) then
		smA += dt * (T.burn and 22 or 8)
		while smA >= 1 do
			smA -= 1
			for j = 0, 3 do
				if T.sl[j + 1] > 4 then B.tyre[j]:Emit(1) end
			end
		end
	end
end

-- sparks at a hard impact (the web game: 5 sparks above 11 m/s, at the contact point)
function Fx.sparks(r, v)
	local B = built
	if not (B and r and v >= 11) then return end
	B.sparkA.Position = off(r.cx, 0.28, r.cz).Position
	B.spark:Emit(5)
end

return Fx
