-- Irbid Drive (Roblox) - the player's car effects on this device: brake lights (the sounds are in CarAudio).

local CarFx = {}
local lights = {}
local DIM, BRIGHT = Color3.fromRGB(140, 10, 10), Color3.fromRGB(255, 40, 40)

-- a new car: find its tail lights, start the engine sound
function CarFx.attach(m, body)
	lights = {}
	for _, p in ipairs(m:GetChildren()) do
		if p.Name == "Taillight" then lights[#lights + 1] = p end
	end
end

-- br = brake input, fs = forward speed (m/s), th = throttle input
function CarFx.step(br, fs, th)
	local braking = br > 0 and fs > 0.5
	for _, l in ipairs(lights) do
		l.Color = braking and BRIGHT or DIM
	end
end

return CarFx
