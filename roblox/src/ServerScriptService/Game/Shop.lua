-- Irbid Drive (Roblox) - the CarAction remote: garage (buy / use), tuning shop (upgrade), car wheel (spin), Robux prompts.
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Garage = require(script.Parent:WaitForChild("Garage"))
local Upgrades = require(script.Parent:WaitForChild("Upgrades"))
local Wheel = require(script.Parent:WaitForChild("Wheel"))
local Purchases = require(script.Parent:WaitForChild("Purchases"))

Remotes.CarAction.OnServerInvoke = function(plr, action, i)
	local d = PlayerData.data[plr]
	if not d then return false, "not ready" end
	if action == "use" or action == "buy" then
		return Garage.buyOrUse(plr, d, i)
	elseif action == "upgrade" then
		return Upgrades.buy(plr, d, i)
	elseif action == "spin" then
		return Wheel.spin(plr, d)
	end
	Purchases.prompt(plr, action)
	return true
end

return {}
