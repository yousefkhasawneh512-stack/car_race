-- Irbid Drive (Roblox) - the player settings (the web game's pause menu, 12e_pause.js, and its separate localStorage keys), shared by the
-- server (which checks and saves them with the progress) and the devices. Every setting is a whole number in [min, max].
-- Wire format (player attribute "Settings", remote SaveSettings): "key=value;key=value".
local Schema = {}

-- the gamepad buttons a binding can name (value -1 = none, 0 = A ... 11 = d-pad right)
local BTN = { "None", "A", "B", "X", "Y", "LB", "RB", "L3", "R3", "D-pad up", "D-pad down", "D-pad left", "D-pad right" }

-- key, min, max, default, label, value names (index = value - min + 1)
Schema.LIST = ({
	{ "hm", 0, 1, 0, "Handling", { "Arcade", "Realistic" } },
	{ "gb", 0, 1, 0, "Gearbox", { "Automatic", "Manual (Q / E)" } },
	{ "abs", 0, 1, 1, "ABS", { "Off", "On" } },
	{ "tc", 0, 1, 0, "Traction control", { "Off", "On" } },
	{ "esc", 0, 1, 0, "Stability control", { "Off", "On" } },
	{ "tt", 0, 1, 0, "Tyre temperature", { "Off", "On" } },
	{ "bf", 0, 1, 0, "Brake fade", { "Off", "On" } },
	{ "dm", 0, 2, 0, "Damage", { "Off", "Cosmetic", "Full" } },
	{ "wx", 0, 3, 0, "Weather", { "Auto (Irbid climate)", "Clear", "Cloudy", "Rain" } },
	{ "clk", 0, 1, 0, "Clock", { "Game time", "Irbid local time" } },
	{ "tr", 0, 3, 0, "Traffic", { "High", "Medium", "Low", "By time of day" } },
	{ "cam", 0, 4, 0, "Camera", { "Chase", "Cockpit", "Bonnet", "Bumper", "Free" } },
	{ "vol", 0, 10, 8, "Sound", nil },
	{ "veng", 0, 10, 8, "Engine volume", nil },
	{ "vfx", 0, 10, 8, "Effects volume", nil },
	{ "vamb", 0, 10, 6, "Ambient volume", nil },
	{ "mute", 0, 1, 0, "Mute", { "Off", "On" } },
	{ "rm", 0, 1, 0, "Reduced motion", { "Off", "On" } },
	{ "ts", 0, 3, 1, "Text size", { "90 %", "100 %", "120 %", "140 %" } },
	{ "rep", 0, 1, 1, "Road reputation", { "Off", "On" } },
	-- graphics (Client/Graphics, Modules/GraphicsPresets)
	{ "gq", 0, 4, 0, "Graphics quality", { "Auto", "Low", "Medium", "High", "Ultra" } },
	{ "gsh", 0, 2, 0, "Shadows", { "As the preset", "Off", "On" } },
	{ "gpe", 0, 2, 0, "Colour grading + bloom", { "As the preset", "Off", "On" } },
	{ "gdd", 5, 15, 10, "Draw distance (x10 %)", nil },
	-- gamepad / racing wheel seen as a gamepad (the web game's wheel setup, key V): axes, invert, sensitivity, dead zones, curve, smoothing
	{ "gs", 0, 1, 0, "Gamepad steering", { "Left stick", "Right stick" } },
	{ "gp", 0, 2, 0, "Gamepad pedals", { "Triggers (RT gas, LT brake)", "Right stick up / down", "Left stick up / down" } },
	{ "ginv", 0, 1, 0, "Invert steering", { "Off", "On" } },
	{ "gsens", 5, 25, 10, "Steering sensitivity (x0.1)", nil },
	{ "gdz", 0, 30, 8, "Steering dead zone (%)", nil },
	{ "gcen", -20, 20, 0, "Steering centre offset (%)", nil },
	{ "gcurve", 10, 30, 10, "Steering response curve (x0.1)", nil },
	{ "gsm", 0, 10, 0, "Steering smoothing (x20 ms)", nil },
	{ "gpdz", 0, 20, 3, "Pedal dead zone (%)", nil },
	{ "grum", 0, 1, 1, "Rumble on impacts", { "Off", "On" } },
	-- gamepad buttons: -1 = none, then A B X Y LB RB L3 R3, d-pad up / down / left / right
	{ "bhb", -1, 11, 0, "Button: handbrake (hold)", BTN },
	{ "bup", -1, 11, 5, "Button: shift up", BTN },
	{ "bdn", -1, 11, 4, "Button: shift down", BTN },
	{ "bcam", -1, 11, 3, "Button: camera", BTN },
	{ "bhorn", -1, 11, 2, "Button: horn (hold)", BTN },
	{ "brace", -1, 11, 1, "Button: race / duel", BTN },
	{ "breset", -1, 11, 7, "Button: back to the start", BTN },
	{ "btour", -1, 11, 6, "Button: landmark tour", BTN },
	{ "bgps", -1, 11, 8, "Button: GPS", BTN },
	{ "bset", -1, 11, 9, "Button: settings", BTN },
	{ "bnext", -1, 11, 11, "Button: next car", BTN },
	{ "bprev", -1, 11, 10, "Button: previous car", BTN },
} :: { { any } })
-- the gamepad / wheel rows have their own panel (the web game's wheel setup screen)
Schema.PAD = {}
for _, k in ipairs({ "gs", "gp", "ginv", "gsens", "gdz", "gcen", "gcurve", "gsm", "gpdz", "grum" }) do Schema.PAD[k] = true end
for _, r in ipairs(Schema.LIST) do
	if r[6] == BTN then Schema.PAD[r[1]] = true end
end
Schema.BY = {}
for _, r in ipairs(Schema.LIST) do
	Schema.BY[r[1]] = { min = r[2], max = r[3], def = r[4], label = r[5], names = r[6] }
end

-- the defaults
function Schema.defaults()
	local t = {}
	for _, r in ipairs(Schema.LIST) do t[r[1]] = r[4] end
	return t
end

-- parse and check a wire string (unknown keys and bad values are ignored; missing keys get the default)
function Schema.parse(s)
	local t = Schema.defaults()
	if type(s) ~= "string" or #s > 1500 then return t end
	for k, v in string.gmatch(s, "(%a+)=(%-?%d+)") do
		local d = Schema.BY[k]
		local n = tonumber(v)
		if d and n and n >= d.min and n <= d.max and n == math.floor(n) then t[k] = n end
	end
	return t
end

function Schema.encode(t)
	local out = {}
	for _, r in ipairs(Schema.LIST) do
		local v = t[r[1]]
		if v == nil then v = r[4] end
		out[#out + 1] = r[1] .. "=" .. tostring(v)
	end
	return table.concat(out, ";")
end

-- the text of a value ("Realistic", "8 / 10")
function Schema.text(k, v)
	local d = Schema.BY[k]
	if d.names then return d.names[v - d.min + 1] or tostring(v) end
	return tostring(v) .. " / " .. tostring(d.max)
end

return Schema
