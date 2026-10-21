-- Irbid Drive (Roblox) - the menus in one place: Garage (G), Apex Drift Customs (U, TuneShop), the car wheel (K, CarWheel).
local Client = script.Parent
local Garage = require(Client:WaitForChild("Garage"))
local TuneShop = require(Client:WaitForChild("TuneShop"))
local CarWheel = require(Client:WaitForChild("CarWheel"))

return {
	garage = Garage.open,
	shop = TuneShop.open,
	wheel = CarWheel.open,
}
