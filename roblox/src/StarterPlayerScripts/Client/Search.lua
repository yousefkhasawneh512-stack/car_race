-- Irbid Drive (Roblox) - the GPS search panel (key M): type part of a name, a kind ("mall") or a description; the 14 nearest matches among the
-- real OpenStreetMap places are listed with their distance; picking one starts the GPS. The web game's v49 additions: 11 category chips
-- above the results filter by place kind (also with a typed query; an empty query lists the nearest of that kind), and ☆ / ★ on each
-- result saves up to 20 places, listed first when the search box is empty (saved with the progress: remote SaveFav, attribute "Fav").
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Places = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Places"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Gps = require(script.Parent:WaitForChild("Gps"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Search = {}
local st = State.st
local plr = Players.LocalPlayer
-- the web game's categories (11b NCAT): id, chip text, place kinds
Search.CATS = {
	{ "food", "🍽️ Food", { "cafe", "food" } }, { "shop", "🛍️ Shops", { "dukkan", "grocery", "mall", "market", "barber", "pet", "tech", "cleaner" } },
	{ "health", "⚕️ Health", { "medical", "hospital" } }, { "edu", "🎓 Schools", { "school", "campus" } }, { "wor", "🕌 Worship", { "mosque", "church" } },
	{ "sight", "🏛️ Sights", { "landmark", "heritage", "museum", "square", "culture" } }, { "car", "🔧 Car", { "auto", "garage", "dealer", "ev", "drift" } },
	{ "sport", "🌳 Parks & sport", { "park", "stadium", "cage", "gym" } }, { "bank", "🏦 Banks", { "bank" } }, { "civic", "🏤 Civic & bus", { "civic", "transport" } },
	{ "area", "🏘️ Areas", { "area" } },
}
local KINDS = {}
for _, c in ipairs(Search.CATS) do
	KINDS[c[1]] = {}
	for _, k in ipairs(c[3]) do KINDS[c[1]][k] = true end
end
local cat = ""
-- saved places: {n, x, z}, at most 20 ("name|x,z" separated by ";")
Search.fav = {}
local function favKey(p)
	return p.n .. "|" .. math.floor(p.x + 0.5) .. "," .. math.floor(p.z + 0.5)
end
local function loadFav()
	table.clear(Search.fav)
	local s = plr:GetAttribute("Fav")
	if type(s) ~= "string" then return end
	for n, x, z in string.gmatch(s, "([^|;]+)|(%-?%d+),(%-?%d+)") do
		if #Search.fav < 20 then Search.fav[#Search.fav + 1] = { n = n, x = tonumber(x), z = tonumber(z) } end
	end
end
loadFav()
local saving = false
plr:GetAttributeChangedSignal("Fav"):Connect(function()
	if not saving then loadFav() end
end)
local function isFav(p)
	local k = favKey(p)
	for _, f in ipairs(Search.fav) do
		if favKey(f) == k then return true end
	end
	return false
end
function Search.toggleFav(p)
	local k = favKey(p)
	for i, f in ipairs(Search.fav) do
		if favKey(f) == k then
			table.remove(Search.fav, i)
			Hud.toast("Removed from saved: " .. p.n)
			Search.saveFav()
			return false
		end
	end
	if #Search.fav >= 20 then
		Hud.toast("Up to 20 saved places: remove one first")
		return false
	end
	table.insert(Search.fav, 1, { n = p.n, x = p.x, z = p.z })
	Hud.toast("☆ Saved: " .. p.n)
	Search.saveFav()
	return true
