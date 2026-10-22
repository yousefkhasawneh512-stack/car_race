-- Irbid Drive (Roblox) - the driving school (the web game's 11d_school.js): five lessons on REAL streets near the start, with the player's
-- normal car and controls (nothing is simulated for the player). A lesson finds a straight two-way OSM street (or an approach to a signalised
-- junction), marks zones on the road, gives instructions, watches speed, stops and the real fine rules (speeding, red light, wrong way,
-- hitting cars) and scores 0-100. Rules: right-hand traffic, stop lines 13.5 m before the junction centre, the OSM speed limits, 3 km/h
-- tolerance. Best scores are saved with the progress (remote SaveSchool, player attribute "School"). Opened from the settings menu.
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local Ground = require(Client:WaitForChild("Ground"))
local Signals = require(Client:WaitForChild("Signals"))
local Drive = require(Client:WaitForChild("Drive"))
local Traffic = require(Client:WaitForChild("Traffic"))
local Gps = require(Client:WaitForChild("Gps"))
local AutoDrive = require(Client:WaitForChild("AutoDrive"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local School = {}
local S = Config.SCALE
local plr = Players.LocalPlayer
local st = State.st
local RULES = { side = 1, stopLine = 13.5, tolKmh = 3 }
local SCH = { on = nil, t = 0, best = {}, runs = 0, site = nil, pen = {}, score = 0, st = "", msg = "", over = false, last = {} }
School.state = SCH

-- ---- saving: "runs=n;stop=95;brake=80;..." ----
local function load()
	local s = plr:GetAttribute("School")
	if type(s) ~= "string" then return end
	for k, v in string.gmatch(s, "(%a+)=(%d+)") do
		if k == "runs" then SCH.runs = tonumber(v) else SCH.best[k] = math.clamp(tonumber(v), 0, 100) end
	end
end
load()
local function save()
	local out = { "runs=" .. SCH.runs }
	for k, v in pairs(SCH.best) do out[#out + 1] = k .. "=" .. v end
	Remotes.SaveSchool:FireServer(table.concat(out, ";"))
end

local function kmh()
	return math.sqrt(st.vx * st.vx + st.vz * st.vz) * 3.6
end
local function fwd()
	return st.vx * math.sin(st.h) + st.vz * math.cos(st.h)
end

-- ---- finding a street: a straight stretch of `len` m along an edge's points (dir 1 = along, -1 = against); toEnd = it must end there ----
local function straight(e, dir: number, len: number, toEnd: boolean)
	local p: { { number } } = {}
	for k = 1, e.n do
		local q = dir > 0 and k or e.n + 1 - k
		p[k] = { e.x[q], e.z[q] }
	end
	local n = #p
	local c = { 0 }
	for i = 2, n do c[i] = c[i - 1] + math.sqrt((p[i][1] - p[i - 1][1]) ^ 2 + (p[i][2] - p[i - 1][2]) ^ 2) end
	local function ok(i, j)
		local ax, az = p[i][1], p[i][2]
		local dx, dz = p[j][1] - ax, p[j][2] - az
		local l = math.sqrt(dx * dx + dz * dz)
		if l == 0 then l = 1 end
		for k = i + 1, j - 1 do
			if math.abs(((p[k][1] - ax) * dz - (p[k][2] - az) * dx) / l) > 1.2 then return false end
		end
		return true
	end
	for j = n, 2, -1 do
		local i = j
		while i > 1 and c[j] - c[i] < len do i -= 1 end
		if c[j] - c[i] >= len and ok(i, j) then
			local dx, dz = p[j][1] - p[i][1], p[j][2] - p[i][2]
			local l = math.sqrt(dx * dx + dz * dz)
			return { x0 = p[i][1], z0 = p[i][2], x1 = p[j][1], z1 = p[j][2], ux = dx / l, uz = dz / l, len = l, e = e }
		end
		if toEnd then return nil end
	end
	return nil
end
-- the nearest suitable street to (x, z): two-way, not a ramp or roundabout, 6+ m wide, 30-70 km/h; lit = approach to a signalised junction
function School.find(x, z, len, lit)
	local best, bd = nil, 1e18
	for _, e in ipairs(State.road.edges) do
		if not (e.ow or e.fk == "ring" or e.fk == "ramp" or e.w < 6 or e.lim < 30 or e.lim > 70 or e.len < len) then
			local mx, mz = (e.x[1] + e.x[e.n]) / 2, (e.z[1] + e.z[e.n]) / 2
			local d = (mx - x) ^ 2 + (mz - z) ^ 2
			if d < bd and d <= 3000 * 3000 then
				if lit then
					for _, q in ipairs({ { e.b, 1 }, { e.a, -1 } }) do
						local nd = State.road.nodes[q[1]]
						if nd and nd.lit and nd.lit.ph[e.id] ~= nil then
							local s = straight(e, q[2], len, true)
							if s then
								s.nd = nd
								best, bd = s, d
							end
						end
					end
				else
					local s = straight(e, 1, len, false)
					if s then best, bd = s, d end
				end
			end
		end
	end
	if best then
		best.rx, best.rz = -best.uz * RULES.side, best.ux * RULES.side
		best.h = math.atan2(best.ux, best.uz)
		best.lane = math.min(2.6, best.e.w * 0.25)
	end
	return best
end

-- ---- road markers: a translucent floor scaled to the zone + two 1.8 m posts at its far corners ----
local folder = Instance.new("Folder")
folder.Name = "SchoolMarkers"
folder.Parent = Workspace
local function marker(name, color)
	local m = { floor = Instance.new("Part"), posts = { Instance.new("Part"), Instance.new("Part") } }
	for _, p in ipairs({ m.floor, m.posts[1], m.posts[2] }) do
		p.Name = name
		p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
		p.Color = color
		p.Material = Enum.Material.Neon
		p.Transparency = 1
		p.Parent = folder
	end
	return m
end
local MK = { zone = marker("Zone", Color3.fromHex("#3cff9a")), line = marker("Line", Color3.fromHex("#ff5a5a")), finish = marker("End", Color3.fromHex("#4aa3ff")) }
local function put(m, s, along, side, w, l)
	local x, z = s.x0 + s.ux * along + s.rx * side, s.z0 + s.uz * along + s.rz * side
	local y = Ground.TH(x, z) + 0.12 + 0.08
	local cf = CFrame.new(Vector3.new(x, y, z) * S) * CFrame.Angles(0, s.h + math.pi, 0)
	m.floor.Size = Vector3.new(w * S, 0.08 * S, l * S)
	m.floor.CFrame = cf
	m.floor.Transparency = 0.4
	for i, p in ipairs(m.posts) do
		p.Size = Vector3.new(0.18 * S, 1.8 * S, 0.18 * S)
		p.CFrame = cf * CFrame.new((i == 1 and 1 or -1) * w / 2 * S, 0.9 * S, -l / 2 * S)
		p.Transparency = 0
	end
	return { x = x, z = z }
end
local function hideAll()
	for _, m in pairs(MK) do
		m.floor.Transparency = 1
		for _, p in ipairs(m.posts) do p.Transparency = 1 end
	end
end
local function loc(s)
	local dx, dz = st.x - s.x0, st.z - s.z0
	return { a = dx * s.ux + dz * s.uz, l = dx * s.rx + dz * s.rz }
end

-- ---- penalties and the end of a lesson ----
local function pen(m, p, k, cd)
	if not SCH.on or SCH.over then return end
	local t = SCH.last[k]
	if t ~= nil and SCH.t - t < cd then return end
	SCH.last[k] = SCH.t
	SCH.pen[#SCH.pen + 1] = { m, p }
	SCH.score = math.max(0, SCH.score - p)
	if p > 0 then Hud.toast("Instructor: " .. m .. " (−" .. p .. ")") end
end
local function finish(r, m)
	SCH.over, SCH.st, SCH.msg = true, r, m
	if r == "fail" then SCH.score = 0 end
	local L = SCH.on
	SCH.runs += 1
	if r == "pass" and not ((SCH.best[L.id] or -1) >= SCH.score) then SCH.best[L.id] = SCH.score end
	save()
	School.result()
	return r
end

-- ---- the lessons (the web game's LESSONS): setup(site) places markers; tick(dt, s, L) -> "run" | "pass" | "fail" ----
local LESSONS = {
	{ id = "stop", name = "1. Start and stop", goal = "Drive to the green box and stop inside it. Stay under 40 km/h.", len = 130,
		setup = function(s) s.zc = put(MK.zone, s, 90, s.lane, 3.2, 8) end,
		tick = function(dt, s, L)
			if kmh() > 40 + RULES.tolKmh then pen("Too fast: " .. math.floor(kmh() + 0.5) .. " km/h (40 max)", 8, "spd", 1.5) end
			if L.a > 110 then return finish("fail", "You drove past the box.") end
			if kmh() < 0.6 and SCH.t > 3 and L.a > 20 then
				local da, dl = math.abs(L.a - 90), math.abs(L.l - s.lane)
				if da <= 4 and dl <= 1.6 then
					pen("Distance from the box centre " .. string.format("%.1f", da) .. " m", math.floor(da * 3 + 0.5), "pos", 99)
					return finish("pass", "Stopped in the box.")
				end
				if SCH.t > 8 then SCH.msg = "Not in the box yet: " .. (L.a < 90 and (math.floor(86 - L.a + 0.5) .. " m to go") or "too far") end
			end
			return "run"
		end },
	{ id = "brake", name = "2. Emergency stop", goal = "Reach 50 km/h before the red line, then brake hard and stop within 30 m, keeping straight.", len = 230,
		setup = function(s)
			put(MK.line, s, 130, s.lane, 4, 1.2)
			put(MK.zone, s, 145, s.lane, 3.2, 30)
		end,
		tick = function(dt, s, L)
			if not s.at and L.a >= 130 then
				s.at, s.v0, s.l0 = true, kmh(), L.l
				if s.v0 < 50 then pen("Only " .. math.floor(s.v0 + 0.5) .. " km/h at the line (50 needed)", math.floor((50 - s.v0) * 2 + 0.5), "slow", 99) end
				SCH.msg = "BRAKE!"
			end
			if s.at then
				s.dl = math.max(s.dl or 0, math.abs(L.l - s.l0))
				if kmh() < 0.6 then
					local d = L.a - 130
					if d > 30 then return finish("fail", "Stopped " .. string.format("%.1f", d) .. " m after the line (30 m allowed).") end
					pen("Stopping distance " .. string.format("%.1f", d) .. " m", math.max(0, math.floor((d - 18) * 2 + 0.5)), "dist", 99)
					if s.dl > 1.5 then pen("Drifted " .. string.format("%.1f", s.dl) .. " m sideways", math.floor(s.dl * 6 + 0.5), "lat", 99) end
					return finish("pass", "Stopped " .. string.format("%.1f", d) .. " m after the line from " .. math.floor(s.v0 + 0.5) .. " km/h.")
				end
			elseif L.a > 40 and kmh() < 5 and SCH.t > 12 then
				SCH.msg = "Accelerate to 50 km/h before the red line."
			end
			if L.a > 200 then return finish("fail", "You did not stop.") end
			return "run"
		end },
	{ id = "limit", name = "3. Speed limit", goal = "Drive to the blue marker without going over the street's speed limit. Keep to the right.", len = 320,
		setup = function(s)
			s.lim = s.e.lim or 50
			put(MK.finish, s, 300, s.lane, 4, 3)
		end,
		tick = function(dt, s, L)
			if kmh() > s.lim + RULES.tolKmh then pen("Over the limit: " .. math.floor(kmh() + 0.5) .. " in a " .. s.lim .. " km/h street", 4, "spd", 1) end
			if L.l < -0.3 then pen("Left of the centre line (keep right)", 5, "side", 2) end
			if SCH.msg == "" then SCH.msg = "Limit " .. s.lim .. " km/h · " .. math.max(0, math.floor(300 - L.a + 0.5)) .. " m to go" end
			if L.a >= 298 then
				local fast = SCH.t < 300 / (s.lim / 3.6) * 0.8
				return finish(fast and "fail" or "pass", fast and "Impossible time: you must have sped." or ("Reached the marker in " .. string.format("%.0f", SCH.t) .. " s."))
			end
			if SCH.t > 120 then return finish("fail", "Too slow (2 minutes).") end
			return "run"
		end },
	{ id = "light", name = "4. Traffic light", goal = "Approach the junction. Stop before the line on red or amber; go on green. Cross the junction.", len = 130, lit = true,
		setup = function(s)
			s.stop = s.len - RULES.stopLine
			put(MK.line, s, s.stop, s.lane, 4, 0.6)
		end,
		tick = function(dt, s, L)
			local l = Signals.at(s.nd, s.e)
			SCH.msg = (l == "g" and "🟢 Green: go" or l == "y" and "🟡 Amber: stop if you safely can" or "🔴 Red: stop before the line") .. " · "
				.. math.max(0, math.floor(s.stop - L.a + 0.5)) .. " m to the line"
			if s.ranRed then return finish("fail", "You ran the red light.") end
			if L.a > s.stop and not s.cross then s.cross, s.cst = true, l end
			if l ~= "g" and L.a < s.stop and L.a > s.stop - 6 and kmh() < 1 then s.waited = true end
			if L.a > s.len + 25 then return finish("pass", s.waited and "Waited for green, then crossed." or ("Crossed on " .. (s.cst == "g" and "green" or "amber") .. ".")) end
			if SCH.t > 150 then return finish("fail", "Too slow.") end
			return "run"
		end },
	{ id = "park", name = "5. Reverse parking", goal = "Reverse (S) into the green bay behind you and stop straight inside it.", len = 60, start = 34,
		setup = function(s) s.zc = put(MK.zone, s, 22, s.lane + 0.2, 2.8, 6) end,
		tick = function(dt, s, L)
			if fwd() > 2 and SCH.t > 2 then SCH.msg = "Reverse: hold S (brake, then backwards)." end
			if L.a < 10 then return finish("fail", "You reversed past the bay.") end
			if kmh() < 0.4 and SCH.t > 3 and L.a < 30 then
				local da, dl = math.abs(L.a - 22), math.abs(L.l - (s.lane + 0.2))
				local dh = math.abs(math.atan2(math.sin(st.h - s.h), math.cos(st.h - s.h))) * 57.3
				if da <= 2 and dl <= 0.9 and dh <= 12 then
					pen("Off-centre " .. string.format("%.1f", math.sqrt(da * da + dl * dl)) .. " m, angle " .. string.format("%.0f", dh) .. "°", math.floor(da * 6 + dl * 12 + dh + 0.5), "pos", 99)
					return finish("pass", "Parked.")
				end
				if SCH.t > 6 then SCH.msg = "Not inside yet (" .. (dh > 12 and "straighten up" or da > 2 and (L.a > 22 and "further back" or "too far back") or "line up sideways") .. ")." end
			end
			if SCH.t > 90 then return finish("fail", "Out of time (90 s).") end
			return "run"
		end },
}
School.LESSONS = LESSONS

-- ---- the instructor panel (top centre) ----
local panel = Hud.label(Hud.gui, UDim2.new(0.5, 0, 0, 170), UDim2.fromOffset(560, 64), Vector2.new(0.5, 0), "", 15)
panel.Name = "SchoolPanel"
panel.TextWrapped = true
panel.BackgroundTransparency = 0.15
panel.BackgroundColor3 = Color3.fromHex("#0d2a1c")
panel.TextColor3 = Color3.fromHex("#eafff2")
panel.Visible = false
School.panel = panel

function School.stop(silent)
	SCH.on, SCH.site = nil, nil
	hideAll()
	panel.Visible = false
	if not silent and Hud.isOpen("Driving school result") then Hud.closePanel() end
end

function School.start(i)
	local L = LESSONS[i]
	if not L then return false end
	local s = School.find(0, 0, L.len, L.lit == true)
	if not s then
		Hud.toast("No suitable street found for this lesson")
		return false
	end
	School.stop(true)
	AutoDrive.off()
	if Gps.route() then Gps.clear() end
	SCH.on, SCH.site, SCH.t, SCH.pen, SCH.score, SCH.over, SCH.st, SCH.msg, SCH.last = L, s, 0, {}, 100, false, "run", "", {}
	L.setup(s)
	local a0 = L.start or (L.lit and 0 or 5)
	Drive.place(s.x0 + s.ux * a0 + s.rx * s.lane, s.z0 + s.uz * a0 + s.rz * s.lane, s.h)
	Traffic.clear(st.x, st.z, L.len + 80)
	Hud.closePanel()
	panel.Visible = true
	Hud.toast("Driving school: " .. L.name)
	return true
end

-- the result card: score, message, penalties, best, Retry / Next / Close
function School.result()
	local L = SCH.on
	if not L then return end
	local ok = SCH.st == "pass"
	local ix = table.find(LESSONS, L)
	panel.Visible = false
	local p = Hud.panel("Driving school result", 440, 380)
	p.sub.Text = (ok and "✅ Passed" or "❌ Not passed") .. " · " .. L.name .. " · " .. SCH.score .. "/100"
	local function text(t, order, color)
		local l = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(410, 36), Vector2.new(0, 0), t, 15)
		l.TextWrapped = true
		l.TextXAlignment = Enum.TextXAlignment.Left
		l.LayoutOrder = order
		if color then l.TextColor3 = color end
		return l
	end
	text(SCH.msg, 1)
	local lines = {}
	for _, q in ipairs(SCH.pen) do lines[#lines + 1] = "• " .. q[1] .. (q[2] > 0 and (" (−" .. q[2] .. ")") or "") end
	text(#lines > 0 and table.concat(lines, "\n") or "No mistakes.", 2, Color3.fromRGB(190, 190, 190)).Size = UDim2.fromOffset(410, math.max(36, 18 * #lines))
	text("Best: " .. (SCH.best[L.id] and (SCH.best[L.id] .. "/100") or "—"), 3, Color3.fromRGB(150, 200, 220))
	local r = Hud.button(p.list, "↻ Retry", function() School.start(ix) end, 410, 32)
	r.Name, r.LayoutOrder = "Retry", 4
	if ix < #LESSONS then
		local n = Hud.button(p.list, "Next ▶", function() School.start(ix + 1) end, 410, 32)
		n.Name, n.LayoutOrder = "Next", 5
	end
	local c = Hud.button(p.list, "Close", function() School.stop() end, 410, 32)
	c.Name, c.LayoutOrder = "Close", 6
end

-- the lesson list (from the settings menu)
function School.menu()
	local p = Hud.panel("Driving school", 420, 360)
	p.sub.Text = "Five lessons on real streets near the start · " .. SCH.runs .. " runs so far"
	for i, L in ipairs(LESSONS) do
		local b = Hud.button(p.list, L.name .. (SCH.best[L.id] and (" · best " .. SCH.best[L.id]) or ""), function() School.start(i) end, 390, 34)
		b.Name, b.LayoutOrder = "Lesson_" .. L.id, i
	end
	if SCH.on then
		local q = Hud.button(p.list, "✕ Quit the lesson", function()
			School.stop()
			Hud.closePanel()
		end, 390, 34, Color3.fromRGB(110, 40, 40))
		q.Name, q.LayoutOrder = "Quit", 9
	end
end

-- a fine was given (Laws.onFine): the instructor's penalties, a red light ends lesson 4
function School.onFine(k)
	if not SCH.on or SCH.over then return end
	if k == "hit" then
		pen("Hit another car", 30, "hit", 2)
	elseif k == "way" then
		pen("Wrong way", 20, "way", 3)
	elseif k == "red" and SCH.site then
		SCH.site.ranRed = true
	end
end

function School.step(dt)
	if not SCH.on or SCH.over then return end
	SCH.t += dt
	SCH.msg = ""
	local s = SCH.site
	local L = loc(s)
	if math.abs(L.l) > 12 and SCH.t > 2 and L.a > -5 and L.a < s.len then
		finish("fail", "You left the street.")
		return
	end
	SCH.on.tick(dt, s, L)
	if not SCH.over then
		panel.Text = "🎓 " .. SCH.on.name .. " · " .. SCH.score .. " pts · " .. string.format("%.0f", SCH.t) .. " s\n" .. SCH.on.goal .. (SCH.msg ~= "" and ("\n" .. SCH.msg) or "")
	end
end

return School
