-- Irbid Drive (Roblox) - players, cars, cash, saving and purchases.
-- Each player always drives: on spawn the server builds their car, seats them and gives their client network ownership; the client
-- (CarClient) runs the driving model and sends banked drift points, which the server checks (rate cap) and turns into cash.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")
local PhysicsService = game:GetService("PhysicsService")
local Workspace = game:GetService("Workspace")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local S = Config.SCALE
-- characters load only once the map exists (otherwise they fall through the empty world while WorldBuilder runs)
Players.CharacterAutoLoads = false

-- remotes
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
local BankDrift = Instance.new("RemoteEvent"); BankDrift.Name = "BankDrift"; BankDrift.Parent = remotes
local CarAction = Instance.new("RemoteFunction"); CarAction.Name = "CarAction"; CarAction.Parent = remotes
local ResetCar = Instance.new("RemoteEvent"); ResetCar.Name = "ResetCar"; ResetCar.Parent = remotes
remotes.Parent = ReplicatedStorage

-- cars and drivers do not collide with the world through the physics engine: the client does its own ground and wall tests
pcall(function() PhysicsService:RegisterCollisionGroup("Drive") end)
PhysicsService:CollisionGroupSetCollidable("Drive", "Default", false)
PhysicsService:CollisionGroupSetCollidable("Drive", "Drive", false)

-- ---- saving (works in a published game; in Studio enable "Studio Access to API Services" to test it) ----
local store
pcall(function() store = DataStoreService:GetDataStore("IrbidDrive_v1") end)
local data = {} -- [player] = {cash, owned = {[i]=true}, cur, drift}

local function load(plr)
	local d
	if store then
		local ok, v = pcall(function() return store:GetAsync("u" .. plr.UserId) end)
		if ok and type(v) == "table" then d = v end
	end
	d = d or {}
	local owned = {}
	for _, i in ipairs(d.owned or {}) do if Config.CARS[i] then owned[i] = true end end
	owned[1] = true
	local cur = (type(d.cur) == "number" and owned[d.cur]) and d.cur or 1
	return { cash = math.max(0, tonumber(d.cash) or Config.START_CASH), owned = owned, cur = cur, drift = tonumber(d.drift) or 0, last = os.clock() }
end

