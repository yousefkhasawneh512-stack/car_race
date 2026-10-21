-- Irbid Drive (Roblox) - the GPS search panel (key N): type part of a name, a kind ("mall") or a description; the 14 nearest
-- matches among the 650 real OpenStreetMap places are listed with their distance; picking one starts the GPS.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Places = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Places"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Gps = require(script.Parent:WaitForChild("Gps"))

local Search = {}
local st = State.st

function Search.open()
	if Hud.isOpen("GPS") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("GPS", 380, 380)
	p.sub.Text = "Search " .. #Places .. " real places (OpenStreetMap)"
	local box = Instance.new("TextBox")
	box.Size = UDim2.new(1, -12, 0, 34)
	box.BackgroundColor3 = Color3.fromRGB(40, 44, 52)
	box.TextColor3 = Color3.new(1, 1, 1)
	box.PlaceholderText = "Type a place: mall, university, Clock Tower…"
	box.Font = Enum.Font.Gotham
	box.TextSize = 15
	box.ClearTextOnFocus = false
	box.Text = ""
	box.LayoutOrder = 0
	box.Parent = p.list
	local rows = {}
	local function show()
		for _, r in ipairs(rows) do r:Destroy() end
		table.clear(rows)
		local q = string.lower(box.Text)
		local found = {}
		if Gps.route() then
			local b = Hud.button(p.list, "✖ Stop the GPS", function()
				Gps.clear()
				p.close()
			end, 340, 30, Color3.fromRGB(110, 50, 50))
			b.LayoutOrder = 1
			rows[#rows + 1] = b
		end
		for _, pl in ipairs(Places) do
			if q == "" or string.find(string.lower(pl.n), q, 1, true) or string.find(string.lower(pl.s), q, 1, true) or string.find(string.lower(pl.k), q, 1, true) then
				found[#found + 1] = { pl = pl, d = math.sqrt((pl.x - st.x) ^ 2 + (pl.z - st.z) ^ 2) }
			end
		end
		table.sort(found, function(a, b) return a.d < b.d end)
		for k = 1, math.min(14, #found) do
			local pl = found[k].pl
			local dist = found[k].d
			local label = pl.n .. "  ·  " .. (pl.s ~= "" and pl.s or pl.k) .. "  ·  " .. (dist >= 1000 and string.format("%.1f km", dist / 1000) or (math.floor(dist) .. " m"))
			local b = Hud.button(p.list, label, function()
				if Gps.go(pl) then p.close() end
			end, 340, 32)
			b.TextXAlignment = Enum.TextXAlignment.Left
			b.TextSize = 13
			b.LayoutOrder = 1 + k
			rows[#rows + 1] = b
		end
		if #found == 0 then
			local l = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(340, 24), Vector2.zero, "No place matches \"" .. box.Text .. "\"", 15)
			l.LayoutOrder = 2
			rows[#rows + 1] = l
		end
	end
	box:GetPropertyChangedSignal("Text"):Connect(show)
	show()
end

return Search
