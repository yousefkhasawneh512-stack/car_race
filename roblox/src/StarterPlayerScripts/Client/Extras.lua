-- Irbid Drive (Roblox) - the web game's other keys: K landmark tour (the next of its tour stops, when no heist is on), J the stunt
-- ramps, T +1 hour, N / B next / previous owned car, X horn (a sound only if Config.HORN_SOUND_ID is set; the web game synthesises it).
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Drive = require(Client:WaitForChild("Drive"))
local CarInfo = require(Client:WaitForChild("CarInfo"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Extras = {}
local plr = Players.LocalPlayer
local tourI = 0

function Extras.tour()
	if State.mission == "heist" or #Rules.tour == 0 then return end
	tourI = tourI % #Rules.tour + 1
	local L = Rules.tour[tourI]
	Drive.place(L.x, L.z, L.h)
	Hud.toast("📍 " .. L.n)
end

function Extras.ramps()
	if State.mission == "heist" then return end
	local r = Rules.ramps[1]
	if not r then
		Hud.toast("The stunt ramps are outside the Roblox map")
		return
	end
	-- the web game: 50 m east and 70 m north of the first ramp, facing +z (south) up the middle ramp
	Drive.place(r.x + 50, r.z - 70, 0)
end

function Extras.hour()
	Remotes.AddHour:FireServer()
end

function Extras.cycleCar(dir)
	if State.mission then return end
	local list = {}
	for i in pairs(CarInfo.owned()) do list[#list + 1] = i end
	table.sort(list)
	if #list < 2 then
		Hud.toast("You own one car: win more on the wheel (G) or buy one in the garage (V)")
		return
	end
	local cur = plr:GetAttribute("CurCar") or 1
	local k = 1
	for j, i in ipairs(list) do
		if i == cur then k = j end
	end
	local nxt = list[(k - 1 + dir) % #list + 1]
	task.spawn(function()
		local ok, msg = Remotes.CarAction:InvokeServer("use", nxt)
		Hud.toast(ok and ("🚗 " .. tostring(msg)) or tostring(msg))
	end)
end

local horn
function Extras.horn(on)
	if (Config.HORN_SOUND_ID or 0) == 0 or not State.body then return end
	if not horn or horn.Parent ~= State.body then
		horn = Instance.new("Sound")
		horn.SoundId = "rbxassetid://" .. Config.HORN_SOUND_ID
		horn.Looped = true
		horn.Volume = 0.6
		horn.Parent = State.body
	end
	if on then horn:Play() else horn:Stop() end
end

return Extras
