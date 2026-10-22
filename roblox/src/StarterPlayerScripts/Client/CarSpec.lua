-- Irbid Drive (Roblox) - the numbers of the player's car: its base stats (Config.CARS, from the web game) with this player's
-- upgrades (player attribute "Tune", set by the server), written into State.spec. Updates when the upgrades change.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))

local CarSpec = {}
local plr = Players.LocalPlayer
local spec = State.spec

function CarSpec.apply()
	local car = State.car
	local ci = (car and car:GetAttribute("carIndex")) or plr:GetAttribute("CurCar") or 1
	local lv, i = { 0, 0, 0, 0 }, 0
	for n in string.gmatch(plr:GetAttribute("Tune") or "", "%d+") do
		i += 1
		lv[i] = tonumber(n)
	end
	local t = Config.tuned(ci, lv)
	local c = Config.CARS[ci] or Config.CARS[1]
	spec.vm, spec.a0, spec.hd, spec.dr, spec.bk, spec.rm = t.vm, t.a0, t.hd, t.dr, t.bk, t.rm
	spec.tier, spec.name, spec.L, spec.W, spec.H = c.tier, c.name, c.L, c.W, c.H
	spec.wb, spec.fn, spec.zeta = c.wb, c.fn, c.zeta
	-- the car index and its Realistic-handling data (Modules/CarPhysics)
	spec.ci, spec.pt = ci, c.pt
	spec.body = c.body
	Hud.car.Text = c.name .. " · " .. Config.RARITY[c.tier + 1].name .. " ×" .. string.format("%.1f", t.rm)
end
plr:GetAttributeChangedSignal("Tune"):Connect(CarSpec.apply)

return CarSpec
