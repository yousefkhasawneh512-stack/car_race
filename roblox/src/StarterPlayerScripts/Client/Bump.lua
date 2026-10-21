-- Irbid Drive (Roblox) - bumping: the player's car as two circles (front and rear axle, radius 1 m) against each AI car's box and
-- against other players' cars. The player's car is pushed out and bounces (restitution 0.3); a hit AI car stops for a moment.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local DriftScore = require(script.Parent:WaitForChild("DriftScore"))

local Bump = {}
local S = Config.SCALE
local st = State.st

-- circle (cx, cz) against a box at (ox, oz), heading oh, half length hl, half width hw, moving (ovx, ovz) -> true on contact
local function hit(cx, cz, ox, oz, oh, hl, hw, ovx, ovz)
	local fx, fz = math.sin(oh), math.cos(oh)
	local rx, rz = -fz, fx
	local dx, dz = cx - ox, cz - oz
	local lon, lat = dx * fx + dz * fz, dx * rx + dz * rz
	local pl, pw = hl + 1 - math.abs(lon), hw + 1 - math.abs(lat)
	if pl <= 0 or pw <= 0 then return false end
	local nx, nz, pen
	if pw < pl then
		local sg = lat >= 0 and 1 or -1
		nx, nz, pen = rx * sg, rz * sg, pw
	else
		local sg = lon >= 0 and 1 or -1
		nx, nz, pen = fx * sg, fz * sg, pl
	end
	st.x += nx * pen
	st.z += nz * pen
	local rv = (st.vx - ovx) * nx + (st.vz - ovz) * nz
	if rv < 0 then
		st.vx -= 1.3 * rv * nx
		st.vz -= 1.3 * rv * nz
		if -rv > 6 then Hud.toast("Crash! " .. math.floor(-rv * 3.6) .. " km/h", 2) end
		DriftScore.lose()
	end
	return true
end

local others, othersT = {}, 0
function Bump.step(dt)
	local fx, fz = math.sin(st.h), math.cos(st.h)
	local c1x, c1z, c2x, c2z = st.x + fx * 1.2, st.z + fz * 1.2, st.x - fx * 1.2, st.z - fz * 1.2
	for _, a in ipairs(State.ai) do
		local dx, dz = a.x - st.x, a.z - st.z
		if dx * dx + dz * dz < 64 then
			local avx, avz = math.sin(a.h) * a.v, math.cos(a.h) * a.v
			local h = hit(c1x, c1z, a.x, a.z, a.h, a.L / 2, a.W / 2, avx, avz)
			h = hit(c2x, c2z, a.x, a.z, a.h, a.L / 2, a.W / 2, avx, avz) or h
			if h then a.hit = a.cop and 0.6 or 2.5 end
		end
	end
	-- other players' cars (moved by their own devices): the player only bounces off them; the list is refreshed every second
	othersT -= dt
	if othersT <= 0 then
		othersT = 1
		table.clear(others)
		for _, m in ipairs(Workspace:GetChildren()) do
			if m:IsA("Model") and string.sub(m.Name, 1, 4) == "Car_" and m ~= State.car and m.PrimaryPart then
				others[#others + 1] = m.PrimaryPart
			end
		end
	end
	for _, b in ipairs(others) do
		if b.Parent then
			local p = b.Position / S
			local dx, dz = p.X - st.x, p.Z - st.z
			if dx * dx + dz * dz < 64 then
				local lv = b.CFrame.LookVector
				local v = b.AssemblyLinearVelocity / S
				local oh = math.atan2(lv.X, lv.Z)
				hit(c1x, c1z, p.X, p.Z, oh, b.Size.Z / S / 2, b.Size.X / S / 2, v.X, v.Z)
				hit(c2x, c2z, p.X, p.Z, oh, b.Size.Z / S / 2, b.Size.X / S / 2, v.X, v.Z)
			end
		end
	end
end

return Bump
