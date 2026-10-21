-- Irbid Drive (Roblox) - the server side of the game. Each job has its own module in Game/:
--   Remotes       the remotes the devices use            PlayerData   progress, saving, leaderboard, attributes
--   CarBuilder    the car model                          Spawner      seat players in their cars, hand cars to devices, reset
--   Sessions      join / leave / autosave                Drift        drift points -> drift bank + cash (capped)
--   Sites         "is the car near the bank / shop"      Garage, Upgrades, Wheel, Shop   buying cars and parts, the car wheel
--   RaceRewards, HeistRewards, Missions   paying for races and the heist (checked)
--   Purchases     Robux (VIP pass, cash packs)           DayNight     clock and headlights     Fines   traffic fines (+JD)
-- Each player's device runs the driving, traffic, races and the heist (StarterPlayerScripts) and asks the server for every change
-- of money, which the server checks before it pays.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local Game = script.Parent:WaitForChild("Game")

Workspace:SetAttribute("StartHeading", Meta.startHeading)
Workspace:SetAttribute("StartY", Meta.startY)
Workspace:SetAttribute("Attribution", Meta.attribution)

for _, name in ipairs({ "Remotes", "PlayerData", "CarBuilder", "Purchases", "Spawner", "Drift", "Fines", "Shop", "Missions", "DayNight", "Sessions" }) do
	require(Game:WaitForChild(name))
end
