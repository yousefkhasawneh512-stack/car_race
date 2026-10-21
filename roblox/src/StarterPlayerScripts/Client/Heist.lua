-- Irbid Drive (Roblox) - the bank heist (the web game's rules): E at the bank starts it; survive the police for 2:00. More police join
-- over time (4, then one more every 25 s, up to 8). 2.5 s within 7 m of a police car = caught (the meter drains twice as fast).
-- The server pays +500 for an escape, takes up to 50 when caught, and closes the bank for 3:00.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Police = require(Client:WaitForChild("Police"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Heist = {}
local st = State.st
local heist = nil -- {t (seconds left), catch (seconds near police)}

function Heist.nearBank()
	return (Meta.bank.x - st.x) ^ 2 + (Meta.bank.z - st.z) ^ 2 < 14 * 14
end

function Heist.rob()
	if State.ui or heist or not Heist.nearBank() then return end
	if State.mission ~= nil then
		Hud.toast("Finish the race first")
		return
	end
	local ok, err = Remotes.Mission:InvokeServer("heist_start")
	if not ok then
		Hud.toast(tostring(err))
		return
	end
	heist = { t = Config.HEIST_TIME, catch = 0 }
	State.mission = "heist"
	Hud.toast("🚨 Bank robbed! Stay away from the police for 2:00", 4)
end

local function finish(escaped)
	Police.clear()
	heist = nil
	State.mission = nil
	Hud.mission.Text = ""
	local ok, amount = Remotes.Mission:InvokeServer("heist_end", escaped)
	if escaped then
		Hud.toast(ok and ("Escaped! +" .. Hud.fmt(amount) .. " JD") or "Escaped!", 5)
	else
		st.vx *= 0.2
		st.vz *= 0.2
		Hud.toast("Busted! " .. (ok and Hud.fmt(amount) or "") .. " JD", 5)
	end
end

function Heist.step(dt)
	if not heist then return end
	heist.t -= dt
	if #Police.cops < math.min(8, 4 + math.floor((Config.HEIST_TIME - heist.t) / 25)) then Police.spawn() end
	local near = Police.step(dt)
	heist.catch = near and heist.catch + dt or math.max(0, heist.catch - dt * 2)
	if heist.catch >= 2.5 then
		finish(false)
		return
	end
	if heist.t <= 0 then
		finish(true)
		return
	end
	local m, s = math.floor(heist.t / 60), math.floor(heist.t % 60)
	Hud.mission.Text = string.format("🚨 ROBBERY · survive %d:%02d · police %d · caught %d%%", m, s, #Police.cops, math.floor(heist.catch / 2.5 * 100))
end

function Heist.current()
	return heist
end

return Heist
