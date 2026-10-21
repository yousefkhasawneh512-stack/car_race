-- Irbid Drive (Roblox) - street names, the GPS (search the real OSM places, route over the real road graph with one-way streets,
-- a trail of dots on the road, re-route when the player leaves it) and the minimap (roads near the player, turning with the car).
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Meta = require(Shared:WaitForChild("Meta"))
local Places = require(Shared:WaitForChild("Places"))
local Circuits = require(Shared:WaitForChild("Circuits"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))

local Nav = {}
local S = Config.SCALE
local st = State.st
Nav.street = ""

-- ---- street name under the car (every 0.25 s) ----
local streetT = 0
local function streetTick(dt)
	streetT -= dt
	if streetT > 0 then return end
	streetT = 0.25
	local near = State.road and Road.nearest(State.road, st.x, st.z, 25)
	Nav.street = near and near.e.name or ""
end

-- ---- GPS ----
local nav = nil -- {name, x, z, P (polyline), i (progress index), checkT}
local dots = {}
local function dotPool()
	if #dots > 0 then return end
	for k = 1, 30 do
		local p = Instance.new("Part")
		p.Name = "GpsDot"
		p.Anchored = true
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.Material = Enum.Material.Neon
		p.Color = Color3.fromRGB(60, 255, 140)
		p.Shape = Enum.PartType.Ball
		p.Size = Vector3.new(0.8, 0.8, 0.8) * S
		p.Transparency = 1
		p.Parent = Workspace.CurrentCamera
		dots[k] = p
	end
end

function Nav.clear()
	nav = nil
	Hud.gps.Text = ""
	for _, p in ipairs(dots) do p.Transparency = 1 end
end

