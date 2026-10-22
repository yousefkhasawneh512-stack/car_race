-- Irbid Drive (Roblox) - the settings menu (key Y or the ⚙ button; the web game's Esc pause menu, 12e_pause.js: Roblox keeps Esc for its
-- own menu) and the gamepad / racing-wheel setup (the web game's wheel setup screen, key V there; here a button in the settings menu),
-- with live readings of the steering and the pedals. One row per setting: click a row for its next value; numbers have − / + buttons.
-- Changes apply at once and are saved with the progress. While a menu is open the car brakes (the web game's ui flag). Extra rows
-- (the driving school...) come from the modules that own them (SettingsMenu.extra).
local RunService = game:GetService("RunService")
local Client = script.Parent
local Hud = require(Client:WaitForChild("Hud"))
local Settings = require(Client:WaitForChild("Settings"))
local Gamepad = require(Client:WaitForChild("Gamepad"))

local SettingsMenu = { extra = {} }
local Schema = Settings.schema

local function rows(p, pad)
	local order = 0
	for _, r in ipairs(Schema.LIST) do
		local k = r[1]
		if Settings.active[k] and (Schema.PAD[k] == true) == pad then
			order += 1
			local d = Schema.BY[k]
			if d.names then
				local b
				b = Hud.button(p.list, "", function()
					Settings.cycle(k, 1)
					b.Text = d.label .. ": " .. Settings.text(k)
				end, 400, 32)
				b.Name = "Row_" .. k
				b.Text = d.label .. ": " .. Settings.text(k)
				b.LayoutOrder = order
			else
				local row = Instance.new("Frame")
				row.Name = "Row_" .. k
				row.Size = UDim2.fromOffset(400, 32)
				row.BackgroundTransparency = 1
				row.LayoutOrder = order
				row.Parent = p.list
				local lab = Hud.label(row, UDim2.fromOffset(0, 0), UDim2.fromOffset(280, 32), Vector2.new(0, 0), "", 16)
				lab.TextXAlignment = Enum.TextXAlignment.Left
				local function show() lab.Text = d.label .. ": " .. Settings.text(k) end
				show()
				local minus = Hud.button(row, "−", function()
					Settings.set(k, Settings.get(k) - 1)
					show()
				end, 50, 30)
				minus.Name = "Minus"
				minus.Position = UDim2.fromOffset(290, 1)
				local plus = Hud.button(row, "+", function()
					Settings.set(k, Settings.get(k) + 1)
					show()
				end, 50, 30)
				plus.Name = "Plus"
				plus.Position = UDim2.fromOffset(348, 1)
			end
		end
	end
	return order
end

function SettingsMenu.open()
	if Hud.isOpen("Settings") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("Settings", 430, 470)
	p.sub.Text = "Click a row to change it · saved with your progress"
	local order = rows(p, false)
	order += 1
	local g = Hud.button(p.list, "🎮 Gamepad / racing wheel setup", SettingsMenu.openPad, 400, 32, Color3.fromRGB(60, 90, 60))
	g.Name = "Extra_pad"
	g.LayoutOrder = order
	for _, e in ipairs(SettingsMenu.extra) do
		order += 1
		local b = Hud.button(p.list, e.text(), function() e.click(p) end, 400, 32, e.color)
		b.Name = "Extra_" .. e.name
		b.LayoutOrder = order
	end
end

-- the gamepad / wheel setup: live readings (raw axis, steering after the processing, gas, brake), then the rows
function SettingsMenu.openPad()
	local p = Hud.panel("Gamepad / racing wheel", 430, 500)
	p.sub.Text = "A G29 works through Steam Input or x360ce (as a gamepad) · no force feedback"
	local live = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(400, 40), Vector2.new(0, 0), "", 15)
	live.Name = "Live"
	live.LayoutOrder = 0
	live.TextWrapped = true
	rows(p, true)
	local conn
	conn = RunService.RenderStepped:Connect(function()
		if not live.Parent or not Hud.isOpen("Gamepad / racing wheel") then
			conn:Disconnect()
			return
		end
		local s = Gamepad.state
		live.Text = (s.on and "Gamepad connected" or "No gamepad input yet (move a stick or press a pedal)")
			.. string.format(" · raw %+.2f · steering %+.2f · gas %.2f · brake %.2f%s", s.raw, s.steer, s.thr, s.brk, s.hb and " · handbrake" or "")
	end)
end

return SettingsMenu
