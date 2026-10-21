-- Irbid Drive (Roblox) - the minimap: a round window (bottom left), the car in the centre pointing up; the real roads within 260 m
-- redrawn 7 times a second, the GPS route in green, the bank / shop / race starts (clamped to the edge when far), the GPS
-- destination, the next race checkpoint, AI cars (police red, rivals yellow).
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Meta = require(Shared:WaitForChild("Meta"))
local Circuits = require(Shared:WaitForChild("Circuits"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Gps = require(script.Parent:WaitForChild("Gps"))

local Minimap = {}
local st = State.st
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

local lines = {}
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
local ROADCOL = { [0] = Color3.fromRGB(235, 225, 200), [1] = Color3.fromRGB(170, 170, 165), [2] = Color3.fromRGB(110, 110, 105), [3] = Color3.fromRGB(235, 225, 200) }

local t = 0
function Minimap.step(dt)
	t -= dt
	if t > 0 or not State.road then return end
	t = 0.14
	local k = MAP_PX / 2 / MAP_R
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local rx, rz = -fz, fx
	local function proj(x, z)
		local dx, dz = x - st.x, z - st.z
		return MAP_PX / 2 + (dx * rx + dz * rz) * k, MAP_PX / 2 - (dx * fx + dz * fz) * k
	end
	local nLines = 0
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
	local nav = Gps.route()
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
	if State.mission == "race" and State.raceMark then put(State.raceMark[1], State.raceMark[2], Color3.fromRGB(51, 224, 255), 12) end
	for i = mi + 1, #marks do marks[i].Visible = false end
end

return Minimap