local function plan(target)
	local trs, s0 = Road.routeFrom(State.road, st.x, st.z, math.sin(st.h), math.cos(st.h), target.x, target.z)
	if not trs then return nil end
	local P = Road.path(trs, Road.lane)
	local _, _, i = Road.project(P, st.x, st.z, 1, #P.x)
	return P, i, s0
end

function Nav.go(target)
	local P, i = plan(target)
	if not P then
		Hud.toast("No route found to " .. target.n)
		return false
	end
	dotPool()
	nav = { name = target.n, x = target.x, z = target.z, P = P, i = i, checkT = 1 }
	Hud.toast("GPS: route to " .. target.n, 2.5)
	return true
end
function Nav.active()
	return nav ~= nil
end
-- the current route (or nil): {name, x, z, P, i}
function Nav.route()
	return nav
end

local function gpsTick(dt)
	if not nav then return end
	local P = nav.P
	local s, d, i = Road.project(P, st.x, st.z, nav.i - 3, nav.i + 40)
	nav.i, nav.s = i, s
	local left = P.c[#P.c] - s + math.sqrt((nav.x - P.x[#P.x]) ^ 2 + (nav.z - P.z[#P.z]) ^ 2)
	local direct = math.sqrt((nav.x - st.x) ^ 2 + (nav.z - st.z) ^ 2)
	if direct < 30 then
		Hud.toast("You have arrived: " .. nav.name, 4)
		Nav.clear()
		return
	end
	-- left the route: plan again (at most once a second)
	nav.checkT -= dt
	if d > 35 and nav.checkT <= 0 then
		nav.checkT = 1
		local P2, i2 = plan(nav)
		if P2 then
			nav.P, nav.i, P, i = P2, i2, P2, i2
			s = Road.project(P, st.x, st.z, i, i + 1)
			nav.s = s
		end
	end
	Hud.gps.Text = "📍 GPS: " .. nav.name .. " · " .. (left >= 1000 and string.format("%.1f km", left / 1000) or (math.floor(left / 10) * 10 .. " m"))
	-- dots every 10 m for the next 300 m
	for k, p in ipairs(dots) do
		local sd = s + 8 + (k - 1) * 10
		if sd < P.c[#P.c] then
			local x, z, y = Road.sample(P, sd, i)
			p.Position = Vector3.new(x, y + 0.9, z) * S
			p.Transparency = 0.15
		else
			p.Transparency = 1
		end
	end
end

-- ---- search panel ----
local function lower(s)
	return string.lower(s)
end
function Nav.open()
	if Hud.isOpen("GPS") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("GPS", 380, 380)
	p.sub.Text = "Search " .. #Places .. " real places (OpenStreetMap)"
	local box = Instance.new("TextBox")
	box.Size = UDim2.new(1, -12, 0, 34)
	box.BackgroundColor3 = Color3.fromRGB(40, 44, 52)
	box.TextColor3 = Color3.new(1, 1, 1)
	box.PlaceholderText = "Type a place: mall, university, Clock Tower…"
	box.Font = Enum.Font.Gotham
	box.TextSize = 15
	box.ClearTextOnFocus = false
	box.Text = ""
	box.LayoutOrder = 0
	box.Parent = p.list
	local rows = {}
	local function show()
		for _, r in ipairs(rows) do r:Destroy() end
		table.clear(rows)
		local q = lower(box.Text)
		local found = {}
		if nav then
			local b = Hud.button(p.list, "✖ Stop the GPS", function()
				Nav.clear()
				p.close()
			end, 340, 30, Color3.fromRGB(110, 50, 50))
			b.LayoutOrder = 1
			rows[#rows + 1] = b
		end
		for _, pl in ipairs(Places) do
			if q == "" or string.find(lower(pl.n), q, 1, true) or string.find(lower(pl.s), q, 1, true) or string.find(lower(pl.k), q, 1, true) then
				found[#found + 1] = { pl = pl, d = math.sqrt((pl.x - st.x) ^ 2 + (pl.z - st.z) ^ 2) }
			end
		end
		table.sort(found, function(a, b) return a.d < b.d end)
		for k = 1, math.min(14, #found) do
			local pl = found[k].pl
			local dist = found[k].d
			local label = pl.n .. "  ·  " .. (pl.s ~= "" and pl.s or pl.k) .. "  ·  " .. (dist >= 1000 and string.format("%.1f km", dist / 1000) or (math.floor(dist) .. " m"))
			local b = Hud.button(p.list, label, function()
				if Nav.go(pl) then p.close() end
			end, 340, 32)
			b.TextXAlignment = Enum.TextXAlignment.Left
			b.TextSize = 13
			b.LayoutOrder = 1 + k
			rows[#rows + 1] = b
		end
		if #found == 0 then
			local l = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(340, 24), Vector2.zero, "No place matches \"" .. box.Text .. "\"", 15)
			l.LayoutOrder = 2
			rows[#rows + 1] = l
		end
	end
	box:GetPropertyChangedSignal("Text"):Connect(show)
	show()
end

-- ---- minimap: a round window, the car in the centre pointing up; roads within 260 m redrawn 7 times a second ----
local MAP_PX, MAP_R = 180, 260
local mm = Instance.new("CanvasGroup")
mm.Name = "Minimap"
mm.Size = UDim2.fromOffset(MAP_PX, MAP_PX)
mm.AnchorPoint = Vector2.new(0, 1)
mm.Position = UDim2.new(0, 12, 1, -26)
mm.BackgroundColor3 = Color3.fromRGB(28, 32, 26)
mm.BackgroundTransparency = 0.15
mm.Parent = Hud.gui
local mmc = Instance.new("UICorner")
mmc.CornerRadius = UDim.new(0.5, 0)
mmc.Parent = mm
local lines, nLines = {}, 0
local function line(i)
	local f = lines[i]
	if not f then
		f = Instance.new("Frame")
		f.AnchorPoint = Vector2.new(0.5, 0.5)
		f.BorderSizePixel = 0
		f.Parent = mm
		lines[i] = f
	end
	f.Visible = true
	return f
end
local arrow = Instance.new("TextLabel")
arrow.Size = UDim2.fromOffset(20, 20)
arrow.AnchorPoint = Vector2.new(0.5, 0.5)
arrow.Position = UDim2.fromScale(0.5, 0.5)
arrow.BackgroundTransparency = 1
arrow.Text = "▲"
arrow.TextColor3 = Color3.fromRGB(80, 200, 255)
arrow.TextSize = 18
arrow.Font = Enum.Font.GothamBold
arrow.ZIndex = 5
arrow.Parent = mm
local marks = {}
local function mark(i, color, size)
	local f = marks[i]
	if not f then
		f = Instance.new("Frame")
		f.AnchorPoint = Vector2.new(0.5, 0.5)
		f.BorderSizePixel = 0
		f.ZIndex = 4
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0.5, 0)
		c.Parent = f
		f.Parent = mm
		marks[i] = f
	end
	f.Size = UDim2.fromOffset(size, size)
	f.BackgroundColor3 = color
	return f
end
local SITES = { { Meta.bank.x, Meta.bank.z, Color3.fromRGB(255, 60, 60) }, { Meta.shop.x, Meta.shop.z, Color3.fromRGB(255, 122, 0) } }
for _, c in ipairs(Circuits) do
	local x, z = string.match(c.path, "^(-?%d+),(-?%d+)")
	SITES[#SITES + 1] = { tonumber(x) / 10, tonumber(z) / 10, Color3.fromRGB(51, 224, 255) }
end

local mmT = 0
local ROADCOL = { [0] = Color3.fromRGB(235, 225, 200), [1] = Color3.fromRGB(170, 170, 165), [2] = Color3.fromRGB(110, 110, 105), [3] = Color3.fromRGB(235, 225, 200) }
local function mapTick(dt)
	mmT -= dt
	if mmT > 0 or not State.road then return end
	mmT = 0.14
	local k = MAP_PX / 2 / MAP_R
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local rx, rz = -fz, fx
	local function proj(x, z)
		local dx, dz = x - st.x, z - st.z
		return MAP_PX / 2 + (dx * rx + dz * rz) * k, MAP_PX / 2 - (dx * fx + dz * fz) * k
	end
	nLines = 0
	local seen = {}
	Road.each(State.road, st.x, st.z, MAP_R, function(e, j)
		local id = e.id * 4096 + j
		if seen[id] or nLines >= 700 then return end
		seen[id] = true
		local x1, z1, x2, z2 = e.x[j], e.z[j], e.x[j + 1], e.z[j + 1]
		if (x1 - st.x) ^ 2 + (z1 - st.z) ^ 2 > MAP_R * MAP_R * 1.1 and (x2 - st.x) ^ 2 + (z2 - st.z) ^ 2 > MAP_R * MAP_R * 1.1 then return end
		local u1, v1 = proj(x1, z1)
		local u2, v2 = proj(x2, z2)
		nLines += 1
		local f = line(nLines)
		local len = math.sqrt((u2 - u1) ^ 2 + (v2 - v1) ^ 2)
		f.Position = UDim2.fromOffset((u1 + u2) / 2, (v1 + v2) / 2)
		f.Size = UDim2.fromOffset(len + 1, math.max(2, e.w * k))
		f.Rotation = math.deg(math.atan2(v2 - v1, u2 - u1))
		f.BackgroundColor3 = ROADCOL[e.kind] or ROADCOL[1]
	end)
	-- the GPS route on top
	if nav then
		local P = nav.P
		local j = nav.i
		while j < #P.x and P.c[j] - P.c[nav.i] < MAP_R * 1.4 and nLines < 760 do
			local u1, v1 = proj(P.x[j], P.z[j])
			local u2, v2 = proj(P.x[j + 1], P.z[j + 1])
			nLines += 1
			local f = line(nLines)
			f.Position = UDim2.fromOffset((u1 + u2) / 2, (v1 + v2) / 2)
			f.Size = UDim2.fromOffset(math.sqrt((u2 - u1) ^ 2 + (v2 - v1) ^ 2) + 1, 4)
			f.Rotation = math.deg(math.atan2(v2 - v1, u2 - u1))
			f.BackgroundColor3 = Color3.fromRGB(60, 255, 140)
			j += 1
		end
	end
	for i = nLines + 1, #lines do lines[i].Visible = false end
	-- sites (clamped to the edge when far), the GPS destination, AI cars (police red)
	local mi = 0
	local function put(x, z, color, size)
		mi += 1
		local u, v = proj(x, z)
		local du, dv = u - MAP_PX / 2, v - MAP_PX / 2
		local r = math.sqrt(du * du + dv * dv)
		local lim = MAP_PX / 2 - 6
		if r > lim then
			u, v = MAP_PX / 2 + du / r * lim, MAP_PX / 2 + dv / r * lim
		end
		local f = mark(mi, color, size)
		f.Position = UDim2.fromOffset(u, v)
		f.Visible = true
	end
	for _, s in ipairs(SITES) do put(s[1], s[2], s[3], 10) end
	if nav then put(nav.x, nav.z, Color3.fromRGB(60, 255, 140), 12) end
	for _, a in ipairs(State.ai) do
		if (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2 < MAP_R * MAP_R then
			put(a.x, a.z, a.cop and Color3.fromRGB(255, 40, 40) or a.kind == "rival" and Color3.fromRGB(255, 200, 40) or Color3.fromRGB(200, 200, 200), a.cop and 8 or 5)
		end
	end
	if State.mission == "race" and Nav.raceMark then put(Nav.raceMark[1], Nav.raceMark[2], Color3.fromRGB(51, 224, 255), 12) end
	for i = mi + 1, #marks do marks[i].Visible = false end
end

function Nav.step(dt)
	streetTick(dt)
	gpsTick(dt)
	mapTick(dt)
end

return Nav
