-- Irbid Drive (Roblox) - the bank heist (the web game's rules): start only at the bank and while it is open; escaping (after the
-- full 2:00) pays +500, getting caught costs up to 50; then the bank is closed for 3:00.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Sites = require(script.Parent:WaitForChild("Sites"))

local HeistRewards = {}

function HeistRewards.start(plr, d)
	if os.clock() < d.heistCool then return false, "The bank is closed for now" end
	if not Sites.near(plr, Sites.bank, 30) then return false, "Drive to the bank first" end
	d.heist = os.clock()
	return true
end

-- escaped = true (the timer ran out) or false (caught) -> ok, cash change
function HeistRewards.finish(plr, d, escaped)
	local t0 = d.heist
	d.heist = nil
	if not t0 then return false, "no heist" end
	d.heistCool = os.clock() + Config.HEIST_COOLDOWN
	plr:SetAttribute("BankOpenAt", Workspace.DistributedGameTime + Config.HEIST_COOLDOWN)
	if escaped == true then
		if os.clock() - t0 < Config.HEIST_TIME - 3 then return false, "Result not accepted" end
		d.cash += Config.HEIST_REWARD
		PlayerData.commit(plr)
		return true, Config.HEIST_REWARD
	end
	local loss = math.min(Config.HEIST_FINE, math.floor(d.cash))
	d.cash -= loss
	PlayerData.commit(plr)
	return true, -loss
end

return HeistRewards
