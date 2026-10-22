-- Irbid Drive (Roblox) - the player's device: loads the road graph, starts the modules in Client/ and runs them every frame.
-- What each module does is written at the top of its file. Order of a frame: controls -> the player's car (Drive) -> traffic ->
-- races / heist (Missions) -> street name, GPS, minimap (Nav) -> camera -> info line -> messages.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Road = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Road"))
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Client = script.Parent:WaitForChild("Client")
local State = require(Client:WaitForChild("State"))
local Meta = require(Shared:WaitForChild("Meta"))

local plr = Players.LocalPlayer

-- the road graph (traffic, GPS, minimap, street names, reset)
do
	local edges, i = {}, 1
	while Shared:FindFirstChild("GraphEdges" .. i) do
		edges[#edges + 1] = require(Shared["GraphEdges" .. i])
		i += 1
	end
	State.road = Road.build(require(Shared:WaitForChild("GraphNodes")), edges, require(Shared:WaitForChild("GraphNames")))
end
local Signals = require(Client:WaitForChild("Signals"))
Signals.attach(State.road)
while not Workspace:GetAttribute("MapReady") do task.wait(0.25) end

local Hud = require(Client:WaitForChild("Hud"))
local Controls = require(Client:WaitForChild("Controls"))
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))
local Nav = require(Client:WaitForChild("Nav"))
local Missions = require(Client:WaitForChild("Missions"))
local Menus = require(Client:WaitForChild("Menus"))
local InfoLine = require(Client:WaitForChild("InfoLine"))
local Extras = require(Client:WaitForChild("Extras"))
local Handling = require(Client:WaitForChild("Handling"))
local SettingsMenu = require(Client:WaitForChild("SettingsMenu"))
local Weather = require(Client:WaitForChild("Weather"))
local Gamepad = require(Client:WaitForChild("Gamepad"))
local CarAudio = require(Client:WaitForChild("CarAudio"))
local Camera = require(Client:WaitForChild("Camera"))
local Bump = require(Client:WaitForChild("Bump"))
local CarDamage = require(Client:WaitForChild("CarDamage"))
local CarDamageFx = require(Client:WaitForChild("CarDamageFx"))
local Diagnostics = require(Client:WaitForChild("Diagnostics"))
local SpeedBumps = require(Client:WaitForChild("SpeedBumps"))
local Reputation = require(Client:WaitForChild("Reputation"))
local AutoDrive = require(Client:WaitForChild("AutoDrive"))
local School = require(Client:WaitForChild("School"))
local TrafficDensity = require(Client:WaitForChild("TrafficDensity"))
require(Client:WaitForChild("Accessibility"))
local Props = require(Client:WaitForChild("Props"))
local RoadsideObjects = require(Client:WaitForChild("RoadsideObjects"))
local Race = require(Client:WaitForChild("Race"))
local Laws = require(Client:WaitForChild("Laws"))
-- the weather line in the settings menu (the web game's pause menu shows it under the weather row)
table.insert(SettingsMenu.extra, { name = "weather", text = Weather.line, click = function() end, color = Color3.fromRGB(40, 60, 80) })
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- the tuning shop opens only at Apex Drift Customs
function Missions.openShop()
	if Missions.nearShop() then
		Menus.shop()
	else
		Hud.toast("Apex Drift Customs is the orange pad: find it on the minimap")
	end
end

Controls.start({
	reset = Drive.reset, camera = Drive.cycleCam, wheel = Menus.wheel, garage = Menus.garage, gps = Nav.open,
	nextCar = function() Extras.cycleCar(1) end, prevCar = function() Extras.cycleCar(-1) end,
	tour = Extras.tour, ramps = Extras.ramps, hour = function()
		Weather.onHourKey()
		Extras.hour()
	end, horn = Extras.horn,
	race = Missions.race, shop = Missions.openShop,
	eKey = function() Handling.eKey(Missions.rob) end, gearDown = function() Handling.shift(-1) end,
	handling = Handling.toggle, settings = SettingsMenu.open, mute = CarAudio.toggleMute,
	damage = CarDamage.cycle, diag = Diagnostics.toggle, autodrive = AutoDrive.toggle,
})

Traffic.start()
Traffic.density(TrafficDensity.den(), false)
Hud.toast("Welcome to Irbid! Drift for points · R race / duel · M GPS · G wheel · K tour · F start", 6)

local ai = State.ai
-- vehicle damage: the physics hooks, impacts with walls (Drive) and cars (Bump) -> sound + damage, hard landings, speed bumps (the
-- thump is heard whenever the suspension bottoms out, as in the web game), the looks, the Damage / Repair buttons
Drive.damage = CarDamage
table.insert(CarDamage.changed, CarDamageFx.refresh)
CarDamage.onImpact = function(r, v) CarDamageFx.sparks(r, v) end
Drive.onWall = function(v, nx, nz, part)
	CarAudio.hit(v)
	local r = CarDamage.wall(v, nx, nz, part)
	if r then RoadsideObjects.apply(r, State.st, nx, nz, v) end
end
-- the roadside objects: the crash sound on every hit (as the web game's audio wrapper), damage and the object's reaction with damage on
Drive.objects = RoadsideObjects.collide
RoadsideObjects.impact = function(v, ob, nx, nz)
	CarAudio.hit(v)
	return CarDamage.object(v, ob, nx, nz)
end
Bump.onImpact = function(v, _, nx, nz)
	CarAudio.hit(v)
	CarDamage.vehicle(v, nx, nz)
end
Drive.onLand = CarDamage.landing
SpeedBumps.onImpact = function(speed, sev, axle)
	CarAudio.bump(sev)
	CarDamage.speedBump(speed, sev, axle)
end
-- road reputation and rival memory; auto-drive takes the controls unless the player gives any input (the web game: above 0.15)
Laws.onFine = function(k)
	Reputation.event(k)
	School.onFine(k)
end
table.insert(SettingsMenu.extra, { name = "school", text = function() return "🎓 Driving school (5 lessons on real streets)" end, click = School.menu, color = Color3.fromRGB(30, 90, 60) })
-- the car encyclopedia (the real-world vehicle catalogue, browse only) and the data credits
local CarCatalog = require(Client:WaitForChild("CarCatalog"))
table.insert(SettingsMenu.extra, { name = "catalog", text = function() return "📖 Car encyclopedia (real-world specs)" end, click = CarCatalog.open, color = Color3.fromRGB(40, 70, 110) })
table.insert(SettingsMenu.extra, { name = "credits", text = function() return "© Credits & licences" end, click = CarCatalog.credits, color = Color3.fromRGB(70, 70, 80) })
Race.onStart = Reputation.raceStart
Race.onFinish = Reputation.raceEnd
Reputation.onHonk = CarAudio.honkAt
table.insert(SettingsMenu.extra, { name = "reputation", text = Reputation.line, click = function() end, color = Color3.fromRGB(40, 60, 80) })
Controls.after = function(inp, dt)
	local user = inp.th > 0.15 or inp.br > 0.15 or math.abs(inp.steer) > 0.15 or inp.hb
	AutoDrive.apply(inp, user, dt)
end
Diagnostics.buttons(Missions.openShop, Missions.nearShop, function()
	Nav.go({ n = "Apex Drift Customs", x = Meta.shop.x, z = Meta.shop.z })
end)
RunService.RenderStepped:Connect(function(dt)
	Controls.read(dt)
	-- every AI car of this frame, for bumping, following and the minimap
	table.clear(ai)
	for _, a in ipairs(Traffic.agents) do ai[#ai + 1] = a end
	for _, a in ipairs(Missions.rivals) do ai[#ai + 1] = a end
	for _, a in ipairs(Missions.cops) do ai[#ai + 1] = a end
	for _, a in ipairs(Missions.duelRivals) do ai[#ai + 1] = a end
	Drive.step(dt)
	Handling.step()
	Gamepad.rumble(dt)
	Weather.step(dt)
	Reputation.step(dt)
	School.step(dt)
	TrafficDensity.step(dt)
	Props.step(dt, State.st)
	RoadsideObjects.step(dt)
	CarDamage.step(dt)
	State.damageSmoke = CarDamage.smoking
	CarDamageFx.step(dt, CarDamage.mode(), CarDamage.tyres)
	CarAudio.step(dt, Drive.paved(), Camera.mode())
	Traffic.step(dt)
	Missions.step(dt)
	Nav.step(dt)
	Signals.step()
	Drive.camera(dt)
	InfoLine.step(dt)
	Hud.step(dt)
end)

-- keep the seat: if the player somehow stands up, the server seats them again
plr.CharacterAdded:Connect(function()
	task.wait(1)
	if State.car and not State.car.Parent then Remotes.ResetCar:FireServer() end
end)
