-- Irbid Drive (Roblox) - the on-screen display: info line, speed, drift, mission line, toasts, the context button (rob the bank /
-- tune the car), the button column, and a helper for the menus (garage, shop, wheel, GPS). Sizes in pixels, so it also fits phones.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local State = require(script.Parent:WaitForChild("State"))

local Hud = {}
local plr = Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "IrbidHUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = plr:WaitForChild("PlayerGui")
Hud.gui = gui

local DARK = Color3.fromRGB(21, 24, 29)
local BLUE = Color3.fromRGB(39, 64, 107)

function Hud.fmt(n)
	local s = tostring(math.floor(n + 0.5))
	local neg = string.sub(s, 1, 1) == "-"
	if neg then s = string.sub(s, 2) end
	local out = string.reverse((string.gsub(string.reverse(s), "(%d%d%d)", "%1,")))
	if string.sub(out, 1, 1) == "," then out = string.sub(out, 2) end
	return (neg and "-" or "") .. out
end

function Hud.label(parent, pos, size, anchor, txt, ts)
	local t = Instance.new("TextLabel")
	t.Position = pos
	t.Size = size
	t.AnchorPoint = anchor
	t.BackgroundTransparency = 1
	t.TextColor3 = Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0.4
	t.Font = Enum.Font.GothamBold
	t.TextScaled = true
	t.Text = txt
	t.Parent = parent
	if ts then
		local c = Instance.new("UITextSizeConstraint")
		c.MaxTextSize = ts
		c.Parent = t
	end
	return t
end

function Hud.button(parent, txt, cb, w, h, color)
	local b = Instance.new("TextButton")
	b.Size = UDim2.fromOffset(w or 310, h or 34)
	b.BackgroundColor3 = color or BLUE
	b.TextColor3 = Color3.new(1, 1, 1)
	b.Font = Enum.Font.GothamMedium
	b.TextSize = 15
	b.TextWrapped = true
	b.AutoButtonColor = true
	b.Text = txt
	b.Parent = parent
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 6)
	c.Parent = b
	b.Activated:Connect(cb)
	return b
end

-- ---- fixed HUD ----
Hud.info = Hud.label(gui, UDim2.new(0.5, 0, 0, 4), UDim2.fromOffset(760, 40), Vector2.new(0.5, 0), "IRBID DRIVE", 15)
Hud.info.TextWrapped = true
Hud.speed = Hud.label(gui, UDim2.new(1, -20, 1, -70), UDim2.fromOffset(200, 60), Vector2.new(1, 1), "0", 54)
Hud.label(gui, UDim2.new(1, -20, 1, -50), UDim2.fromOffset(200, 22), Vector2.new(1, 1), "km/h", 18)
Hud.drift = Hud.label(gui, UDim2.new(0.5, 0, 0, 48), UDim2.fromOffset(460, 36), Vector2.new(0.5, 0), "", 30)
Hud.mission = Hud.label(gui, UDim2.new(0.5, 0, 0, 86), UDim2.fromOffset(620, 26), Vector2.new(0.5, 0), "", 20)
Hud.mission.TextColor3 = Color3.fromRGB(255, 220, 120)
Hud.gps = Hud.label(gui, UDim2.new(0.5, 0, 0, 114), UDim2.fromOffset(620, 22), Vector2.new(0.5, 0), "", 17)
Hud.gps.TextColor3 = Color3.fromRGB(120, 255, 160)
local toastL = Hud.label(gui, UDim2.new(0.5, 0, 0, 140), UDim2.fromOffset(620, 30), Vector2.new(0.5, 0), "", 22)
local credit = Hud.label(gui, UDim2.new(0.5, 0, 1, -4), UDim2.fromOffset(520, 16), Vector2.new(0.5, 1),
	Workspace:GetAttribute("Attribution") or "Map data © OpenStreetMap contributors (ODbL)", 13)
