-- Irbid Drive (Roblox) - navigation, one place to reach it: street name (StreetName), GPS route (Gps), place search (Search),
-- minimap (Minimap).
local Client = script.Parent
local StreetName = require(Client:WaitForChild("StreetName"))
local Gps = require(Client:WaitForChild("Gps"))
local Search = require(Client:WaitForChild("Search"))
local Minimap = require(Client:WaitForChild("Minimap"))

local Nav = {}
Nav.go = Gps.go
Nav.clear = Gps.clear
Nav.route = Gps.route
Nav.open = Search.open
function Nav.active()
	return Gps.route() ~= nil
end
function Nav.streetName()
	return StreetName.name
end

function Nav.step(dt)
	StreetName.step(dt)
	Gps.step(dt)
	Minimap.step(dt)
end

return Nav
