-- Irbid Drive (Roblox) - a player's car: the web game's shape for that car (Modules/CarBody: its body profile, glass house, lamps,
-- wheels and its own neon light lines), welded to an invisible root part "Body", plus a seat. Sizes from the web game's car data. The
-- player's device moves it; cars and drivers are in the collision group "Drive", which does not collide with the world (the devices do
-- their own ground and wall tests).
local Workspace = game:GetService("Workspace")
local PhysicsService = game:GetService("PhysicsService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local CarBody = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("CarBody"))

local S = Config.SCALE
pcall(function() PhysicsService:RegisterCollisionGroup("Drive") end)
PhysicsService:CollisionGroupSetCollidable("Drive", "Default", false)
PhysicsService:CollisionGroupSetCollidable("Drive", "Drive", false)

local CarBuilder = {}

function CarBuilder.build(spec, color, carIndex)
	local m = CarBody.build(spec, color, { S = S, anchored = false, neon = true })
	local body = m.PrimaryPart
	-- anchored until the player's device has taken the car over (CarReady), so it cannot fall through the map before that
	body.Anchored = true
	body.Massless = false
	local W, L = spec.W * S, spec.L * S
	for _, hl in ipairs(m:GetChildren()) do
		if hl.Name == "Headlight" then
			local sl = Instance.new("SpotLight")
			sl.Name = "Beam"
			sl.Face = Enum.NormalId.Front
			sl.Range = 40 * S
			sl.Angle = 70
			sl.Brightness = 3
			sl.Enabled = Workspace:GetAttribute("Night") == true
			sl.Parent = hl
		end
	end
	-- the driver's seat (left-hand drive; the avatar is hidden, as the web game shows no driver)
	local seat = Instance.new("Seat")
	seat.Name = "DriverSeat"
	seat.Size = Vector3.new(2, 0.4, 2)
	seat.CFrame = body.CFrame * CFrame.new(-W * 0.2, 0, L * 0.08)
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
