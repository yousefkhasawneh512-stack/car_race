-- Irbid Drive (Roblox) - this player's settings on the device: read from the player attribute "Settings" (the saved ones, set by the
-- server), changed by the settings menu and the keys (H handling, Q / E gearbox...), sent back to the server to be saved.
-- Settings.onChange(fn) -> fn(key, value) after every change (and once per key at the start).
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Schema = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("SettingsSchema"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Settings = { schema = Schema }
local plr = Players.LocalPlayer
local cur = Schema.parse(plr:GetAttribute("Settings"))
local subs = {}
local dirty = false

function Settings.get(k)
	return cur[k]
end

function Settings.onChange(fn)
	subs[#subs + 1] = fn
	for _, r in ipairs(Schema.LIST) do fn(r[1], cur[r[1]]) end
end

local function fire(k, v)
	for _, fn in ipairs(subs) do fn(k, v) end
end

-- set one setting (checked against the schema); saved within a second
function Settings.set(k, v)
	local d = Schema.BY[k]
	if not d then return end
	v = math.clamp(math.floor(v), d.min, d.max)
	if cur[k] == v then return end
	cur[k] = v
	dirty = true
	fire(k, v)
end

-- the next value of a setting (menu rows cycle through their values)
function Settings.cycle(k, dir)
	local d = Schema.BY[k]
	local n = d.max - d.min + 1
	Settings.set(k, d.min + (cur[k] - d.min + (dir or 1)) % n)
	return cur[k]
end

function Settings.text(k)
	return Schema.text(k, cur[k])
end

-- the settings whose system exists on this device (the menu lists only these); modules call provide() for theirs
Settings.active = {}
function Settings.provide(...)
	for _, k in ipairs({ ... }) do Settings.active[k] = true end
end

-- the saved settings arrive after the device started (the server loads the DataStore record first)
plr:GetAttributeChangedSignal("Settings"):Connect(function()
	if dirty then return end
	local t = Schema.parse(plr:GetAttribute("Settings"))
	for _, r in ipairs(Schema.LIST) do
		local k = r[1]
		if t[k] ~= cur[k] then
			cur[k] = t[k]
			fire(k, t[k])
		end
	end
end)

-- send the changes (at most once a second)
task.spawn(function()
	while true do
		task.wait(1)
		if dirty then
			dirty = false
			Remotes.SaveSettings:FireServer(Schema.encode(cur))
		end
	end
end)

return Settings
