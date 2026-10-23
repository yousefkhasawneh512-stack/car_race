-- Irbid Drive (Roblox) - graphics quality presets Low / Medium / High / Ultra (setting "gq"; values from the owner's starter pack
-- MapVisualConfig.lua, 2026-10-24, adapted). PURE: no Roblox services, so the Luau CLI can test it. Client/Graphics applies the result.
-- What a preset sets: shadows (Lighting.GlobalShadows), the sky's diffuse / specular light on surfaces (EnvironmentDiffuseScale /
-- EnvironmentSpecularScale: Ultra's specular is what makes paint and wet roads reflect the sky), colour grading + bloom (+ sun rays on
-- Ultra), how far street furniture and trees are drawn (x the web game's level-of-detail radius) and how dense the rain is.
-- Not set here: Brightness, ambient light and haze (Client/Weather owns them every frame: clouds, rain, time of day) and FogEnd (an
-- Atmosphere replaces Roblox's fog). Lighting.Technology cannot be changed by a script: the place file sets Future
-- (tools/make_roblox.js), and Roblox lowers it by itself on devices that cannot draw it.
local GraphicsPresets = {}

GraphicsPresets.NAMES = { "Auto", "Low", "Medium", "High", "Ultra" }

GraphicsPresets.LIST = {
	Low = { shadows = false, diffuse = 0.35, specular = 0.15, post = false, sunRays = false, dist = 0.6, rain = 0.4 },
	Medium = { shadows = true, diffuse = 0.5, specular = 0.3, post = false, sunRays = false, dist = 0.8, rain = 0.7 },
	High = { shadows = true, diffuse = 0.65, specular = 0.45, post = true, sunRays = false, dist = 1, rain = 1 },
	Ultra = { shadows = true, diffuse = 0.75, specular = 0.6, post = true, sunRays = true, dist = 1.3, rain = 1 },
}

-- Roblox's own graphics quality (Esc menu: 1-10, 0 = automatic) -> a preset for "Auto"
function GraphicsPresets.fromQuality(q)
	if type(q) ~= "number" or q <= 0 then return "High" end
	if q <= 3 then return "Low" end
	if q <= 5 then return "Medium" end
	if q <= 8 then return "High" end
	return "Ultra"
end

-- the settings -> what to draw. gq 0 Auto (from the Roblox quality q) / 1 Low / 2 Medium / 3 High / 4 Ultra; gsh shadows and gpe
-- colour grading: 0 as the preset, 1 off, 2 on; gdd draw distance in tenths (10 = the preset's)
function GraphicsPresets.resolve(gq, gsh, gpe, gdd, q)
	local name = (gq and gq >= 1 and GraphicsPresets.NAMES[gq + 1]) or GraphicsPresets.fromQuality(q)
	local r = table.clone(GraphicsPresets.LIST[name])
	r.name = name
	if gsh == 1 then r.shadows = false elseif gsh == 2 then r.shadows = true end
	if gpe == 1 then
		r.post, r.sunRays = false, false
	elseif gpe == 2 then
		r.post = true
	end
	r.dist = r.dist * (gdd or 10) / 10
	return r
end

return GraphicsPresets
