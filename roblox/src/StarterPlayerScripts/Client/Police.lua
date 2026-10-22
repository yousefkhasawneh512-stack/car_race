-- Irbid Drive (Roblox) - police cars for the heist (the web game's rules): they appear 220-460 m away on a road, are as fast as
-- 85 % of the player's car, follow a route to the player over the real road graph (planned again every 0.8 s), and drive straight at
-- the player when close or at the end of their route, slowing down so they box the car in instead of ramming past. Lights flash.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))

local Police = { cops = {} }
local st, spec = State.st, State.spec

function Police.spawn()
	for _ = 1, 10 do
		local ang, r = math.random() * 2 * math.pi, 220 + math.random() * 240
		local near = Road.nearest(State.road, st.x + math.sin(ang) * r, st.z + math.cos(ang) * r, 80)
		if near then
			-- the web game's police car (mkCop: a white Ford Crown Victoria with a light bar), as fast as 85 % of the player's car
			local cv = Config.CARS[Rules.copCar]
			local a = Traffic.agent("cop", { L = cv.L, W = cv.W, H = cv.H, body = cv.body, name = "Police", vm = spec.vm * 0.85, a0 = spec.a0 * 0.85 }, Color3.fromHex("#f4f4f4"))
			a.x, a.z, a.y = near.x, near.z, near.y
			a.h = math.atan2(st.x - a.x, st.z - a.z)
			a.thinkT = 0
			Police.cops[#Police.cops + 1] = a
			Traffic.draw(a)
			return
		end
	end
end

function Police.clear()
	for _, a in ipairs(Police.cops) do Traffic.remove(a) end
	table.clear(Police.cops)
end

local function chase(a, dt)
	a.vm, a.a0 = spec.vm * 0.85, spec.a0 * 0.85
	local dx, dz = st.x - a.x, st.z - a.z
	local d = math.sqrt(dx * dx + dz * dz)
	-- close, or at the end of the route (the junction nearest the player): straight at where the player is going
	local endOfPath = a.P ~= nil and a.s >= a.P.c[#a.P.c] - 3
	if d < 28 or (a.direct and d < 60) or (endOfPath and d < 200) then
		a.direct = true
		local want = math.atan2(st.x + st.vx * 0.4 - a.x, st.z + st.vz * 0.4 - a.z)
		local df = (want - a.h + math.pi) % (2 * math.pi) - math.pi
		local r = 2.2 / (1 + a.v / 14) * dt
		a.h += math.clamp(df, -r, r)
		-- approach at a speed that can still stop ~5 m from the player (7 m/s^2), and slow down to turn round
		local vt = math.min(a.vm, math.sqrt(2 * 7 * math.max(0, d - 5)) + st.sp, a.vm * (1 - math.abs(df) / math.pi) + 4)
		if a.hit > 0 then
			vt = 0
			a.hit -= dt
		end
		a.v = math.max(0, a.v + math.clamp(vt - a.v, -9 * dt, a.a0 * dt))
		a.x += math.sin(a.h) * a.v * dt
		a.z += math.cos(a.h) * a.v * dt
		-- poles, trees and walls push the police car out and slow it (the web game's colB for its bots)
		if State.objects then State.objects.collideAI(a) end
		a.y = Drive.groundY(a.x, a.z, a.y + 4) or a.y
		a.P = nil
		return
	end
	a.direct = false
	-- far: follow a route to the player over the road graph
	a.thinkT -= dt
	if not a.P or a.thinkT <= 0 then
		a.thinkT = 0.8
		local trs, s0 = Road.routeFrom(State.road, a.x, a.z, math.sin(a.h), math.cos(a.h), st.x + st.vx * 1.2, st.z + st.vz * 1.2)
		if trs then
			a.P = Road.path(trs, nil)
			a.s, a.pi = s0, 1
		else
			a.direct = true
			return
		end
	end
	Traffic.follow(a, dt, math.min(a.vm, Traffic.curveCap(a) * 1.15))
end

-- moves every police car; true when one is within 7 m of the player
function Police.step(dt)
	local near = false
	for _, a in ipairs(Police.cops) do
		chase(a, dt)
		Traffic.draw(a)
		if (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2 < 49 then near = true end
	end
	return near
end

-- red / blue light bars, 3 flashes a second
local flash = 0
function Police.lights(dt)
	flash += dt
	local on = math.floor(flash * 6) % 2 == 0
	for _, a in ipairs(Police.cops) do
		local r, b = a.model:FindFirstChild("LightR"), a.model:FindFirstChild("LightB")
		if r and b then
			r.Color = on and Color3.fromRGB(255, 30, 30) or Color3.fromRGB(50, 0, 0)
			b.Color = on and Color3.fromRGB(0, 0, 50) or Color3.fromRGB(30, 80, 255)
		end
	end
end

return Police