credit.TextStrokeTransparency = 0.6
Hud.car = Hud.label(gui, UDim2.new(1, -20, 1, -128), UDim2.fromOffset(330, 20), Vector2.new(1, 1), "", 16)
-- Realistic handling: gear, rpm, assists acting, temperatures (the web game's line under the speed)
Hud.gear = Hud.label(gui, UDim2.new(1, -20, 1, -150), UDim2.fromOffset(420, 18), Vector2.new(1, 1), "", 15)
Hud.gear.TextXAlignment = Enum.TextXAlignment.Right
Hud.car.TextXAlignment = Enum.TextXAlignment.Right

local toastT = 0
function Hud.toast(s, secs)
	toastL.Text = s
	toastT = secs or 3.5
end

-- context button (bottom centre): shown near the bank / the tuning shop / a race start
local ctxB = Hud.button(gui, "", function() end, 230, 46, Color3.fromRGB(200, 60, 40))
ctxB.AnchorPoint = Vector2.new(0.5, 1)
ctxB.Position = UDim2.new(0.5, 0, 1, -30)
ctxB.TextSize = 18
ctxB.Visible = false
local ctxCb
ctxB.Activated:Connect(function()
	if ctxCb then ctxCb() end
end)
function Hud.context(text, cb, color)
	if text and not State.ui then
		ctxB.Text = text
		ctxB.BackgroundColor3 = color or Color3.fromRGB(200, 60, 40)
		ctxB.Visible = true
		ctxCb = cb
	else
		ctxB.Visible = false
		ctxCb = nil
	end
end

-- button column (left)
local col = Instance.new("Frame")
col.BackgroundTransparency = 1
col.Position = UDim2.new(0, 12, 0, 56)
col.Size = UDim2.fromOffset(124, 300)
col.Parent = gui
local cl = Instance.new("UIListLayout")
cl.Padding = UDim.new(0, 6)
cl.Parent = col
function Hud.sideButton(txt, cb)
	return Hud.button(col, txt, cb, 124, 32)
end

-- ---- menus: one open at a time; while one is open the car does not take input ----
local open
function Hud.panel(title, w, h)
	if open then open.close() end
	local f = Instance.new("Frame")
	f.Size = UDim2.fromOffset(w or 360, h or 330)
	f.Position = UDim2.fromScale(0.5, 0.5)
	f.AnchorPoint = Vector2.new(0.5, 0.5)
	f.BackgroundColor3 = DARK
	f.BackgroundTransparency = 0.05
	f.Parent = gui
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 10)
	c.Parent = f
	local t = Hud.label(f, UDim2.new(0.5, 0, 0, 8), UDim2.new(1, -60, 0, 26), Vector2.new(0.5, 0), title, 20)
	t.TextStrokeTransparency = 1
	local sub = Hud.label(f, UDim2.new(0.5, 0, 0, 36), UDim2.new(1, -24, 0, 18), Vector2.new(0.5, 0), "", 14)
	sub.Font = Enum.Font.Gotham
	sub.TextStrokeTransparency = 1
	sub.TextColor3 = Color3.fromRGB(200, 205, 215)
	local list = Instance.new("ScrollingFrame")
	list.Position = UDim2.fromOffset(10, 60)
	list.Size = UDim2.new(1, -20, 1, -70)
	list.BackgroundTransparency = 1
	list.BorderSizePixel = 0
	list.ScrollBarThickness = 6
	list.AutomaticCanvasSize = Enum.AutomaticSize.Y
	list.CanvasSize = UDim2.new()
	list.Parent = f
	local l = Instance.new("UIListLayout")
	l.Padding = UDim.new(0, 6)
	l.HorizontalAlignment = Enum.HorizontalAlignment.Center
	l.SortOrder = Enum.SortOrder.LayoutOrder
	l.Parent = list
	local p = { frame = f, list = list, sub = sub, title = title }
	function p.close()
		if open == p then
			open = nil
			State.ui = nil
		end
		f:Destroy()
	end
	local x = Hud.button(f, "✕", p.close, 34, 30, Color3.fromRGB(90, 40, 40))
	x.Position = UDim2.new(1, -40, 0, 6)
	open = p
	State.ui = title
	Hud.context(nil)
	return p
end
function Hud.closePanel()
	if open then open.close() end
end
function Hud.isOpen(title)
	return open ~= nil and open.title == title
end

function Hud.step(dt)
	if toastT > 0 then
		toastT -= dt
		if toastT <= 0 then toastL.Text = "" end
	end
end

return Hud
