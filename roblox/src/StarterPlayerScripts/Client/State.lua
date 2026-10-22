-- Irbid Drive (Roblox) - state shared by the client modules (one table; every module that requires it gets the same one).
-- Units: metres, metres per second, radians. Heading h has forward (sin h, cos h); x = east, z = south.
return {
	car = nil, -- the player's car model (Car_<UserId>)
	body = nil, -- its Body part
	st = { x = 0, y = 0, z = 0, h = 0, vx = 0, vz = 0, vy = 0, gnd = false, sp = 0, fs = 0 },
	spec = { vm = 40, a0 = 8, bk = 9.81, hd = 1, dr = 0, rm = 1, tier = 0, name = "", L = 4.4, W = 1.8, H = 1.45 },
	input = { th = 0, br = 0, steer = 0, hb = false, an = false }, -- an = steering from an analog axis (gamepad / wheel)
	frozen = false, -- race countdown: the car is held still
	ui = nil, -- name of the open menu (nil = driving)
	road = nil, -- the road graph (Modules/Road)
	ai = {}, -- every AI car this frame (traffic, rivals, police): {x, z, h, v, L, W, hit}
	mission = nil, -- "race" | "heist" | nil
	raceMark = nil, -- {x, z} of the next race checkpoint (minimap)
}
