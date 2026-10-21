-- Irbid Drive (Roblox) - floating name signs, and the landmark labels (real OSM places near the start).
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local MapData = require(script.Parent:WaitForChild("MapData"))

local Signs = {}

-- an invisible anchor part with a BillboardGui (studs position)
function Signs.sign(parent, pos, text, color, maxDist, w)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.Transparency = 1
	p.Size = Vector3.new(1, 1, 1)
	p.Position = pos
	p.Name = "Label"
	local g = Instance.new("BillboardGui")
	g.Size = UDim2.fromOffset(w or 260, 40)
	g.MaxDistance = maxDist or 700
	g.AlwaysOnTop = false
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.TextScaled = true
	t.Font = Enum.Font.GothamBold
	t.TextColor3 = color or Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0.3
	t.Text = text
	t.Parent = g
	g.Parent = p
	p.Parent = parent
	return p
end

-- landmark names, 18 m above the ground
function Signs.labels(map)
	local S = MapData.S
	for _, L in ipairs(Meta.labels) do
		Signs.sign(map, Vector3.new(L.x * S, L.y * S + 18 * S, L.z * S), L.n)
	end
end

return Signs
