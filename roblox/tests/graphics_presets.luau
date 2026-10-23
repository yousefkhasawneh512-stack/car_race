-- Irbid Drive (Roblox): Modules/GraphicsPresets (pure). Run: luau roblox/tests/graphics_presets.luau (exit 1 on a failure)
local G = require("../src/ReplicatedStorage/Modules/GraphicsPresets")
local n, bad = 0, 0
local function ok(name, c)
	n += 1
	if not c then
		bad += 1
		print("FAIL " .. name)
	end
end
ok("Auto without a readable quality = High", G.resolve(0, 0, 0, 10, 0).name == "High")
ok("Auto, Roblox quality 2 = Low", G.resolve(0, 0, 0, 10, 2).name == "Low")
ok("Auto, quality 5 = Medium", G.resolve(0, 0, 0, 10, 5).name == "Medium")
ok("Auto, quality 7 = High", G.resolve(0, 0, 0, 10, 7).name == "High")
ok("Auto, quality 10 = Ultra", G.resolve(0, 0, 0, 10, 10).name == "Ultra")
ok("a chosen preset ignores Roblox's quality", G.resolve(1, 0, 0, 10, 10).name == "Low")
ok("shadows On overrides Low", G.resolve(1, 2, 0, 10, 0).shadows == true)
ok("shadows Off overrides Ultra", G.resolve(4, 1, 0, 10, 0).shadows == false)
ok("grading Off also turns sun rays off", G.resolve(4, 0, 1, 10, 0).sunRays == false and G.resolve(4, 0, 1, 10, 0).post == false)
ok("grading On on Low (no sun rays)", G.resolve(1, 0, 2, 10, 0).post == true and G.resolve(1, 0, 2, 10, 0).sunRays == false)
ok("draw distance x the preset", math.abs(G.resolve(4, 0, 0, 15, 0).dist - 1.95) < 1e-9 and math.abs(G.resolve(1, 0, 0, 5, 0).dist - 0.3) < 1e-9)
ok("resolve does not change the presets", G.LIST.Ultra.dist == 1.3 and G.LIST.Low.shadows == false)
local last = -1
for _, k in ipairs({ "Low", "Medium", "High", "Ultra" }) do
	local p = G.LIST[k]
	ok(k .. ": every field", p.shadows ~= nil and p.diffuse and p.specular and p.post ~= nil and p.sunRays ~= nil and p.dist and p.rain)
	ok(k .. ": more than the preset below it", p.specular > last)
	last = p.specular
end
print(string.format("graphics_presets: %d / %d passed", n - bad, n))
if bad > 0 then os.exit(1) end
