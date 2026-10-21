-- Irbid Drive (Roblox) - players, cars, money, upgrades, the car wheel, race and heist rewards, saving, purchases, day and night.
-- Each player always drives: on spawn the server builds their car, seats them and gives their device network ownership; the device
-- (StarterPlayerScripts/Main + Client modules) runs the driving model, traffic, races and the heist, and asks the server for every
-- change of money, which the server checks (rate caps, minimum times, distances) before it pays.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")
local PhysicsService = game:GetService("PhysicsService")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Meta = require(Shared:WaitForChild("Meta"))
local Circuits = require(Shared:WaitForChild("Circuits"))
local S = Config.SCALE
-- characters load only once the map exists (otherwise they fall through the empty world while WorldBuilder runs)
Players.CharacterAutoLoads = false

Workspace:SetAttribute("StartHeading", Meta.startHeading)
Workspace:SetAttribute("StartY", Meta.startY)
Workspace:SetAttribute("Attribution", Meta.attribution)

-- ---- remotes ----
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
local function remote(cls, name)
	local r = Instance.new(cls)
	r.Name = name
	r.Parent = remotes
	return r
end
local BankDrift = remote("RemoteEvent", "BankDrift")
local CarAction = remote("RemoteFunction", "CarAction")
local ResetCar = remote("RemoteEvent", "ResetCar")
local CarReady = remote("RemoteEvent", "CarReady")
local Mission = remote("RemoteFunction", "Mission")
remotes.Parent = ReplicatedStorage

-- cars and drivers do not collide with the world through the physics engine: the devices do their own ground and wall tests
pcall(function() PhysicsService:RegisterCollisionGroup("Drive") end)
PhysicsService:CollisionGroupSetCollidable("Drive", "Default", false)
PhysicsService:CollisionGroupSetCollidable("Drive", "Drive", false)

-- ---- saving (works in a published game; in Studio enable "Studio Access to API Services" to test it) ----
local store
pcall(function() store = DataStoreService:GetDataStore("IrbidDrive_v1") end)
local data = {} -- [player] = {cash, bank, dt, owned = {[i]=true}, cur, tune = {[i] = {4 levels}}, vip, last, ...}

local function cleanLevels(t)
	local l = {}
	for k = 1, 4 do
		local v = type(t) == "table" and tonumber(t[k]) or 0
		l[k] = math.clamp(math.floor(v or 0), 0, Config.UPGRADE_MAX)
	end
	return l
end

local function load(plr)
	local d
	if store then
		local ok, v = pcall(function() return store:GetAsync("u" .. plr.UserId) end)
		if ok and type(v) == "table" then d = v end
	end
	d = d or {}
	local owned = {}
	for _, i in ipairs(type(d.owned) == "table" and d.owned or {}) do
		if Config.CARS[i] then owned[i] = true end
	end
	owned[1] = true
	local tune = {}
	if type(d.tune) == "table" then
		for k, t in pairs(d.tune) do
			local i = tonumber(k)
			if i and Config.CARS[i] then tune[i] = cleanLevels(t) end
		end
	end
	local cur = (type(d.cur) == "number" and owned[d.cur]) and d.cur or 1
	-- version 1 saves (the first Roblox build) had only a lifetime "drift" total
	local dt = tonumber(d.dt) or tonumber(d.drift) or 0
	return {
		cash = math.max(0, tonumber(d.cash) or Config.START_CASH), bank = math.max(0, tonumber(d.bank) or 0), dt = math.max(0, dt),
		owned = owned, cur = cur, tune = tune, last = os.clock(), heistCool = 0,
	}
end

