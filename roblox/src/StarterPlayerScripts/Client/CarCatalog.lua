-- Irbid Drive (Roblox) - the car encyclopedia (Settings > 📖, and ℹ on each car in the garage): search the real-world vehicle catalogue
-- (Modules/Catalog: 30,000+ variants from the open vehicle-makes-models database, ODbL) by name, with chips for brand, fuel, drivetrain,
-- gearbox, era, power, top speed and 0-100, 25 per page; a variant's page lists its source figures ("Unknown" when the source has none,
-- "(suspect source value)" when implausible) and the labelled game estimates. Browsing only: these cars have no 3D model and cannot be
-- driven; nothing here goes to the server. The catalogue loads the first time the screen opens (a module per frame).
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Catalog = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Catalog"))
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Hud = require(script.Parent:WaitForChild("Hud"))

local CarCatalog = {}
local TITLE = "Car encyclopedia"
local folder = ReplicatedStorage:FindFirstChild("IrbidCatalog")
local links
local status = "not loaded" -- "not loaded" / "loading" / "loaded" / "not installed"
local loadWaiters = {}

-- loads the catalogue once (yields a frame per module); cb() runs when it is ready
local function ensure(cb)
	if status == "loaded" then
		cb()
		return
	end
	table.insert(loadWaiters, cb)
	if status == "loading" then return end
	if not folder or not folder:FindFirstChild("CatalogDict") then
		status = "not installed"
		for _, f in ipairs(loadWaiters) do f() end
		table.clear(loadWaiters)
		return
	end
	status = "loading"
	task.spawn(function()
		local dict = require(folder.CatalogDict)
		local chunks = {}
		for k = 1, dict.chunks do
			chunks[k] = require(folder:WaitForChild("Catalog" .. k))
			task.wait()
		end
		links = folder:FindFirstChild("CarLinks") and require(folder.CarLinks) or {}
		Catalog.load(dict, chunks, function() task.wait() end)
		status = "loaded"
		for _, f in ipairs(loadWaiters) do f() end
		table.clear(loadWaiters)
	end)
end
CarCatalog.ensure = ensure
function CarCatalog.status() return status end

-- the chips: {label, {option text, value}...}; the value goes into the query (fields named in Catalog.query)
local CHIPS
local function chipList()
	local d = Catalog.dict
	local function fuel(n) return table.find(d.fuels, n) end
	local function drive(n) return table.find(d.drives, n) end
	return {
		{ "fuel", "Fuel", { { "Any", nil }, { "Gasoline", fuel("Gasoline") }, { "Diesel", fuel("Diesel") }, { "Electric", fuel("Electric") }, { "Any hybrid", "hybrid" } } },
		{ "drive", "Drive", { { "Any", nil }, { "FWD", drive("Front Wheel Drive") }, { "RWD", drive("Rear Wheel Drive") }, { "AWD", drive("All Wheel Drive") } } },
		{ "gear", "Gearbox", { { "Any", nil }, { "Manual", 1 }, { "Automatic", 2 } } },
		{ "years", "Era", { { "Any", nil }, { "before 1970", { nil, 1970 } }, { "1970s", { 1970, 1980 } }, { "1980s", { 1980, 1990 } }, { "1990s", { 1990, 2000 } },
			{ "2000s", { 2000, 2010 } }, { "2010s", { 2010, 2020 } }, { "2020s", { 2020, nil } } } },
		{ "hp", "Power", { { "Any", nil }, { "< 100 hp", { nil, 100 } }, { "100–199 hp", { 100, 200 } }, { "200–399 hp", { 200, 400 } }, { "400–699 hp", { 400, 700 } }, { "700+ hp", { 700, nil } } } },
		{ "top", "Top speed", { { "Any", nil }, { "< 200 km/h", { nil, 200 } }, { "200–249", { 200, 250 } }, { "250–299", { 250, 300 } }, { "300+ km/h", { 300, nil } } } },
		{ "acc", "0–100", { { "Any", nil }, { "< 4 s", { nil, 4 } }, { "4–6.9 s", { 4, 7 } }, { "7–9.9 s", { 7, 10 } }, { "10+ s", { 10, nil } } } },
		{ "sort", "Sort", { { "Name", "name" }, { "Most power", "power" }, { "Top speed", "top" }, { "Quickest", "accel" }, { "Newest", "newest" }, { "Lightest", "lightest" } } },
	}
end
-- the screen's state survives closing it (the last search comes back)
local q = { text = "", page = 1, make = nil }
local pick = {}

local function text(parent, s, order, size, color, h)
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromOffset(410, h or 0)
	t.AutomaticSize = Enum.AutomaticSize.Y
	t.BackgroundTransparency = 1
	t.TextColor3 = color or Color3.new(1, 1, 1)
	t.Font = Enum.Font.Gotham
	t.TextSize = size or 13
	t.TextWrapped = true
	t.TextXAlignment = Enum.TextXAlignment.Left
	t.Text = s
	t.LayoutOrder = order
	t.Parent = parent
	return t
