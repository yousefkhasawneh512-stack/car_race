-- Irbid Drive (Roblox) - the camera: 0 chase, 1 far chase, 2 Roblox's own orbit camera (mouse / touch drag). Key C.
-- The chase cameras look along the direction of travel when moving fast enough, so drifts stay readable.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))

local Camera = {}
local S = Config.SCALE
local st = State.st
local mode, camPos = 0, nil

function Camera.cycle()
	mode = (mode + 1) % 3
	local cam = Workspace.CurrentCamera
	if mode == 2 then
		cam.CameraType = Enum.CameraType.Custom
		if State.body then cam.CameraSubject = State.body end
	end
	camPos = nil
	Hud.toast(({ "Camera: chase", "Camera: far chase", "Camera: free (drag to look around)" })[mode + 1], 1.5)
end

function Camera.step(dt)
	if mode == 2 or not (State.car and State.body) then return end
	local cam = Workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local back, height = mode == 0 and 7.5 or 13, mode == 0 and 2.7 or 4.5
	local hx, hz = math.sin(st.h), math.cos(st.h)
	if st.sp > 4 and st.fs > 0 then
		local mx, mz = st.vx / st.sp, st.vz / st.sp
		hx, hz = hx * 0.6 + mx * 0.4, hz * 0.6 + mz * 0.4
	end
	local p = Vector3.new(st.x, st.y, st.z)
	local want = (p - Vector3.new(hx, 0, hz) * back + Vector3.new(0, height, 0)) * S
	camPos = camPos and camPos:Lerp(want, 1 - math.exp(-dt * 7)) or want
	cam.CFrame = CFrame.lookAt(camPos, (p + Vector3.new(hx, 0, hz) * 4 + Vector3.new(0, 1, 0)) * S)
end

return Camera