local function save(plr)
	local d = data[plr]
	if not (d and store) then return end
	local owned = {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	pcall(function()
		store:SetAsync("u" .. plr.UserId, { cash = math.floor(d.cash), owned = owned, cur = d.cur, drift = math.floor(d.drift) })
	end)
end

local function vip(plr)
	if Config.GAMEPASS_VIP == 0 then return false end
	local ok, has = pcall(function() return MarketplaceService:UserOwnsGamePassAsync(plr.UserId, Config.GAMEPASS_VIP) end)
	return ok and has
end

local function syncStats(plr)
	local d = data[plr]
	local ls = plr:FindFirstChild("leaderstats")
	if not (d and ls) then return end
	ls.Cash.Value = math.floor(d.cash)
	ls.Drift.Value = math.floor(d.drift)
	local owned = {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	plr:SetAttribute("Owned", table.concat(owned, ","))
	plr:SetAttribute("CurCar", d.cur)
	plr:SetAttribute("VIP", d.vip == true)
end

-- ---- the car: a simple body (no brand), four wheels and a seat, all welded; the client moves it ----
local function buildCar(spec, color)
	local L, W, H = spec.L * S, spec.W * S, spec.H * S
	local m = Instance.new("Model")
	m.Name = "Car"
	local body = Instance.new("Part")
	body.Name = "Body"
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
	add("Cabin", Vector3.new(W * 0.86, H * 0.45, L * 0.48), CFrame.new(0, H * 0.48, L * 0.05), Color3.fromRGB(30, 36, 44), Enum.Material.Glass)
	local wr = H * 0.22
	for _, q in ipairs({ { 1, -1 }, { -1, -1 }, { 1, 1 }, { -1, 1 } }) do
		add("Wheel", Vector3.new(W * 0.12, wr * 2, wr * 2), CFrame.new(q[1] * W * 0.47, -H * 0.12, q[2] * L * 0.32), Color3.fromRGB(20, 20, 20), Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
	end
	for _, x in ipairs({ -1, 1 }) do
		add("Headlight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, -L * 0.5), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
		add("Taillight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, L * 0.5), Color3.fromRGB(200, 20, 20), Enum.Material.Neon)
	end
	local seat = add("Seat", Vector3.new(2, 0.4, 2), CFrame.new(-W * 0.2, H * 0.12, L * 0.08), color, nil, nil)
	local s2 = Instance.new("Seat")
	s2.Name = "DriverSeat"
	s2.Size = seat.Size
	s2.CFrame = seat.CFrame
	s2.Transparency = 1
	s2.Massless = true
	s2.Parent = m
	seat:Destroy()
	local w = Instance.new("WeldConstraint"); w.Part0 = body; w.Part1 = s2; w.Parent = s2
	-- counter gravity so the client's position updates are not fought by the physics engine
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
	for k, v in pairs({ vm = spec.vm, a0 = spec.a0, bk = spec.bk, hd = spec.hd, carName = spec.name }) do m:SetAttribute(k, v) end
	return m
end

local COLORS = { Color3.fromRGB(20, 90, 200), Color3.fromRGB(200, 30, 30), Color3.fromRGB(240, 240, 240), Color3.fromRGB(250, 170, 0), Color3.fromRGB(20, 160, 90), Color3.fromRGB(120, 40, 180) }

local function spawnCar(plr)
	local char = plr.Character
	local d = data[plr]
	if not (char and d) then return end
	local hum = char:FindFirstChildOfClass("Humanoid")
	local root = char:FindFirstChild("HumanoidRootPart")
	if not (hum and root) then return end
	local old = Workspace:FindFirstChild("Car_" .. plr.UserId)
	if old then old:Destroy() end
	while not Workspace:GetAttribute("MapReady") do task.wait(0.5) end
	local spec = Config.CARS[d.cur]
	local car = buildCar(spec, COLORS[(plr.UserId % #COLORS) + 1])
	car.Name = "Car_" .. plr.UserId
	car:SetAttribute("Owner", plr.UserId)
	-- each player starts a little apart along the start street
	local off = (#Players:GetPlayers() - 1) % 6
	local h = Workspace:GetAttribute("StartHeading") or 0
	local f = Vector3.new(math.sin(h), 0, math.cos(h))
	local pos = Vector3.new(0, (Workspace:GetAttribute("StartY") or 0) * S + spec.H * S * 0.6, 0) - f * off * 8 * S
	car:PivotTo(CFrame.lookAt(pos, pos + f))
	car.Parent = Workspace
	for _, p in ipairs(char:GetDescendants()) do
		if p:IsA("BasePart") then p.CollisionGroup = "Drive"; p.CanQuery = false end
	end
	hum.UseJumpPower = true
	hum.JumpPower = 0
	root.CFrame = car.DriverSeat.CFrame + Vector3.new(0, 2, 0)
	car.DriverSeat:Sit(hum)
	task.wait(0.2)
	pcall(function() car.Body:SetNetworkOwner(plr) end)
	plr:SetAttribute("CarReady", os.clock())
end

local function setup(plr)
	local d = load(plr)
	d.vip = vip(plr)
	data[plr] = d
	local ls = Instance.new("Folder"); ls.Name = "leaderstats"; ls.Parent = plr
	local c = Instance.new("IntValue"); c.Name = "Cash"; c.Parent = ls
	local dr = Instance.new("IntValue"); dr.Name = "Drift"; dr.Parent = ls
	syncStats(plr)
	plr.CharacterAdded:Connect(function(char)
		local hum = char:WaitForChild("Humanoid")
		hum.Died:Connect(function()
			task.wait(2)
			if plr.Parent then plr:LoadCharacter() end
		end)
		task.wait(0.5)
		spawnCar(plr)
	end)
	while not Workspace:GetAttribute("MapReady") do task.wait(0.5) end
	if plr.Parent then plr:LoadCharacter() end
end

do
	local Meta = require(game:GetService("ServerStorage"):WaitForChild("IrbidData"):WaitForChild("Meta"))
	Workspace:SetAttribute("StartHeading", Meta.startHeading)
	Workspace:SetAttribute("StartY", Meta.startY)
	Workspace:SetAttribute("Attribution", Meta.attribution)
end

Players.PlayerAdded:Connect(setup)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(setup, p) end
Players.PlayerRemoving:Connect(function(plr)
	save(plr)
	local car = Workspace:FindFirstChild("Car_" .. plr.UserId)
	if car then car:Destroy() end
	data[plr] = nil
end)
game:BindToClose(function()
	for _, p in ipairs(Players:GetPlayers()) do save(p) end
end)
task.spawn(function()
	while true do
		task.wait(120)
		for _, p in ipairs(Players:GetPlayers()) do save(p) end
	end
end)

-- ---- drift points -> cash (server-side cap: at most ~600 points per second of driving since the last bank) ----
BankDrift.OnServerEvent:Connect(function(plr, pts)
	local d = data[plr]
	if not d or type(pts) ~= "number" or pts ~= pts or pts <= 0 then return end
	local now = os.clock()
	local cap = math.min(30000, (now - d.last) * 600)
	d.last = now
	pts = math.floor(math.min(pts, cap))
	d.drift += pts
	d.cash += pts * Config.DRIFT_CASH * (d.vip and 2 or 1)
	syncStats(plr)
end)

ResetCar.OnServerEvent:Connect(function(plr)
	local d = data[plr]
	if d and (not d.lastReset or os.clock() - d.lastReset > 3) then
		d.lastReset = os.clock()
		spawnCar(plr)
	end
end)

-- ---- garage: buy / use cars (cash), buy cash packs or VIP (Robux, only when the IDs are set in Config) ----
CarAction.OnServerInvoke = function(plr, action, i)
	local d = data[plr]
	if not d then return false, "not ready" end
	if action == "use" or action == "buy" then
		local spec = type(i) == "number" and Config.CARS[i]
		if not spec then return false, "no such car" end
		if spec.vip and not d.vip then
			if Config.GAMEPASS_VIP ~= 0 then MarketplaceService:PromptGamePassPurchase(plr, Config.GAMEPASS_VIP) end
			return false, "VIP car"
		end
		if not d.owned[i] then
			if d.cash < spec.price then return false, "not enough cash" end
			d.cash -= spec.price
			d.owned[i] = true
		end
		d.cur = i
		syncStats(plr)
		save(plr)
		spawnCar(plr)
		return true, spec.name
	elseif action == "cash_small" and Config.PRODUCT_CASH_SMALL ~= 0 then
		MarketplaceService:PromptProductPurchase(plr, Config.PRODUCT_CASH_SMALL)
	elseif action == "cash_big" and Config.PRODUCT_CASH_BIG ~= 0 then
		MarketplaceService:PromptProductPurchase(plr, Config.PRODUCT_CASH_BIG)
	elseif action == "vip" and Config.GAMEPASS_VIP ~= 0 then
		MarketplaceService:PromptGamePassPurchase(plr, Config.GAMEPASS_VIP)
	end
	return true
end

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(plr, id, bought)
	if bought and id == Config.GAMEPASS_VIP and data[plr] then
		data[plr].vip = true
		syncStats(plr)
	end
end)

-- developer products: grant once per receipt (Roblox retries until we return PurchaseGranted)
local granted = {}
MarketplaceService.ProcessReceipt = function(info)
	local plr = Players:GetPlayerByUserId(info.PlayerId)
	local d = plr and data[plr]
	if not d then return Enum.ProductPurchaseDecision.NotProcessedYet end
	if granted[info.PurchaseId] then return Enum.ProductPurchaseDecision.PurchaseGranted end
	local add = (info.ProductId == Config.PRODUCT_CASH_SMALL and Config.CASH_SMALL) or (info.ProductId == Config.PRODUCT_CASH_BIG and Config.CASH_BIG) or 0
	if add == 0 then return Enum.ProductPurchaseDecision.NotProcessedYet end
	d.cash += add
	granted[info.PurchaseId] = true
	syncStats(plr)
	save(plr)
	return Enum.ProductPurchaseDecision.PurchaseGranted
end
