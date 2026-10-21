-- Irbid Drive (Roblox) - car-to-car contact, the web game's rules (10_laws_player.js): every car is a 3.4 m circle.
--   traffic: the player is pushed out (60 %), bounces off (restitution 0.3), loses 20 % of its speed; the traffic car stops for 1.5 s;
--            "Collision with traffic" costs 30 JD
--   race rivals, duel rival, police (and, in Roblox, other players' cars): the player is pushed out (50 %) and slowed (2 / s)
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Ground = require(Client:WaitForChild("Ground"))

local Bump = {}
local S = Config.SCALE
local st = State.st
local Laws -- (required lazily: Laws needs Ground, Signals; no cycle at load)

-- other players' car bodies (the list is refreshed twice a second, their positions every frame)
local function others()
	local list = {}
	for _, m in ipairs(Workspace:GetChildren()) do
		if m:IsA("Model") and string.sub(m.Name, 1, 4) == "Car_" and m ~= State.car and m.PrimaryPart then
			list[#list + 1] = m.PrimaryPart
		end
	end
	return list
end
local otherCars, otherT = {}, 0

function Bump.step(dt)
	Laws = Laws or require(Client:WaitForChild("Laws"))
	for _, c in ipairs(State.ai) do
		local dx, dz = st.x - c.x, st.z - c.z
		local d = math.sqrt(dx * dx + dz * dz)
		if d < 3.4 then
			local nx, nz = dx / math.max(d, 1e-6), dz / math.max(d, 1e-6)
			if c.kind == "traffic" then
				if st.y < Ground.TH(st.x, st.z) + 2 then
					st.x += nx * (3.4 - d) * 0.6
					st.z += nz * (3.4 - d) * 0.6
					local vn = st.vx * nx + st.vz * nz
					if vn < 0 then
						st.vx -= vn * nx * 1.3
						st.vz -= vn * nz * 1.3
					end
					st.vx *= 0.8
					st.vz *= 0.8
					c.hit = 1.5
					c.v = 0
					Laws.fine("hit", "Collision with traffic", 2)
				end
			else
				st.x += nx * (3.4 - d) * 0.5
				st.z += nz * (3.4 - d) * 0.5
				st.vx *= 1 - 2 * dt
				st.vz *= 1 - 2 * dt
				-- (Roblox police and rivals pause briefly after contact so they do not push through the player)
				c.hit = c.cop and 0.6 or math.max(c.hit or 0, 0.3)
			end
		end
	end
	otherT -= dt
	if otherT <= 0 then
		otherT = 0.5
		otherCars = others()
	end
	for _, b in ipairs(otherCars) do
		local p = b.Position / S
		local dx, dz = st.x - p.X, st.z - p.Z
		local d = math.sqrt(dx * dx + dz * dz)
		if d < 3.4 then
			local nx, nz = dx / math.max(d, 1e-6), dz / math.max(d, 1e-6)
			st.x += nx * (3.4 - d) * 0.5
			st.z += nz * (3.4 - d) * 0.5
			st.vx *= 1 - 2 * dt
			st.vz *= 1 - 2 * dt
		end
	end
end

return Bump
