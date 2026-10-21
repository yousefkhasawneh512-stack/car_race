-- Irbid Drive (Roblox) - the info line at the top: street name, clock, cash, drift bank (5 times a second).
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local Client = script.Parent
local Hud = require(Client:WaitForChild("Hud"))
local Nav = require(Client:WaitForChild("Nav"))

local InfoLine = {}
local plr = Players.LocalPlayer
local t = 0

local function clockText()
	local h = Lighting.ClockTime
	return string.format("%02d:%02d", math.floor(h), math.floor((h % 1) * 60))
end

function InfoLine.step(dt)
	t -= dt
	if t > 0 then return end
	t = 0.2
	local street = Nav.streetName()
	Hud.info.Text = "IRBID DRIVE · 📍 " .. (street ~= "" and street or "off-road") .. " · " .. clockText()
		.. " · Cash " .. Hud.fmt(plr:GetAttribute("Cash") or 0) .. " · Drift bank " .. Hud.fmt(plr:GetAttribute("DriftBank") or 0)
end

return InfoLine
