-- Irbid Drive (Roblox) - the camera, the web game's views (12_hud_loop.js, key C): 0 chase (9 m behind, 3.6 m up, eased; looks 5 m ahead),
-- 1 cockpit, 2 bonnet, 3 front bumper (placed from each car's length and height, as in the web game), and Roblox only: 4 free (Roblox's
-- orbit camera: mouse / touch drag). Field of view 65°, widening with speed up to 85° (not with Reduced motion). The view is a setting
-- ("cam", saved); C cycles through the five.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Settings = require(Client:WaitForChild("Settings"))

local Camera = {}
local S = Config.SCALE
local st, spec = State.st, State.spec
local mode, camPos = 0, nil
local NAMES = { "chase", "cockpit", "bonnet", "bumper", "free (drag to look around)" }
Camera.NAMES = NAMES

Settings.provide("cam")
Settings.onChange(function(k, v)
	if k ~= "cam" then return end
	local changed = mode ~= v
	mode = v
	camPos = nil
	local cam = Workspace.CurrentCamera
	if mode == 4 then
		cam.CameraType = Enum.CameraType.Custom
		if State.body then cam.CameraSubject = State.body end
	end
	if changed then Hud.toast("Camera: " .. NAMES[mode + 1], 1.5) end
end)

function Camera.cycle()
	Settings.set("cam", (mode + 1) % 5)
end

-- a view directly (the settings menu, tests)
function Camera.set(m)
	Settings.set("cam", m)
end

function Camera.mode()
	return mode
end

local CAMV = Vector3.new()
function Camera.step(dt)
	if mode == 4 or not (State.car and State.body) then return end
	local cam = Workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local px, py, pz = st.x, st.y, st.z
	if mode == 0 then
		CAMV = Vector3.new(px - fx * 9, py + 3.6, pz - fz * 9) * S
		camPos = camPos and camPos:Lerp(CAMV, math.min(1, dt * 6)) or CAMV
		cam.CFrame = CFrame.lookAt(camPos, Vector3.new(px + fx * 5, py + 1.2, pz + fz * 5) * S)
	else
		-- per-car views from the car's length L and height H (the web game's v48 numbers)
		local L, Hh = spec.L or 4.4, spec.H or 1.4
		local cf = mode == 1 and 0.08 * L or mode == 2 and 0.2 * L or 0.5 * L + 0.25
		local cy = mode == 1 and math.max(1.05, 0.82 * Hh + 0.08) or mode == 2 and Hh * 0.86 + 0.12 or 0.55
		local pos = Vector3.new(px + fx * cf, py + cy, pz + fz * cf) * S
		cam.CFrame = CFrame.lookAt(pos, Vector3.new(px + fx * (cf + 20), py + cy - 0.08, pz + fz * (cf + 20)) * S)
		camPos = nil
	end
	cam.FieldOfView = 65 + (Settings.get("rm") == 1 and 0 or math.min(20, st.sp * 3.6 * 0.12))
end

return Camera
