-- Irbid Drive (Roblox) - traffic lights (the web game's): signalised real junctions (OSM traffic_signals, or major crossroads, which
-- the web game marks as estimated). A 60 s cycle: 24 s green, 3 s amber, the rest red; the two axes of a junction are half a cycle
-- apart; junctions are in 4 groups 15 s apart; a link inside a split junction is always green. The clock is the server's game time,
-- so every player sees the same lights. Also recolours the lamps of the signal heads that WorldBuilder put up.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Rules = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Rules"))
local State = require(script.Parent:WaitForChild("State"))

local Signals = {}
local CYC, G, Y = 60, 24, 3

-- 'g' / 'y' / 'r' for an approach axis ('x', 'z', 'i') at a junction whose cycle offset is o (seconds)
function Signals.light(ax, o)
	if ax == "i" or ax == nil then return "g" end
	local p = (Workspace.DistributedGameTime + (o or 0) + (ax == "x" and 0 or CYC / 2)) % CYC
	return p < G and "g" or p < G + Y and "y" or "r"
end

-- mark the signalised nodes of the road graph: node.lit = {o = offset, ph = {[edge id] = axis}}
function Signals.attach(g)
	for _, s in ipairs(Rules.signals) do
		local nd = g.nodes[s.n]
		if nd then
			local ph = {}
			for _, q in ipairs(s.ph) do ph[q[1]] = q[2] end
			nd.lit = { o = s.o, ph = ph }
		end
	end
end

-- the light for a car arriving at node nd along edge e ('g' where there is no signal)
function Signals.at(nd, e)
	if not (nd and nd.lit) then return "g" end
	return Signals.light(nd.lit.ph[e.id], nd.lit.o)
end

-- lamps: recoloured only when some junction group changes state
local ON = { r = Color3.fromRGB(255, 40, 30), y = Color3.fromRGB(255, 190, 20), g = Color3.fromRGB(40, 255, 110) }
local OFF = { r = Color3.fromRGB(50, 10, 8), y = Color3.fromRGB(50, 38, 6), g = Color3.fromRGB(8, 46, 20) }
local heads = nil
local lastKey = ""
function Signals.step()
	if not heads then
		local f = Workspace:FindFirstChild("IrbidMap") and Workspace.IrbidMap:FindFirstChild("Signals")
		if not f then return end
		heads = {}
		for _, h in ipairs(f:GetChildren()) do
			local lamps = {}
			for _, c in ipairs({ "r", "y", "g" }) do lamps[c] = h:FindFirstChild("Lamp_" .. c) end
			heads[#heads + 1] = { a = h:GetAttribute("a"), o = h:GetAttribute("o"), lamps = lamps }
		end
	end
	local key = ""
	for grp = 0, 3 do key ..= Signals.light("x", grp * 15) .. Signals.light("z", grp * 15) end
	if key == lastKey then return end
	lastKey = key
	for _, h in ipairs(heads) do
		local s = Signals.light(h.a, h.o)
		for c, p in pairs(h.lamps) do
			p.Color = c == s and ON[c] or OFF[c]
		end
	end
end

-- (State is shared with the traffic and laws modules that read the lights)
State.signals = Signals
return Signals
