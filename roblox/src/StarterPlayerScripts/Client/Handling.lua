-- Irbid Drive (Roblox) - the handling settings on the car (the web game's 07g / 11c keys and pause-menu rows): H Arcade / Realistic,
-- Q / E manual gears (E robs the bank instead when the car is next to it, as in the web game), the gearbox (Automatic / Manual), ABS,
-- traction control, stability control, tyre temperature and brake fade. The values live in Settings (saved with the progress) and
-- are applied to the physics state (Drive.phys).
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CarPhysics = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("CarPhysics"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Drive = require(Client:WaitForChild("Drive"))
local Settings = require(Client:WaitForChild("Settings"))
local Heist = require(Client:WaitForChild("Heist"))

local Handling = {}
local P = Drive.phys

Settings.provide("hm", "gb", "abs", "tc", "esc", "tt", "bf")
Settings.onChange(function(k, v)
	if k == "hm" then
		if P.mode ~= v then
			P.mode = v
			-- the web game's setHandling: gearbox back to first, body springs at rest
			CarPhysics.resetRealistic(P)
		end
	elseif k == "gb" then
		P.pts.man, P.pts.req = v, 0
	elseif k == "abs" then
		P.assist.abs = v == 1
	elseif k == "tc" then
		P.assist.tc = v == 1
	elseif k == "esc" then
		P.assist.esc = v == 1
	elseif k == "tt" then
		P.simx.tt = v == 1
	elseif k == "bf" then
		P.simx.bf = v == 1
	end
end)

-- H
function Handling.toggle()
	Settings.set("hm", 1 - Settings.get("hm"))
	Hud.toast(Settings.get("hm") == 1 and "Handling: Realistic (engine, gears, traction, suspension; estimates)" or "Handling: Arcade")
end

-- Q (d = -1) / E (d = +1) / gamepad: a gear request (the web game's gearKey); the first one selects the manual gearbox
function Handling.shift(d)
	local s = State.spec.pt
	if P.mode == 1 and s and not s.ev and s.ng >= 2 and Settings.get("gb") == 0 then
		Settings.set("gb", 1)
		Hud.toast("Gearbox: Manual (Q down · E up · gamepad LB / RB)")
	end
	local msg = CarPhysics.requestShift(State.spec, P, d)
	if msg and P.mode ~= 1 then Hud.toast(msg) end
	if msg and P.mode == 1 and (s.ev or s.ng < 2) then Hud.toast(msg) end
end

-- E: rob the bank when the car is next to it and no heist is running, else shift up
function Handling.eKey(rob)
	if Heist.nearBank() and State.mission ~= "heist" then
		rob()
	else
		Handling.shift(1)
	end
end

-- a refused downshift (the web game's message)
function Handling.step()
	if P.pts.deny ~= 0 then
		P.pts.deny = 0
		Hud.toast("Downshift refused: the engine would over-rev")
	end
end

return Handling