end
function Search.saveFav()
	local out = {}
	for _, f in ipairs(Search.fav) do out[#out + 1] = string.gsub(f.n, "[|;]", " ") .. "|" .. math.floor(f.x + 0.5) .. "," .. math.floor(f.z + 0.5) end
	saving = true
	Remotes.SaveFav:FireServer(table.concat(out, ";"))
	task.delay(1, function() saving = false end)
end

function Search.open()
	if Hud.isOpen("GPS") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("GPS", 400, 420)
	p.sub.Text = "Search " .. #Places .. " real places (OpenStreetMap)"
	local box = Instance.new("TextBox")
	box.Name = "Query"
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
	-- the category chips: a row that scrolls sideways
	local chips = Instance.new("ScrollingFrame")
	chips.Name = "Chips"
	chips.Size = UDim2.new(1, -12, 0, 34)
	chips.BackgroundTransparency = 1
	chips.ScrollBarThickness = 3
	chips.AutomaticCanvasSize = Enum.AutomaticSize.X
	chips.CanvasSize = UDim2.new()
	chips.ScrollingDirection = Enum.ScrollingDirection.X
	chips.LayoutOrder = 1
	chips.Parent = p.list
	local cl = Instance.new("UIListLayout")
	cl.FillDirection = Enum.FillDirection.Horizontal
	cl.Padding = UDim.new(0, 4)
	cl.Parent = chips
	local rows = {}
	local show
	local chipB = {}
	for i, c in ipairs(Search.CATS) do
		local b = Hud.button(chips, c[2], function()
			cat = cat == c[1] and "" or c[1]
			show()
		end, 104, 28)
		b.Name = "Chip_" .. c[1]
		b.TextSize = 12
		b.LayoutOrder = i
		chipB[c[1]] = b
	end
	show = function()
		for _, r in ipairs(rows) do r:Destroy() end
		table.clear(rows)
		for id, b in pairs(chipB) do b.BackgroundColor3 = id == cat and Color3.fromRGB(60, 130, 80) or Color3.fromRGB(39, 64, 107) end
		local q = string.lower(box.Text)
		local order = 2
		local function row(pl, dist, saved)
			order += 1
			local f = Instance.new("Frame")
			f.Name = "Result"
			f.Size = UDim2.fromOffset(360, 32)
			f.BackgroundTransparency = 1
			f.LayoutOrder = order
			f.Parent = p.list
			local label = (saved and "★ " or "") .. pl.n .. "  ·  " .. ((pl.s and pl.s ~= "") and pl.s or (pl.k or "saved")) .. "  ·  "
				.. (dist >= 1000 and string.format("%.1f km", dist / 1000) or (math.floor(dist) .. " m"))
			local b = Hud.button(f, label, function()
				if Gps.go(pl) then p.close() end
			end, 316, 32)
			b.Name = "Go"
			b.TextXAlignment = Enum.TextXAlignment.Left
			b.TextSize = 13
			local s = Hud.button(f, isFav(pl) and "★" or "☆", function()
				Search.toggleFav(pl)
				show()
			end, 38, 32, Color3.fromRGB(70, 60, 20))
			s.Name = "Star"
			s.Position = UDim2.fromOffset(322, 0)
			rows[#rows + 1] = f
		end
		if Gps.route() then
			local b = Hud.button(p.list, "✖ Stop the GPS", function()
				Gps.clear()
				p.close()
			end, 360, 30, Color3.fromRGB(110, 50, 50))
			b.LayoutOrder = 2
			rows[#rows + 1] = b
		end
		-- the saved places first when nothing is typed and no chip is chosen
		local n = 0
		if q == "" and cat == "" then
			for _, f in ipairs(Search.fav) do
				row(f, math.sqrt((f.x - st.x) ^ 2 + (f.z - st.z) ^ 2), true)
				n += 1
			end
		end
		local found = {}
		local K = cat ~= "" and KINDS[cat] or nil
		for _, pl in ipairs(Places) do
			if (not K or K[pl.k]) and (q == "" or string.find(string.lower(pl.n), q, 1, true) or string.find(string.lower(pl.s), q, 1, true) or string.find(string.lower(pl.k), q, 1, true)) then
				found[#found + 1] = { pl = pl, d = math.sqrt((pl.x - st.x) ^ 2 + (pl.z - st.z) ^ 2) }
			end
		end
		table.sort(found, function(a, b) return a.d < b.d end)
		for k = 1, math.min(14, #found) do row(found[k].pl, found[k].d, false) end
		if #found == 0 and n == 0 then
			local l = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(340, 24), Vector2.zero, "No place matches \"" .. box.Text .. "\"", 15)
			l.LayoutOrder = 3
			rows[#rows + 1] = l
		end
	end
	box:GetPropertyChangedSignal("Text"):Connect(show)
	show()
end

return Search