local function save(plr)
	local d = data[plr]
	if not (d and store) then return end
	local owned, tune = {}, {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	for i, t in pairs(d.tune) do tune[tostring(i)] = t end
	pcall(function()
		store:SetAsync("u" .. plr.UserId, { v = 2, cash = math.floor(d.cash), bank = math.floor(d.bank), dt = math.floor(d.dt), owned = owned, cur = d.cur, tune = tune })
	end)
end

local function vipOwned(plr)
	if Config.GAMEPASS_VIP == 0 then return false end
	local ok, has = pcall(function() return MarketplaceService:UserOwnsGamePassAsync(plr.UserId, Config.GAMEPASS_VIP) end)
	return ok and has
end

local function levels(d, i)
	local t = d.tune[i]
	if not t then
		t = { 0, 0, 0, 0 }
		d.tune[i] = t
	end
	return t
end

local function syncStats(plr)
	local d = data[plr]
	local ls = plr:FindFirstChild("leaderstats")
	if not (d and ls) then return end
	ls.Cash.Value = math.floor(d.cash)
	ls.Drift.Value = math.floor(d.dt)
	local owned = {}
	for i in pairs(d.owned) do owned[#owned + 1] = i end
	table.sort(owned)
	plr:SetAttribute("Owned", table.concat(owned, ","))
	plr:SetAttribute("CurCar", d.cur)
	plr:SetAttribute("VIP", d.vip == true)
	plr:SetAttribute("Cash", math.floor(d.cash))
	plr:SetAttribute("DriftBank", math.floor(d.bank))
	plr:SetAttribute("Tune", table.concat(levels(d, d.cur), ","))
end

-- ---- the car: a simple body (no brand), cabin, four wheels, lights and a seat, all welded; the player's device moves it ----
local night = false
local function buildCar(spec, color, carIndex)
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
	local wr = H * 0.22
	for _, q in ipairs({ { 1, -1 }, { -1, -1 }, { 1, 1 }, { -1, 1 } }) do
		add("Wheel", Vector3.new(W * 0.12, wr * 2, wr * 2), CFrame.new(q[1] * W * 0.47, -H * 0.12, q[2] * L * 0.32), Color3.fromRGB(20, 20, 20), Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
	end
	for _, x in ipairs({ -1, 1 }) do
		local hl = add("Headlight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, -L * 0.5), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
		local sl = Instance.new("SpotLight")
		sl.Name = "Beam"
		sl.Face = Enum.NormalId.Front
		sl.Range = 40 * S
		sl.Angle = 70
		sl.Brightness = 3
		sl.Enabled = night
		sl.Parent = hl
		add("Taillight", Vector3.new(W * 0.18, H * 0.08, 0.2), CFrame.new(x * W * 0.32, H * 0.05, L * 0.5), Color3.fromRGB(140, 10, 10), Enum.Material.Neon)
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

local COLORS = { Color3.fromRGB(20, 90, 200), Color3.fromRGB(200, 30, 30), Color3.fromRGB(240, 240, 240), Color3.fromRGB(250, 170, 0), Color3.fromRGB(20, 160, 90), Color3.fromRGB(120, 40, 180) }

-- builds the player's current car and seats them. keep = put it where the old car was (car change, reset), else at the start street
local function spawnCar(plr, keep)
	local char = plr.Character
	local d = data[plr]
	if not (char and d) then return end
	local hum = char:FindFirstChildOfClass("Humanoid")
	local root = char:FindFirstChild("HumanoidRootPart")
	if not (hum and root) then return end
	local waited = 0
	while not Workspace:GetAttribute("MapReady") and waited < 90 do
		waited += 0.5
		task.wait(0.5)
	end
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
	local car = buildCar(spec, COLORS[(plr.UserId % #COLORS) + 1], d.cur)
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
	plr:SetAttribute("CarReady", os.clock())
end

-- the device has attached to its car: let it go (unanchored, owned by that device, gravity cancelled by its Lift force)
CarReady.OnServerEvent:Connect(function(plr, m)
	if typeof(m) ~= "Instance" or m.Name ~= "Car_" .. plr.UserId or m.Parent ~= Workspace then return end
	local body = m:FindFirstChild("Body")
	if not (body and body.Anchored) then return end
	body.Anchored = false
	local lift = body:FindFirstChild("Lift")
	if lift then lift.Force = Vector3.new(0, body.AssemblyMass * Workspace.Gravity, 0) end
	pcall(function() body:SetNetworkOwner(plr) end)
end)

local function setup(plr)
	local d = load(plr)
	d.vip = vipOwned(plr)
	if d.vip then
		for i, c in ipairs(Config.CARS) do
			if c.vip then d.owned[i] = true end
		end
	end
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
		spawnCar(plr, false)
	end)
	local waited = 0
	while not Workspace:GetAttribute("MapReady") and waited < 90 do
		waited += 0.5
		task.wait(0.5)
	end
	if plr.Parent then plr:LoadCharacter() end
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

-- ---- drift points -> drift bank (upgrades) + cash. Server cap: points per second of driving since the last bank, scaled by the car's
-- rarity and drift upgrade (the most a long, fast, full-combo drift can score), and never more than 60,000 at once ----
BankDrift.OnServerEvent:Connect(function(plr, pts)
	local d = data[plr]
	if not d or type(pts) ~= "number" or pts ~= pts or pts <= 0 then return end
	local now = os.clock()
	local t = Config.tuned(d.cur, levels(d, d.cur))
	local cap = math.min(60000, (now - d.last) * 1500 * t.rm * (1 + 0.2 * t.dr))
	d.last = now
	pts = math.floor(math.min(pts, cap))
	d.bank += pts
	d.dt += pts
	d.cash += pts * Config.DRIFT_CASH * (d.vip and 2 or 1)
	syncStats(plr)
end)

ResetCar.OnServerEvent:Connect(function(plr)
	local d = data[plr]
	if d and (not d.lastReset or os.clock() - d.lastReset > 3) then
		d.lastReset = os.clock()
		spawnCar(plr, true)
	end
end)

-- ---- the car wheel: tier by the web game's odds, then one of that tier's (non-VIP) cars ----
local function spinWheel(d)
	local r, a, tier = math.random(), 0, 0
	for i, p in ipairs(Config.WHEEL_ODDS) do
		a += p
		if r < a then
			tier = i - 1
			break
		end
	end
	for t = tier, 0, -1 do
		local pool = {}
		for i, c in ipairs(Config.CARS) do
			if c.tier == t and not c.vip then pool[#pool + 1] = i end
		end
		if #pool > 0 then
			return pool[math.random(#pool)], t
		end
	end
	return 1, 0
end

-- ---- garage, tuning shop, wheel; Robux buttons only when the IDs are set in Config ----
local function nearSite(plr, site, metres)
	local car = Workspace:FindFirstChild("Car_" .. plr.UserId)
	if not (car and car.PrimaryPart) then return false end
	local p = car.PrimaryPart.Position / S
	return math.sqrt((p.X - site.x) ^ 2 + (p.Z - site.z) ^ 2) <= metres
end

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
			if d.cash < spec.price then return false, "Not enough cash" end
			d.cash -= spec.price
			d.owned[i] = true
		end
		d.cur = i
		syncStats(plr)
		save(plr)
		spawnCar(plr, true)
		return true, spec.name
	elseif action == "upgrade" then
		local part = type(i) == "number" and Config.UPGRADES[i] and i
		if not part then return false, "no such part" end
		if not nearSite(plr, Meta.shop, 40) then return false, "Drive to Apex Drift Customs first" end
		local l = levels(d, d.cur)
		if l[part] >= Config.UPGRADE_MAX then return false, "Already at the top level" end
		local price = Config.upgradePrice(part, l[part])
		if d.bank < price then return false, "Not enough drift points" end
		d.bank -= price
		l[part] += 1
		syncStats(plr)
		save(plr)
		return true, l[part]
	elseif action == "spin" then
		if d.cash < Config.WHEEL_COST then return false, "Not enough cash" end
		d.cash -= Config.WHEEL_COST
		local car, tier = spinWheel(d)
		local dup = d.owned[car] == true
		if dup then
			d.cash += Config.WHEEL_REFUND
		else
			d.owned[car] = true
			d.cur = car
		end
		syncStats(plr)
		save(plr)
		if not dup then task.spawn(spawnCar, plr, true) end
		return true, { car = car, tier = tier, dup = dup }
	elseif action == "cash_small" and Config.PRODUCT_CASH_SMALL ~= 0 then
		MarketplaceService:PromptProductPurchase(plr, Config.PRODUCT_CASH_SMALL)
	elseif action == "cash_big" and Config.PRODUCT_CASH_BIG ~= 0 then
		MarketplaceService:PromptProductPurchase(plr, Config.PRODUCT_CASH_BIG)
	elseif action == "vip" and Config.GAMEPASS_VIP ~= 0 then
		MarketplaceService:PromptGamePassPurchase(plr, Config.GAMEPASS_VIP)
	end
	return true
end

-- ---- races and the heist: the device plays them; the server pays only for results that are possible ----
local circuitLen = {}
for _, c in ipairs(Circuits) do
	local v, len, px, pz = {}, 0, nil, nil
	for n in string.gmatch(c.path, "-?%d+") do v[#v + 1] = tonumber(n) / 10 end
	for k = 1, #v, 3 do
		if px then len += math.sqrt((v[k] - px) ^ 2 + (v[k + 1] - pz) ^ 2) end
		px, pz = v[k], v[k + 1]
	end
	circuitLen[c.name] = len
end

Mission.OnServerInvoke = function(plr, action, arg)
	local d = data[plr]
	if not d then return false, "not ready" end
	local now = os.clock()
	if action == "race_start" then
		if type(arg) ~= "string" or not circuitLen[arg] then return false, "no such race" end
		d.race = { name = arg, t0 = now }
		return true
	elseif action == "race_cancel" then
		d.race = nil
		return true
	elseif action == "race_finish" then
		local r = d.race
		d.race = nil
		if not r or type(arg) ~= "number" then return false, "no race" end
		-- no car can lap faster than its top speed (+20 %) the whole way, from the 3 s countdown on
		local t = Config.tuned(d.cur, levels(d, d.cur))
		if now - r.t0 < 3 + circuitLen[r.name] / (t.vm * 1.2) then return false, "Result not accepted" end
		local reward = Config.RACE_REWARD[math.clamp(math.floor(arg), 1, #Config.RACE_REWARD)] or 0
		d.cash += reward
		syncStats(plr)
		save(plr)
		return true, reward
	elseif action == "heist_start" then
		if now < d.heistCool then return false, "The bank is closed for now" end
		if not nearSite(plr, Meta.bank, 30) then return false, "Drive to the bank first" end
		d.heist = now
		return true
	elseif action == "heist_end" then
		local t0 = d.heist
		d.heist = nil
		if not t0 then return false, "no heist" end
		d.heistCool = now + Config.HEIST_COOLDOWN
		plr:SetAttribute("BankOpenAt", Workspace.DistributedGameTime + Config.HEIST_COOLDOWN)
		if arg == true then
			if now - t0 < Config.HEIST_TIME - 3 then return false, "Result not accepted" end
			d.cash += Config.HEIST_REWARD
			syncStats(plr)
			save(plr)
			return true, Config.HEIST_REWARD
		end
		local loss = math.min(Config.HEIST_FINE, math.floor(d.cash))
		d.cash -= loss
		syncStats(plr)
		save(plr)
		return true, -loss
	end
	return false, "unknown action"
end

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(plr, id, bought)
	local d = data[plr]
	if bought and id == Config.GAMEPASS_VIP and d then
		d.vip = true
		for i, c in ipairs(Config.CARS) do
			if c.vip then d.owned[i] = true end
		end
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

-- ---- day and night: one in-game day every Config.DAY_MINUTES real minutes; car headlights on at night ----
task.spawn(function()
	local t0 = os.clock()
	while true do
		local h = (9 + (os.clock() - t0) / (Config.DAY_MINUTES * 60) * 24) % 24
		Lighting.ClockTime = h
		local nowNight = h < 6.3 or h > 18.2
		if nowNight ~= night then
			night = nowNight
			for _, m in ipairs(Workspace:GetChildren()) do
				if m:IsA("Model") and string.sub(m.Name, 1, 4) == "Car_" then
					for _, l in ipairs(m:GetDescendants()) do
						if l:IsA("SpotLight") then l.Enabled = night end
					end
				end
			end
		end
		Workspace:SetAttribute("Night", night)
		task.wait(1)
	end
end)
