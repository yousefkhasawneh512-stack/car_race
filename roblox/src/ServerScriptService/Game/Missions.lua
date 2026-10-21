-- Irbid Drive (Roblox) - the Mission remote: race_start / race_cancel / race_finish, heist_start / heist_end.
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local RaceRewards = require(script.Parent:WaitForChild("RaceRewards"))
local HeistRewards = require(script.Parent:WaitForChild("HeistRewards"))

local ACTIONS = {
	race_start = RaceRewards.start,
	race_cancel = RaceRewards.cancel,
	race_finish = RaceRewards.finish,
	heist_start = HeistRewards.start,
	heist_end = HeistRewards.finish,
}

Remotes.Mission.OnServerInvoke = function(plr, action, arg)
	local d = PlayerData.data[plr]
	if not d then return false, "not ready" end
	local f = ACTIONS[action]
	if not f then return false, "unknown action" end
	return f(plr, d, arg)
end

return {}
