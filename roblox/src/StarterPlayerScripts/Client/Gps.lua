-- Irbid Drive (Roblox) - the GPS: a route over the real road graph (one-way streets respected) to a place, a trail of dots on the
-- road for the next 300 m, the distance left, a new route when the player leaves this one, "arrived" within 30 m.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))

local Gps = {}
local S = Config.SCALE
local st = State.st
local nav = nil -- {name, x, z, P (polyline), i (segment index), s (distance along), checkT}
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

function Gps.clear()
	nav = nil
	Hud.gps.Text = ""
	for _, p in ipairs(dots) do p.Transparency = 1 end
end

local function plan(target)
	local trs, s0 = Road.routeFrom(State.road, st.x, st.z, math.sin(st.h), math.cos(st.h), target.x, target.z)
	if not trs then return nil end
	local P = Road.path(trs, Road.lane)
	local _, _, i = Road.project(P, st.x, st.z, 1, #P.x)
	return P, i, s0, trs
end

-- target = a place {n, x, z} -> true when a route was found
function Gps.go(target)
	local P, i, _, trs = plan(target)
	if not P then
		Hud.toast("No route found to " .. target.n)
		return false
	end
	dotPool()
	-- trs: the route's traversals (auto-drive follows their centre line)
	nav = { name = target.n, x = target.x, z = target.z, P = P, i = i, trs = trs, checkT = 1 }
	Hud.toast("GPS: route to " .. target.n, 2.5)
	return true
end

-- the current route (or nil): {name, x, z, P, i, s}
function Gps.route()
	return nav
end

function Gps.step(dt)
	if not nav then return end
	local P = nav.P
	local s, d, i = Road.project(P, st.x, st.z, nav.i - 3, nav.i + 40)
	nav.i, nav.s = i, s
	local left = P.c[#P.c] - s + math.sqrt((nav.x - P.x[#P.x]) ^ 2 + (nav.z - P.z[#P.z]) ^ 2)
	if math.sqrt((nav.x - st.x) ^ 2 + (nav.z - st.z) ^ 2) < 30 then
		Hud.toast("You have arrived: " .. nav.name, 4)
		Gps.clear()
		return
	end
	-- left the route: plan again (at most once a second)
	nav.checkT -= dt
	if d > 35 and nav.checkT <= 0 then
		nav.checkT = 1
		local P2, i2, _, trs2 = plan(nav)
		if P2 then
			nav.P, nav.i, nav.trs, P, i = P2, i2, trs2, P2, i2
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

return Gps
