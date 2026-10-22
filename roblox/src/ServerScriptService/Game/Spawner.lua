-- Irbid Drive (Roblox) - puts each player in their car: builds the current car, seats the driver, and hands the car to the player's
-- device once it says it has attached (CarReady). Also the ResetCar remote (at most every 3 s).
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local CarBuilder = require(script.Parent:WaitForChild("CarBuilder"))

local S = Config.SCALE
local Spawner = {}

-- wait for WorldBuilder, but never for ever (a failed map must not keep players out)
function Spawner.waitForMap()
	local waited = 0
	while not Workspace:GetAttribute("MapReady") and waited < 900 do
		waited += 0.5
		task.wait(0.5)
	end
end

-- builds the player's current car and seats them. keep = put it where the old car was (car change, reset), else at the start street
function Spawner.spawn(plr, keep)
	local char = plr.Character
	local d = PlayerData.data[plr]
	if not (char and d) then return end
	local hum = char:FindFirstChildOfClass("Humanoid")
	local root = char:FindFirstChild("HumanoidRootPart")
	if not (hum and root) then return end
	Spawner.waitForMap()
	local spec = Config.CARS[d.cur]
	local pos, f
	local old = Workspace:FindFirstChild("Car_" .. plr.UserId)
	if old and keep and old.PrimaryPart then
		local cf = old.PrimaryPart.CFrame
		local lv = cf.LookVector
		f = Vector3.new(lv.X, 0, lv.Z)
		f = f.Magnitude > 0.01 and f.Unit or Vector3.new(0, 0, 1)
		pos = cf.Position + Vector3.new(0, 1.5 * S, 0)
	end
	if old then old:Destroy() end
	if not pos then
		-- each player starts a little apart along the start street
		local off = (#Players:GetPlayers() - 1) % 6
		local h = Meta.startHeading
		f = Vector3.new(math.sin(h), 0, math.cos(h))
		pos = Vector3.new(0, Meta.startY * S + spec.H * S * 0.6, 0) - f * off * 8 * S
	end
	local car = CarBuilder.build(spec, CarBuilder.COLORS[(plr.UserId % #CarBuilder.COLORS) + 1], d.cur)
	car.Name = "Car_" .. plr.UserId
	car:SetAttribute("Owner", plr.UserId)
	car:PivotTo(CFrame.lookAt(pos, pos + f))
	car.Parent = Workspace
	for _, p in ipairs(char:GetDescendants()) do
		if p:IsA("BasePart") then
			p.CollisionGroup = "Drive"
			p.CanQuery = false
		end
	end
	hum.UseJumpPower = true
	hum.JumpPower = 0
	root.CFrame = car.DriverSeat.CFrame + Vector3.new(0, 2, 0)
	car.DriverSeat:Sit(hum)
	-- the web game shows no driver (the avatar is taller than the cabin and stuck out through the roof)
	for _, p in ipairs(char:GetDescendants()) do
		if p:IsA("BasePart") or p:IsA("Decal") then p.Transparency = 1 end
	end
	plr:SetAttribute("CarReady", os.clock())
end

-- the device has attached to its car: let it go (unanchored, owned by that device, gravity cancelled by its Lift force)
Remotes.CarReady.OnServerEvent:Connect(function(plr, m)
	if typeof(m) ~= "Instance" or m.Name ~= "Car_" .. plr.UserId or m.Parent ~= Workspace then return end
	local body = m:FindFirstChild("Body")
	if not (body and body.Anchored) then return end
	body.Anchored = false
	local lift = body:FindFirstChild("Lift")
	if lift then lift.Force = Vector3.new(0, body.AssemblyMass * Workspace.Gravity, 0) end
	pcall(function() body:SetNetworkOwner(plr) end)
end)

Remotes.ResetCar.OnServerEvent:Connect(function(plr)
	local d = PlayerData.data[plr]
	if d and (not d.lastReset or os.clock() - d.lastReset > 3) then
		d.lastReset = os.clock()
		Spawner.spawn(plr, true)
	end
end)

return Spawner
