-- Irbid Drive (Roblox) - the player's car effects on this device: brake lights, and the engine sound when Config.ENGINE_SOUND_ID
-- is set (pitch follows speed and throttle).
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))

local CarFx = {}
local lights, sound = {}, nil
local DIM, BRIGHT = Color3.fromRGB(140, 10, 10), Color3.fromRGB(255, 40, 40)

-- a new car: find its tail lights, start the engine sound
function CarFx.attach(m, body)
	lights = {}
	for _, p in ipairs(m:GetChildren()) do
		if p.Name == "Taillight" then lights[#lights + 1] = p end
	end
	sound = nil
	if Config.ENGINE_SOUND_ID ~= 0 then
		sound = Instance.new("Sound")
		sound.SoundId = "rbxassetid://" .. Config.ENGINE_SOUND_ID
		sound.Looped = true
		sound.Volume = 0.45
		sound.Parent = body
		sound:Play()
	end
end

-- br = brake input, fs = forward speed (m/s), th = throttle input
function CarFx.step(br, fs, th)
	local braking = br > 0 and fs > 0.5
	for _, l in ipairs(lights) do
		l.Color = braking and BRIGHT or DIM
	end
	if sound then sound.PlaybackSpeed = 0.7 + 1.1 * math.min(1, math.abs(fs) / State.spec.vm) + 0.25 * th end
end

return CarFx