end

local function clear(p)
	for _, ch in ipairs(p.list:GetChildren()) do
		if ch:IsA("GuiObject") then ch:Destroy() end
	end
end

local function credit(p, order)
	local c = text(p.list, Catalog.dict and Catalog.dict.credit or "", order, 11, Color3.fromRGB(170, 175, 185))
	c.Name = "Credit"
end

local show, detail, brands

local function notReady(p)
	clear(p)
	if status == "not installed" then
		p.sub.Text = "Vehicle catalogue: Not installed"
		text(p.list, "This place was built without roblox/catalog (tools/vehicle_catalog). The game works without it.", 1, 14)
	else
		p.sub.Text = "Loading the vehicle catalogue…"
	end
end

-- the results screen
show = function(p)
	clear(p)
	local d = Catalog.dict
	CHIPS = CHIPS or chipList()
	local box = Instance.new("TextBox")
	box.Name = "Query"
	box.Size = UDim2.new(1, -12, 0, 34)
	box.BackgroundColor3 = Color3.fromRGB(40, 44, 52)
	box.TextColor3 = Color3.new(1, 1, 1)
	box.PlaceholderText = "Search make, model, generation or engine (e.g. golf gti)"
	box.Font = Enum.Font.Gotham
	box.TextSize = 15
	box.ClearTextOnFocus = false
	box.Text = q.text
	box.LayoutOrder = 0
	box.Parent = p.list
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
	cl.SortOrder = Enum.SortOrder.LayoutOrder
	cl.Parent = chips
	local results = {}
	local pager
	local function run()
		for _, r in ipairs(results) do r:Destroy() end
		table.clear(results)
		local o = { text = q.text, make = q.make, page = q.page, per = 25 }
		for _, c in ipairs(CHIPS) do o[c[1]] = c[3][pick[c[1]] or 1][2] end
		local res = Catalog.query(o)
		q.page = res.page
		p.sub.Text = string.format("%s of %s real-world variants · page %d / %d", Hud.fmt(res.total), Hud.fmt(Catalog.count), res.page, res.pages)
		pager.Label.Text = res.total == 0 and "No car matches" or string.format("Page %d / %d", res.page, res.pages)
		for k, i in ipairs(res.items) do
			local b = Hud.button(p.list, Catalog.short(i), function() detail(p, i) end, 410, 40, Color3.fromRGB(39, 64, 107))
			b.Name = "Result"
			b.TextSize = 12
			b.TextXAlignment = Enum.TextXAlignment.Left
			b.LayoutOrder = 10 + k
			results[#results + 1] = b
		end
	end
	-- brand chip (opens the brand list), then the cycling chips
	local bb = Hud.button(chips, "Brand: " .. (q.make and d.makes[q.make] or "Any"), function() brands(p) end, 120, 28, q.make and Color3.fromRGB(60, 130, 80) or nil)
	bb.Name = "Chip_brand"
	bb.TextSize = 12
	bb.LayoutOrder = 0
	for k, c in ipairs(CHIPS) do
		local b
		local function label()
			local i = pick[c[1]] or 1
			b.Text = c[2] .. ": " .. c[3][i][1]
			b.BackgroundColor3 = (i > 1 and c[1] ~= "sort") and Color3.fromRGB(60, 130, 80) or Color3.fromRGB(39, 64, 107)
		end
		b = Hud.button(chips, "", function()
			pick[c[1]] = (pick[c[1]] or 1) % #c[3] + 1
			q.page = 1
			label()
			run()
		end, 128, 28)
		b.Name = "Chip_" .. c[1]
		b.TextSize = 12
		b.LayoutOrder = k
		label()
	end
	pager = Instance.new("Frame")
	pager.Name = "Pager"
	pager.Size = UDim2.fromOffset(410, 30)
	pager.BackgroundTransparency = 1
	pager.LayoutOrder = 2
	pager.Parent = p.list
	local prev = Hud.button(pager, "◀ Prev", function()
		q.page -= 1
		run()
	end, 90, 30)
	prev.Name = "Prev"
	local nx = Hud.button(pager, "Next ▶", function()
		q.page += 1
		run()
	end, 90, 30)
	nx.Name = "Next"
	nx.Position = UDim2.fromOffset(320, 0)
	local pl = Hud.label(pager, UDim2.fromOffset(205, 15), UDim2.fromOffset(220, 24), Vector2.new(0.5, 0.5), "", 14)
	pl.Name = "Label"
	credit(p, 1000)
	box:GetPropertyChangedSignal("Text"):Connect(function()
		q.text = string.sub(box.Text, 1, Catalog.MAX_QUERY)
		q.page = 1
		run()
	end)
	run()
end

-- the brand list: every make in the catalogue
brands = function(p)
	clear(p)
	local d = Catalog.dict
	p.sub.Text = #d.makes .. " brands in the catalogue"
	local any = Hud.button(p.list, "Any brand", function()
		q.make, q.page = nil, 1
		show(p)
	end, 410, 30, Color3.fromRGB(60, 90, 60))
	any.Name = "Brand_any"
	any.LayoutOrder = 0
	for i, m in ipairs(d.makes) do
		local b = Hud.button(p.list, m, function()
			q.make, q.page = i, 1
			show(p)
		end, 410, 28, q.make == i and Color3.fromRGB(60, 130, 80) or nil)
		b.Name = "Brand"
		b.TextSize = 13
		b.LayoutOrder = i
	end
end

-- a variant's page; note (optional) = a line above it (the garage link)
detail = function(p, i, note, back)
	clear(p)
	local L, r = Catalog.details(i)
	p.sub.Text = r.make .. " " .. (r.model or "") .. " · " .. Catalog.years(r)
	local order = 0
	local b = Hud.button(p.list, back and "◀ Back to the garage" or "◀ Back to the results", function()
		if back then back() else show(p) end
	end, 410, 30, Color3.fromRGB(60, 60, 70))
	b.Name = "Back"
	b.LayoutOrder = order
	if note then
		order += 1
		text(p.list, note, order, 13, Color3.fromRGB(255, 220, 120)).Name = "Note"
	end
	for _, l in ipairs(L) do
		order += 1
		local est = string.find(l[1], "game estimate", 1, true) ~= nil
		local t = text(p.list, l[1] .. ":  " .. l[2], order, 13, est and Color3.fromRGB(150, 200, 255) or (string.find(l[2], "suspect", 1, true) and Color3.fromRGB(255, 160, 120) or nil))
		t.Name = "Field"
	end
	order += 1
	text(p.list, "Source figures can vary by market, year and test method. Game estimates are heuristics for balancing, not measurements. " ..
		Catalog.dict.estimate, order, 11, Color3.fromRGB(170, 175, 185))
	order += 1
	local all = Hud.button(p.list, "All versions of " .. r.make .. " " .. (r.model or ""), function()
		q.text, q.make, q.page = r.model or "", table.find(Catalog.dict.makes, r.make), 1
		show(p)
	end, 410, 30, Color3.fromRGB(39, 64, 107))
	all.Name = "AllVersions"
	all.LayoutOrder = order
	credit(p, 1000)
end

function CarCatalog.open()
	if Hud.isOpen(TITLE) then
		Hud.closePanel()
		return
	end
	local p = Hud.panel(TITLE, 440, 470)
	notReady(p)
	ensure(function()
		if not p.frame.Parent then return end
		if status == "loaded" then show(p) else notReady(p) end
	end)
	return p
end

-- ℹ in the garage: the game car's linked catalogue variant (same make and model, nearest top speed and 0-100), or why there is none
function CarCatalog.forCar(carIndex, back)
	local c = Config.CARS[carIndex]
	local p = Hud.panel(TITLE, 440, 470)
	notReady(p)
	ensure(function()
		if not p.frame.Parent then return end
		if status ~= "loaded" then
			notReady(p)
			return
		end
		local i, l = Catalog.link(links, carIndex)
		if i then
			detail(p, i, string.format("%s in this game is linked to this real-world version: same make and model (%s), the nearest top speed and 0–100. "
				.. "A reference only: the game car drives with its own numbers.", c.name, l.how), back)
		else
			clear(p)
			p.sub.Text = c.name
			local b = Hud.button(p.list, "◀ Back to the garage", function() if back then back() end end, 410, 30, Color3.fromRGB(60, 60, 70))
			b.Name = "Back"
			b.LayoutOrder = 0
			text(p.list, "This car's model is not in the vehicle catalogue (the open database does not cover every car), so there are no real-world figures to show.", 1, 14).Name = "Note"
			local s = Hud.button(p.list, "Search the encyclopedia", function() show(p) end, 410, 30)
			s.Name = "Search"
			s.LayoutOrder = 2
			credit(p, 1000)
		end
	end)
	return p
end

-- Settings > © Credits & licences: every data source the game uses
function CarCatalog.credits()
	local p = Hud.panel("Credits & licences", 440, 420)
	p.sub.Text = "Data sources used by this game"
	local lines = {
		"Map, streets, buildings and places: © OpenStreetMap contributors, Open Database License (ODbL) 1.0 — openstreetmap.org/copyright",
		"Terrain heights: NASA SRTM (public domain)",
		"Vehicle encyclopedia: vehicle-makes-models (github.com/gor3a/vehicle-makes-models) and autoevolution.com, ODbL 1.0. "
			.. "Changed for Irbid Drive: exact duplicates removed, implausible values flagged, game estimates added. The changed database is "
			.. "published with the game's source under the same licence (roblox/catalog).",
		"Vehicle catalogue status: " .. (status == "loaded" and ("Loaded · " .. Hud.fmt(Catalog.count) .. " variants · built " .. tostring(Catalog.dict.generated))
			or status == "not installed" and "Not installed" or "Loads when the encyclopedia opens"),
	}
	for k, s in ipairs(lines) do text(p.list, s, k, 13).Name = "Line" end
	return p
end

return CarCatalog
