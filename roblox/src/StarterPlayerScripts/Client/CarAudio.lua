-- Irbid Drive (Roblox) - the car and world sounds (the web game's 12d_audio.js audTick). Roblox cannot synthesise sound, so the web game's
-- synthesised sounds were rendered once into a sound atlas (tools/make_roblox_audio.js -> roblox/audio/IrbidDriveSounds.wav, upload it and
-- put its ID in Config.AUDIO_ATLAS_ID); each sound plays its region of the atlas and this module moves pitch and volume every frame with
-- the web game's rules:
--   engine: the car's engine layout (27 voices: cylinders, bank layout, aspiration), pitch = rpm, a full-load and a no-load voice mixed
--     by load, a second copy 0.4 % sharp (the web game's two detuned oscillators), level from load and rpm, a low-pass that opens with
--     load and rpm (approximated with an equaliser), the rev limiter, the dip at an upshift, turbo whistle and blow-off, supercharger
--     whine, intake roar, overrun pops (sporty petrol cars), hybrids creeping on the motor, the EV motor, the start-up sequence on a new
--     car (starter, uneven firing, flare, settle). RPM and gear: the Realistic gearbox, or in Arcade the web game's sound-only gearbox.
--   tyres: squeal on paved roads from the slip state (noise band + tone), gravel crunch off the road; wind, road roll, rain and wet hiss;
--   the nearest traffic car's engine; the horn (X); impacts (crash, glass, bump thump).
-- Volumes: the settings Sound / Engine / Effects / Ambient and Mute (L). The cockpit view muffles everything (the web game's low-pass).
local Workspace = game:GetService("Workspace")
local SoundService = game:GetService("SoundService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local CarPhysics = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("CarPhysics"))
local Atlas = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("AudioAtlas"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Settings = require(Client:WaitForChild("Settings"))
local CarDamage = require(Client:WaitForChild("CarDamage"))

local CarAudio = {}
local st, spec = State.st, State.spec
local ID = Config.AUDIO_ATLAS_ID or 0
CarAudio.enabled = ID ~= 0
Settings.provide("vol", "veng", "vfx", "vamb", "mute")

-- ---- the sound groups (the web game's master / engine / effects / ambient buses) and the cockpit muffle ----
local groups = {}
local function group(name)
	local g = Instance.new("SoundGroup")
	g.Name = "Irbid" .. name
	g.Volume = 0
	local eq = Instance.new("EqualizerSoundEffect")
	eq.Name = "Muffle"
	eq.HighGain, eq.MidGain, eq.LowGain = 0, 0, 0
	eq.Parent = g
	g.Parent = SoundService
	groups[name] = g
	return g
end
group("Engine")
group("Effects")
group("Ambient")
CarAudio.groups = groups

local function applyVolumes()
	local m = Settings.get("mute") == 1 and 0 or Settings.get("vol") / 10 * 0.8
	groups.Engine.Volume = m * Settings.get("veng") / 10
	groups.Effects.Volume = m * Settings.get("vfx") / 10
	groups.Ambient.Volume = m * Settings.get("vamb") / 10
end
Settings.onChange(function(k)
	if k == "vol" or k == "veng" or k == "vfx" or k == "vamb" or k == "mute" then applyVolumes() end
end)
applyVolumes()

-- L: mute / unmute (the web game's key)
function CarAudio.toggleMute()
	Settings.set("mute", 1 - Settings.get("mute"))
	Hud.toast(Settings.get("mute") == 1 and "Sound muted (L)" or "Sound on (L)")
end

-- ---- one sound = one region of the atlas ----
local sounds = {}
local function mk(name, part, grp)
	local a = Atlas[part]
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = "rbxassetid://" .. ID
	s.PlaybackRegionsEnabled = true
	s.PlaybackRegion = NumberRange.new(a.start, a.start + a.len)
	s.LoopRegion = NumberRange.new(a.start, a.start + a.len)
	s.Looped = a.loop
	s.Volume = 0
	s.SoundGroup = groups[grp]
	s.Parent = groups[grp]
	sounds[name] = { s = s, a = a }
	if a.loop and CarAudio.enabled then s:Play() end
	return s
end
-- a region change (the engine voice of another layout)
local function region(name, part)
	local o = sounds[name]
	local a = Atlas[part]
	if not (o and a) or o.a == a then return end
	o.a = a
	o.s.PlaybackRegion = NumberRange.new(a.start, a.start + a.len)
	o.s.LoopRegion = NumberRange.new(a.start, a.start + a.len)
	if CarAudio.enabled then o.s:Play() end
end
-- the loudness the part was normalised by, so the web game's relative levels hold
local function vol(name, v)
	local o = sounds[name]
	o.s.Volume = math.clamp(v * o.a.level, 0, 10)
end
local function speed(name, v)
	sounds[name].s.PlaybackSpeed = math.clamp(v, 0.05, 20)
end
-- one-shots: a pool of a few copies each, the web game's random pitch 0.85-1.15
local shots = {}
local function shot(part, n)
	shots[part] = { i = 0, list = {} }
	for k = 1, n do shots[part].list[k] = mk(part .. k, part, "Effects") end
end

mk("engOn", "eng_I4n_on", "Engine")
mk("engOff", "eng_I4n_off", "Engine")
mk("engOnB", "eng_I4n_on", "Engine")
mk("engOffB", "eng_I4n_off", "Engine")
mk("intake", "intake", "Engine")
mk("turbo", "turbo", "Engine")
mk("super", "super", "Engine")
mk("ev", "ev", "Engine")
mk("starter", "starter", "Engine")
mk("squeal", "squeal", "Effects")
mk("squealtone", "squealtone", "Effects")
mk("gravel", "gravel", "Effects")
mk("horn", "horn", "Effects")
mk("wind", "wind", "Ambient")
mk("road", "road", "Ambient")
mk("rain", "rain", "Ambient")
mk("wethiss", "wethiss", "Ambient")
mk("traffic", "traffic", "Ambient")
shot("crash", 3)
shot("glass", 2)
shot("thump", 2)
shot("blowoff", 2)
shot("pop", 3)

local function play(part, lvl, pitch)
	if not CarAudio.enabled then return end
	local p = shots[part]
	p.i = p.i % #p.list + 1
	local s = p.list[p.i]
	s.Volume = math.clamp(lvl * Atlas[part].level, 0, 10)
	s.PlaybackSpeed = pitch or (0.85 + math.random() * 0.3)
	s.TimePosition = Atlas[part].start
	s:Play()
	CarAudio.lastShot = part
end
CarAudio.play = play

-- ---- impacts (the web game: crash above 1.5 m/s, glass too above 11 m/s, at most every 60 ms), speed bumps ----
local hitT = -1
function CarAudio.hit(v)
	local now = Workspace.DistributedGameTime
	if v <= 1.5 or now - hitT < 0.06 then return end
	hitT = now
	play("crash", math.min(1, v / 22))
	if v > 11 then play("glass", 0.5) end
end
function CarAudio.bump(sev)
	play("thump", 0.25 + 0.5 * math.min(1, sev or 0))
end

-- the player's horn (X): on / off
local hornOn = false
function CarAudio.horn(on)
	hornOn = on
end

-- ---- the web game's sound-only gearbox for Arcade (same per-car ratios as Realistic, upshift near the redline under throttle) ----
local AG = { gear = 1, rpm = 850, sh = 0 }
local function audRpm(snd, v, th, real)
	local P = State.phys and State.phys.pts
	if real and P then return P.rpm, P.gear, P.spin, P.shift > 0 end
	local s = spec.pt
	local kv = math.max(0.3, spec.vm / s.vref)
	local T = State.phys and State.phys.tslip
	local spin = T and T.spin or 0
	if snd.ev then
		AG.gear = 1
		AG.rpm = math.max(0, CarPhysics.ptGear(s, v, 1) / kv)
		return AG.rpm, 1, spin, false
	end
	local r = CarPhysics.ptGear(s, v, AG.gear) / kv
	if AG.gear < s.ng and r >= s.red * (th > 0.6 and 0.95 or 0.62) then
		AG.gear += 1
		AG.sh = s.shiftT
		r = CarPhysics.ptGear(s, v, AG.gear) / kv
	elseif AG.gear > 1 and CarPhysics.ptGear(s, v, AG.gear - 1) / kv < s.red * (th > 0.6 and 0.85 or 0.5) and r < s.red * (th > 0.6 and 0.55 or 0.3) then
		AG.gear -= 1
	end
	AG.sh = math.max(0, AG.sh - 1 / 60)
	r = math.max(r, (v < 6 and AG.gear == 1) and s.idle + (s.red * 0.45 - s.idle) * th * math.clamp(v / 6 + 0.4, 0, 1) or s.idle)
	if spin > 0.2 then r = math.max(r, s.red * (0.6 + 0.35 * spin)) end
	AG.rpm += (math.min(r, s.red) - AG.rpm) * 0.25
	return AG.rpm, AG.gear, spin, AG.sh > 0
end

-- ---- per frame ----
local cur, sw = nil, { ph = "start", t = 0 }
local lastG, dip, boost, bov, frame, t = 1, 0, 0, false, 0, 0
local trT, trCar, trD = 0, nil, 1e9
function CarAudio.step(dt, paved, cam)
	t += dt
	frame += 1
	local c = Config.CARS[spec.ci or 1]
	local snd = c and c.snd
	if not (snd and spec.pt) then return end
	-- a new car: the old engine stops (0.35 s), then the new one cranks and starts
	if cur ~= spec.ci then
		if cur ~= nil and sw.ph ~= "stop" then
			sw = { ph = "stop", t = 0 }
		elseif cur == nil or sw.t > 0.35 then
			cur = spec.ci
			AG.gear, AG.rpm = 1, snd.idle
			lastG = 1
			sw = { ph = "start", t = 0 }
			if not snd.ev then
				region("engOn", "eng_" .. snd.code .. "_on")
				region("engOff", "eng_" .. snd.code .. "_off")
				region("engOnB", "eng_" .. snd.code .. "_on")
				region("engOffB", "eng_" .. snd.code .. "_off")
			end
		end
	end
	sw.t += dt
	local inp = State.input
	local th, br = inp.th, inp.br
	if State.ui then th, br = 0, 1 end
	local v = math.sqrt(st.vx * st.vx + st.vz * st.vz)
	local real = State.phys and State.phys.mode == 1
	local rpm, gear, spin = audRpm(snd, v, th, real)
	local red, idle = snd.red, snd.idle
	-- start-up sequence: crank (starter whine, slow uneven firing), flare above idle, settle
	local crank, lvlK = 0, 1
	if sw.ph == "stop" then
		local k = math.max(0, 1 - sw.t / 0.35)
		rpm, lvlK, spin = idle * k, k, 0
	elseif sw.ph == "start" then
		if snd.ev then
			lvlK = math.min(1, sw.t / 0.6)
			if sw.t > 0.6 then sw.ph = "run" end
		elseif sw.t < 0.55 then
			crank, rpm, lvlK = 1, 230 + 50 * math.sin(sw.t * 55), 0.35
		elseif sw.t < 1.5 then
			rpm = math.max(rpm, idle * (1 + 0.7 * math.exp(-(sw.t - 0.6) * 5) * (sw.t < 0.7 and (sw.t - 0.55) / 0.15 or 1)))
		else
			sw.ph = "run"
		end
	end
	local lim = not snd.ev and rpm >= red * 0.975 and th > 0.5
	local gate = lim and ((math.floor(frame / 2) % 2 == 1) and 1 or 0.2) or 1
	local load = math.clamp(th * (0.6 + 0.4 * (1 - v / math.max(10, spec.vm))) + (spin > 0.2 and 0.3 or 0), 0, 1)
	if gear ~= lastG then
		if gear > lastG and th > 0.3 then
			dip = 0.14
			if snd.asp == "t" then play("blowoff", 0.05) end
		end
		lastG = gear
	end
	dip = math.max(0, dip - dt)
	local hybEV = snd.hyb and v < 6 and th < 0.5 and sw.ph == "run"
	-- damage (Full): a weak engine misfires, a dead one is silent
	local dr = CarDamage.mode() == 2 and CarDamage.record() or nil
	local eh = dr and dr.engine or 100
	local mis = eh < 35 and math.random() < (35 - eh) / 120
	if not snd.ev then
		local f = rpm / 3000
		speed("engOn", f)
		speed("engOff", f)
		speed("engOnB", f * 1.004)
		speed("engOffB", f * 1.004)
		local lv = snd.lvl * (hybEV and 0 or 1) * gate * (mis and 0.15 or 1) * (dip > 0 and 0.4 or 1) * lvlK * (eh <= 0 and 0 or 1)
		local base = lv * (0.32 + 0.68 * load) * (0.55 + 0.45 * rpm / red)
		vol("engOn", base * load)
		vol("engOff", base * (1 - load))
		vol("engOnB", base * load * 0.32)
		vol("engOffB", base * (1 - load) * 0.32)
		-- the web game's load / rpm low-pass, approximated by the engine group's equaliser
		local cut = math.min(16000, snd.lpf * (0.45 + 0.9 * load) * (0.7 + 0.6 * rpm / red))
		local eq = groups.Engine.Muffle
		eq.HighGain = cam == 1 and -20 or math.clamp(20 * math.log10(cut / 8000), -30, 0)
		eq.MidGain = cam == 1 and -6 or math.clamp(20 * math.log10(cut / 2000), -20, 0)
		vol("intake", 0.07 * th * rpm / red * snd.lvl)
		speed("intake", (150 + rpm * 0.12) / 300)
		local b = snd.asp == "t" and math.clamp((rpm / red - 0.3) / 0.5, 0, 1) * th or 0
		boost += (b - boost) * math.min(1, dt * (b > boost and 2.2 or 6))
		vol("turbo", 0.012 * boost * boost)
		speed("turbo", (2600 + 5200 * boost) / 3000)
		if snd.asp == "t" and th < 0.15 and boost > 0.45 and not bov then
			bov = true
			play("blowoff", 0.09 * boost, 1)
		end
		if th > 0.3 then bov = false end
		vol("super", snd.asp == "s" and 0.02 * th * rpm / red or 0)
		speed("super", rpm * 0.23 / 800)
		if th < 0.05 and rpm > red * 0.5 and not snd.lux and snd.asp ~= "d" and string.find("rmqco", snd.kind, 1, true) and math.random() < 0.05 then
			play("pop", 0.2 * snd.lvl * math.random())
		end
	else
		vol("engOn", 0)
		vol("engOff", 0)
		vol("engOnB", 0)
		vol("engOffB", 0)
		vol("intake", 0)
		vol("turbo", 0)
		vol("super", 0)
	end
	vol("starter", crank == 1 and 0.05 or 0)
	-- EV whine (also hybrids in EV mode)
	local evOn = snd.ev or hybEV
	local mr = snd.ev and rpm or v * 60
	vol("ev", evOn and (0.012 + 0.05 * load) * lvlK * math.min(1, 0.15 + mr / 4000) or 0)
	speed("ev", (40 + mr * 0.11) / 400)
	-- tyres: squeal on pavement from the slip state, gravel off the road
	local T = State.phys and State.phys.tslip
	local tr, tf, tl = T and T.r or 0, T and T.f or 0, T and T.lock or 0
	local sl = math.clamp(math.max(tr, tf * 0.8, spin * 0.9, tl, (br > 0.8 and v > 8) and 0.25 or 0), 0, 1.6)
	local sq = (st.gnd and (v > 2 or spin > 0.2)) and math.min(1, sl) or 0
	vol("squeal", paved and 0.22 * sq or 0)
	vol("squealtone", paved and 0.045 * sq * sq or 0)
	speed("squeal", (900 + 260 * sl) / 1000)
	speed("squealtone", (980 + 220 * sl) * (1 + 0.015 * math.sin(t * 33)) / 1050)
	vol("gravel", (not paved and st.gnd) and math.min(0.25, v / 40) * (0.4 + sq) or 0)
	-- wind, road roll, rain, wet tyres
	vol("wind", 0.32 * math.min(1.4, v / 45) ^ 2)
	speed("wind", (350 + v * 14) / 500)
	vol("road", st.gnd and math.min(0.35, v / 30 * 0.22) * (paved and 1 or 1.7) or 0)
	speed("road", (160 + v * 7) / 250)
	local wx = State.phys and State.phys.wx
	local rain = State.weather and State.weather.rain or 0
	vol("rain", 0.16 * rain)
	vol("wethiss", (st.gnd and wx) and 0.12 * wx.wet * math.min(1, v / 25) or 0)
	speed("wethiss", (1800 + v * 25) / 2400)
	-- the nearest traffic car (refreshed 6 times a second)
	trT -= dt
	if trT <= 0 then
		trT = 0.16
		trCar, trD = nil, 1600
		for _, a in ipairs(State.ai) do
			if a.kind == "traffic" then
				local d = (a.x - st.x) ^ 2 + (a.z - st.z) ^ 2
				if d < trD then trCar, trD = a, d end
			end
		end
		trD = math.sqrt(trD)
	end
	vol("traffic", trCar and 0.18 * math.min(1, 6 / math.max(6, trD)) * (0.3 + math.min(1, (trCar.v or 0) / 12)) or 0)
	if trCar then speed("traffic", (850 + (trCar.v or 0) * 110) / 3000) end
	vol("horn", hornOn and 0.16 or 0)
	-- cockpit: everything outside muffled (the web game's 2.6 kHz low-pass)
	local m = cam == 1
	groups.Effects.Muffle.HighGain = m and -20 or 0
	groups.Ambient.Muffle.HighGain = m and -20 or 0
	groups.Effects.Muffle.MidGain = m and -6 or 0
	groups.Ambient.Muffle.MidGain = m and -6 or 0
	CarAudio.rpm, CarAudio.load = rpm, load
end

return CarAudio
