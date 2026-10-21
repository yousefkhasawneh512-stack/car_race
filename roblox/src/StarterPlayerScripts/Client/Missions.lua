-- Irbid Drive (Roblox) - the missions in one place: races (Race), the bank heist (Heist, Police), and the context button at the
-- bottom of the screen ("ROB THE BANK" at the bank, "TUNE CAR" at Apex Drift Customs).
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Race = require(Client:WaitForChild("Race"))
local Heist = require(Client:WaitForChild("Heist"))
local Police = require(Client:WaitForChild("Police"))

local Missions = {}
local st = State.st
Missions.circuits = Race.circuits
Missions.rivals = Race.rivals
Missions.cops = Police.cops
Missions.race = Race.toggle
Missions.rob = Heist.rob
-- Missions.openShop is set by Main (it needs the menus)

function Missions.nearShop()
	return (Meta.shop.x - st.x) ^ 2 + (Meta.shop.z - st.z) ^ 2 < 14 * 14
end

-- the current race / heist tables (or nil), read-only for tests
function Missions.debug()
	return Race.current(), Heist.current()
end

function Missions.step(dt)
	Race.step(dt)
	Heist.step(dt)
	Police.lights(dt)
	if State.ui then return end
	local busy = State.mission ~= nil
	if not busy and Heist.nearBank() then
		local openAt = Players.LocalPlayer:GetAttribute("BankOpenAt") or 0
		if Workspace.DistributedGameTime < openAt then
			Hud.context("Bank closed · back in " .. math.ceil(openAt - Workspace.DistributedGameTime) .. " s", function() end, Color3.fromRGB(90, 90, 90))
		else
			Hud.context("🏦 ROB THE BANK (E)", Missions.rob)
		end
	elseif State.mission ~= "heist" and Missions.nearShop() then
		Hud.context("🔧 TUNE CAR (U)", Missions.openShop, Color3.fromRGB(230, 110, 0))
	else
		Hud.context(nil)
	end
end

return Missions
