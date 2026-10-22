-- Irbid Drive (Roblox) - a player's car: a simple body (no brand), cabin (height by body type), four wheels, head and tail lights,
-- a seat, all welded to the body. Sizes from the web game's car data. The player's device moves it; cars and drivers are in the
-- collision group "Drive", which does not collide with the world (the devices do their own ground and wall tests).
local Workspace = game:GetService("Workspace")
local PhysicsService = game:GetService("PhysicsService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local S = Config.SCALE
pcall(function() PhysicsService:RegisterCollisionGroup("Drive") end)
PhysicsService:CollisionGroupSetCollidable("Drive", "Default", false)
PhysicsService:CollisionGroupSetCollidable("Drive", "Drive", false)

local CarBuilder = {}
CarBuilder.COLORS = { Color3.fromRGB(20, 90, 200), Color3.fromRGB(200, 30, 30), Color3.fromRGB(240, 240, 240), Color3.fromRGB(250, 170, 0), Color3.fromRGB(20, 160, 90), Color3.fromRGB(120, 40, 180) }

function CarBuilder.build(spec, color, carIndex)
	local L, W, H = spec.L * S, spec.W * S, spec.H * S
	local m = Instance.new("Model")
	m.Name = "Car"
	local body = Instance.new("Part")
	body.Name = "Body"
	-- anchored until the player's device has taken the car over (CarReady), so it cannot fall through the map before that
	body.Anchored = true
	body.Size = Vector3.new(W, H * 0.55, L)
	body.Color = color
	body.Material = Enum.Material.SmoothPlastic
	body.CFrame = CFrame.new(0, H * 0.45, 0)
	body.Parent = m
	m.PrimaryPart = body
	local function add(name, size, cf, col, mat, shape)
		local p = Instance.new("Part")
		p.Name = name
		p.Size = size
		p.CFrame = body.CFrame * cf
		p.Color = col
		p.Material = mat or Enum.Material.SmoothPlastic
		if shape then p.Shape = shape end
		p.Massless = true
		p.Parent = m
		local w = Instance.new("WeldConstraint")
		w.Part0 = body
		w.Part1 = p
		w.Parent = p
		return p
	end
	-- cabin height by body type (web game classes): SUV / pickup tall, open cars low
	local bt = spec.body
	local ch = (bt == "s" or bt == "p") and 0.55 or (bt == "o" or bt == "q") and 0.22 or 0.42
	add("Cabin", Vector3.new(W * 0.86, H * ch, L * 0.48), CFrame.new(0, H * (0.27 + ch / 2), L * 0.05), Color3.fromRGB(30, 36, 44), Enum.Material.Glass)
	-- the model faces -Z and its +X is the car's right (the web game's mesh: +x left, +z forward); wheels and lamps carry the web game's
	-- numbering (Corner: 0 FL, 1 FR, 2 RL, 3 RR; Light: 0 / 1 left / right headlight, 2 / 3 left / right tail light) for the damage looks
	local wr = H * 0.22
	for _, q in ipairs({ { 1, -1, 1 }, { -1, -1, 0 }, { 1, 1, 3 }, { -1, 1, 2 } }) do
		local w = add("Wheel", Vector3.new(W * 0.12, wr * 2, wr * 2), CFrame.new(q[1] * W * 0.47, -H * 0.12, q[2] * L * 0.32), Color3.fromRGB(20, 20, 20), Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
		w:SetAttribute("Corner", q[3])
	end
	for _, x in ipairs({ -1, 1 }) do
		local hl = add("Headlight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, -L * 0.5), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
		hl:SetAttribute("Light", x < 0 and 0 or 1)
		local sl = Instance.new("SpotLight")
		sl.Name = "Beam"
		sl.Face = Enum.NormalId.Front
		sl.Range = 40 * S
		sl.Angle = 70
		sl.Brightness = 3
		sl.Enabled = Workspace:GetAttribute("Night") == true
		sl.Parent = hl
		local tl = add("Taillight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, L * 0.5), Color3.fromRGB(140, 10, 10), Enum.Material.Neon)
		tl:SetAttribute("Light", x < 0 and 2 or 3)
	end
	local seat = Instance.new("Seat")
	seat.Name = "DriverSeat"
	seat.Size = Vector3.new(2, 0.4, 2)
	seat.CFrame = body.CFrame * CFrame.new(-W * 0.2, H * 0.12, L * 0.08)
	seat.Transparency = 1
	seat.Massless = true
	seat.Parent = m
	local sw = Instance.new("WeldConstraint"); sw.Part0 = body; sw.Part1 = seat; sw.Parent = seat
	-- counter gravity so the device's position updates are not fought by the physics engine
	local att = Instance.new("Attachment"); att.Parent = body
	local vf = Instance.new("VectorForce")
	vf.Name = "Lift"
	vf.Attachment0 = att
	vf.RelativeTo = Enum.ActuatorRelativeTo.World
	vf.ApplyAtCenterOfMass = true
	vf.Parent = body
	for _, p in ipairs(m:GetDescendants()) do
		if p:IsA("BasePart") then
			p.CollisionGroup = "Drive"
			p.CanQuery = false
			p.CanTouch = false
		end
	end
	m:SetAttribute("carIndex", carIndex)
	m:SetAttribute("carName", spec.name)
	return m
end

return CarBuilder
