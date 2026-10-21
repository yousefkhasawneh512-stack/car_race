-- Irbid Drive (Roblox) - Robux: the VIP game pass (double drift cash + the VIP car) and two cash packs (developer products).
-- Everything is off while the IDs in Config are 0. A developer product is granted once per receipt (Roblox retries until granted).
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local MarketplaceService = game:GetService("MarketplaceService")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))

local Purchases = {}

function Purchases.vipOwned(plr)
	if Config.GAMEPASS_VIP == 0 then return false end
	local ok, has = pcall(function() return MarketplaceService:UserOwnsGamePassAsync(plr.UserId, Config.GAMEPASS_VIP) end)
	return ok and has
end

-- the buttons in the garage: open Roblox's purchase prompt
function Purchases.prompt(plr, what)
	if what == "cash_small" and Config.PRODUCT_CASH_SMALL ~= 0 then
		MarketplaceService:PromptProductPurchase(plr, Config.PRODUCT_CASH_SMALL)
	elseif what == "cash_big" and Config.PRODUCT_CASH_BIG ~= 0 then
		MarketplaceService:PromptProductPurchase(plr, Config.PRODUCT_CASH_BIG)
	elseif what == "vip" and Config.GAMEPASS_VIP ~= 0 then
		MarketplaceService:PromptGamePassPurchase(plr, Config.GAMEPASS_VIP)
	end
end

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(plr, id, bought)
	local d = PlayerData.data[plr]
	if bought and id == Config.GAMEPASS_VIP and d then
		d.vip = true
		for i, c in ipairs(Config.CARS) do
			if c.vip then d.owned[i] = true end
		end
		PlayerData.sync(plr)
	end
end)

local granted = {}
MarketplaceService.ProcessReceipt = function(info)
	local plr = Players:GetPlayerByUserId(info.PlayerId)
	local d = plr and PlayerData.data[plr]
	if not d then return Enum.ProductPurchaseDecision.NotProcessedYet end
	if granted[info.PurchaseId] then return Enum.ProductPurchaseDecision.PurchaseGranted end
	local add = (info.ProductId == Config.PRODUCT_CASH_SMALL and Config.CASH_SMALL) or (info.ProductId == Config.PRODUCT_CASH_BIG and Config.CASH_BIG) or 0
	if add == 0 then return Enum.ProductPurchaseDecision.NotProcessedYet end
	d.cash += add
	granted[info.PurchaseId] = true
	PlayerData.commit(plr)
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

return Purchases
