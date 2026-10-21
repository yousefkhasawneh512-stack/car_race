-- Irbid Drive (Roblox) - drift points, the web game's formula: slip angle x speed x 8 per second, x a combo that grows over 12 s
-- (up to x5), x the Extra Drift Points upgrade (+20 % a level, and it starts counting at a smaller angle), x the car's rarity.
-- 0.7 s after the drift ends, more than 40 points are sent to the server (drift bank + cash). A crash loses the drift.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local DriftScore = { state = { pts = 0, t = 0, off = 0 } }
local drift = DriftScore.state
local spec = State.spec

function DriftScore.clear()
	drift.pts, drift.t = 0, 0
	Hud.drift.Text = ""
end

-- a crash: the drift in progress is lost
function DriftScore.lose()
	if drift.pts > 0 then
		DriftScore.clear()
		Hud.toast("Drift lost", 1.5)
	end
end

-- sa = slip angle (rad), sp = speed (m/s), gnd = wheels on the ground
function DriftScore.step(dt, sa, sp, gnd)
	if gnd and sp > 8 and sa > 0.22 - 0.012 * spec.dr and not State.frozen then
		drift.t += dt
		drift.off = 0
		local combo = 1 + math.min(4, drift.t / 3)
		drift.pts += sa * sp * 8 * dt * combo * (1 + 0.2 * spec.dr) * spec.rm
		Hud.drift.Text = "DRIFT  " .. Hud.fmt(drift.pts) .. "  ×" .. string.format("%.1f", combo)
	elseif drift.pts > 0 then
		drift.off += dt
		if drift.off > 0.7 then
			if drift.pts > 40 then
				local n = math.floor(drift.pts + 0.5)
				Remotes.BankDrift:FireServer(n)
				Hud.toast("Drift +" .. Hud.fmt(n) .. (spec.rm > 1 and ("  (" .. Config.RARITY[spec.tier + 1].name .. " ×" .. string.format("%.1f", spec.rm) .. ")") or ""))
			end
			DriftScore.clear()
		end
	end
end

return DriftScore
