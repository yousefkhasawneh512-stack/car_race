-- A small stand-in for the Roblox engine, so the Irbid Drive place can run headless under the Luau CLI (luau.exe) for tests.
-- It is NOT Roblox: no physics, no rendering, no networking (server and client share one world), no layout. It implements the API the
-- game's scripts use: instances with properties / children / attributes / signals, Vector3, CFrame, Color3, UDim2, Enum tokens, task
-- scheduling on a simulated clock, services, remotes (client and server in one process), an in-memory DataStore, and ray tests
-- against boxes (parts and terrain blocks) through a spatial grid.
local M = { errors = {}, now = 0, frame = 0, move = nil, logs = {} }
local GENV = getfenv(1)
local realos = os
local unpack = table.unpack

-- ================= scheduler =================
local queue = {}
local function report(co, err)
	local msg = tostring(err) .. "\n" .. debug.traceback(co)
	table.insert(M.errors, msg)
	print("SCRIPT ERROR: " .. msg)
end
local function resume(co, ...)
	local ok, err = coroutine.resume(co, ...)
	if not ok then report(co, err) end
end
M.resume = resume
local task_ = {}
function task_.wait(t)
	local co = coroutine.running()
	local wake = M.now + math.max(t or 0, 1 / 120)
	table.insert(queue, { co = co, wake = wake, start = M.now })
	coroutine.yield()
	return M.now - wake
end
function task_.spawn(f, ...)
	local co = type(f) == "thread" and f or coroutine.create(f)
	resume(co, ...)
	return co
end
function task_.defer(f, ...)
	local co = coroutine.create(f)
	local args = table.pack(...)
	table.insert(queue, { co = co, wake = M.now, args = args })
	return co
end
function task_.delay(t, f, ...)
	local co = coroutine.create(f)
	local args = table.pack(...)
	table.insert(queue, { co = co, wake = M.now + (t or 0), args = args })
	return co
end
task = task_
local function wakeReady()
	local ready = {}
	for i = #queue, 1, -1 do
		if queue[i].wake <= M.now + 1e-9 then
			table.insert(ready, queue[i])
			table.remove(queue, i)
		end
	end
	table.sort(ready, function(a, b) return a.wake < b.wake end)
	for _, q in ipairs(ready) do
		if coroutine.status(q.co) == "suspended" then
			if q.args then resume(q.co, unpack(q.args, 1, q.args.n)) else resume(q.co) end
		end
	end
end
os = setmetatable({ clock = function() return M.now end, time = function() return 1700000000 + math.floor(M.now) end }, { __index = realos })

-- ================= signals =================
local Signal = {}
Signal.__index = Signal
local function newSignal()
	return setmetatable({ conns = {} }, Signal)
end
function Signal:Connect(f)
	local c = { f = f, Connected = true }
	function c.Disconnect() c.Connected = false end
	table.insert(self.conns, c)
	return c
end
Signal.connect = Signal.Connect
function Signal:Once(f)
	local c
	c = self:Connect(function(...)
		c.Connected = false
		f(...)
	end)
	return c
end
function Signal:Fire(...)
	for _, c in ipairs(table.clone(self.conns)) do
		if c.Connected then task_.spawn(c.f, ...) end
	end
end
function Signal:Wait()
	local co = coroutine.running()
	local res
	local c
	c = self:Connect(function(...)
		c.Connected = false
		res = table.pack(...)
	end)
	while not res do task_.wait() end
	return unpack(res, 1, res.n)
end

-- ================= value types =================
local V3 = {}
local V3m = {}
local function v3(x, y, z)
	return setmetatable({ x = x or 0, y = y or 0, z = z or 0 }, V3)
end
V3.__index = function(v, k)
	if k == "X" then return v.x elseif k == "Y" then return v.y elseif k == "Z" then return v.z
	elseif k == "Magnitude" then return math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
	elseif k == "Unit" then
		local m = math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
		if m == 0 then return v3(0 / 0, 0 / 0, 0 / 0) end
		return v3(v.x / m, v.y / m, v.z / m)
	end
	return V3m[k]
end
V3.__add = function(a, b) return v3(a.x + b.x, a.y + b.y, a.z + b.z) end
V3.__sub = function(a, b) return v3(a.x - b.x, a.y - b.y, a.z - b.z) end
V3.__mul = function(a, b)
	if type(a) == "number" then return v3(a * b.x, a * b.y, a * b.z) end
	if type(b) == "number" then return v3(a.x * b, a.y * b, a.z * b) end
	return v3(a.x * b.x, a.y * b.y, a.z * b.z)
end
V3.__div = function(a, b)
	if type(b) == "number" then return v3(a.x / b, a.y / b, a.z / b) end
	return v3(a.x / b.x, a.y / b.y, a.z / b.z)
end
V3.__unm = function(a) return v3(-a.x, -a.y, -a.z) end
V3.__eq = function(a, b) return a.x == b.x and a.y == b.y and a.z == b.z end
V3.__tostring = function(a) return string.format("%g, %g, %g", a.x, a.y, a.z) end
function V3m.Cross(a, b) return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x) end
function V3m.Dot(a, b) return a.x * b.x + a.y * b.y + a.z * b.z end
function V3m.Lerp(a, b, t) return v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t) end
function V3m.Abs(a) return v3(math.abs(a.x), math.abs(a.y), math.abs(a.z)) end
Vector3 = { new = v3, zero = v3(0, 0, 0), one = v3(1, 1, 1), xAxis = v3(1, 0, 0), yAxis = v3(0, 1, 0), zAxis = v3(0, 0, 1) }
M.isV3 = function(v) return getmetatable(v) == V3 end

-- CFrame: position p and rotation matrix r (row-major 3x3); columns are Right, Up, Back
local CF = {}
local CFm = {}
local function cf(p, r)
	return setmetatable({ p = p, r = r }, CF)
end
local I3 = { 1, 0, 0, 0, 1, 0, 0, 0, 1 }
local function mulR(a, b)
	local r = {}
	for i = 0, 2 do
		for j = 0, 2 do
			r[i * 3 + j + 1] = a[i * 3 + 1] * b[j + 1] + a[i * 3 + 2] * b[3 + j + 1] + a[i * 3 + 3] * b[6 + j + 1]
		end
	end
	return r
end
local function mulRv(r, v)
	return v3(r[1] * v.x + r[2] * v.y + r[3] * v.z, r[4] * v.x + r[5] * v.y + r[6] * v.z, r[7] * v.x + r[8] * v.y + r[9] * v.z)
end
local function transpose(r)
	return { r[1], r[4], r[7], r[2], r[5], r[8], r[3], r[6], r[9] }
end
local function fromCols(p, X, Y, Z)
	return cf(p, { X.x, Y.x, Z.x, X.y, Y.y, Z.y, X.z, Y.z, Z.z })
end
CF.__index = function(c, k)
	if k == "Position" or k == "p" then return c.p
	elseif k == "X" then return c.p.x elseif k == "Y" then return c.p.y elseif k == "Z" then return c.p.z
	elseif k == "RightVector" then return v3(c.r[1], c.r[4], c.r[7])
	elseif k == "UpVector" then return v3(c.r[2], c.r[5], c.r[8])
	elseif k == "LookVector" then return v3(-c.r[3], -c.r[6], -c.r[9])
	elseif k == "Rotation" then return cf(v3(), c.r)
	end
	return CFm[k]
end
-- Roblox keeps rotations orthonormal; without this, rounding errors grow every time a CFrame is multiplied by its own inverse
local function ortho(r)
	local x1, x2, x3 = r[1], r[4], r[7]
	local l = math.sqrt(x1 * x1 + x2 * x2 + x3 * x3)
	x1, x2, x3 = x1 / l, x2 / l, x3 / l
	local y1, y2, y3 = r[2], r[5], r[8]
	local d = x1 * y1 + x2 * y2 + x3 * y3
	y1, y2, y3 = y1 - d * x1, y2 - d * x2, y3 - d * x3
	l = math.sqrt(y1 * y1 + y2 * y2 + y3 * y3)
	y1, y2, y3 = y1 / l, y2 / l, y3 / l
	local z1, z2, z3 = x2 * y3 - x3 * y2, x3 * y1 - x1 * y3, x1 * y2 - x2 * y1
	return { x1, y1, z1, x2, y2, z2, x3, y3, z3 }
end
CF.__mul = function(a, b)
	if getmetatable(b) == V3 then return mulRv(a.r, b) + a.p end
	return cf(mulRv(a.r, b.p) + a.p, ortho(mulR(a.r, b.r)))
end
CF.__add = function(a, b) return cf(a.p + b, a.r) end
CF.__sub = function(a, b) return cf(a.p - b, a.r) end
function CFm.Inverse(c)
	local t = transpose(c.r)
	return cf(-mulRv(t, c.p), t)
end
function CFm.PointToObjectSpace(c, v) return mulRv(transpose(c.r), v - c.p) end
function CFm.PointToWorldSpace(c, v) return mulRv(c.r, v) + c.p end
function CFm.VectorToObjectSpace(c, v) return mulRv(transpose(c.r), v) end
function CFm.VectorToWorldSpace(c, v) return mulRv(c.r, v) end
function CFm.Lerp(a, b, t) return cf(a.p:Lerp(b.p, t), t < 0.5 and a.r or b.r) end
local function rotX(a) local c, s = math.cos(a), math.sin(a) return { 1, 0, 0, 0, c, -s, 0, s, c } end
local function rotY(a) local c, s = math.cos(a), math.sin(a) return { c, 0, s, 0, 1, 0, -s, 0, c } end
local function rotZ(a) local c, s = math.cos(a), math.sin(a) return { c, -s, 0, s, c, 0, 0, 0, 1 } end
CFrame = {}
function CFrame.new(a, b, c)
	if a == nil then return cf(v3(), I3) end
	if type(a) == "number" then return cf(v3(a, b, c), I3) end
	if b ~= nil then return CFrame.lookAt(a, b) end
	return cf(a, I3)
end
function CFrame.lookAt(at, target, up)
	up = up or Vector3.yAxis
	local look = (target - at).Unit
	local right = look:Cross(up)
	if right.Magnitude < 1e-6 then right = Vector3.xAxis else right = right.Unit end
	local up2 = right:Cross(look)
	return fromCols(at, right, up2, -look)
end
function CFrame.fromMatrix(p, X, Y, Z)
	Z = Z or X:Cross(Y).Unit
	local c = fromCols(p, X, Y, Z)
	c.r = ortho(c.r)
	return c
end
function CFrame.Angles(x, y, z)
	return cf(v3(), mulR(mulR(rotX(x), rotY(y)), rotZ(z)))
end
CFrame.fromEulerAnglesXYZ = CFrame.Angles
CFrame.identity = cf(v3(), I3)

Color3 = {}
local C3 = { __tostring = function(c) return string.format("C3(%g,%g,%g)", c.R, c.G, c.B) end }
function Color3.new(r, g, b) return setmetatable({ R = r or 0, G = g or 0, B = b or 0 }, C3) end
function Color3.fromRGB(r, g, b) return Color3.new((r or 0) / 255, (g or 0) / 255, (b or 0) / 255) end
UDim = { new = function(s, o) return { Scale = s or 0, Offset = o or 0 } end }
UDim2 = {}
function UDim2.new(xs, xo, ys, yo) return { X = UDim.new(xs, xo), Y = UDim.new(ys, yo) } end
function UDim2.fromOffset(x, y) return UDim2.new(0, x, 0, y) end
function UDim2.fromScale(x, y) return UDim2.new(x, 0, y, 0) end
Vector2 = { new = function(x, y) return { X = x or 0, Y = y or 0 } end }
Vector2.zero = Vector2.new(0, 0)
local enumCache = {}
Enum = setmetatable({}, { __index = function(_, cat)
	enumCache[cat] = enumCache[cat] or setmetatable({}, { __index = function(t, item)
		local tok = setmetatable({ Name = item, EnumType = cat }, { __tostring = function() return "Enum." .. cat .. "." .. item end })
		rawset(t, item, tok)
		return tok
	end })
	return enumCache[cat]
end })
RaycastParams = { new = function() return { FilterType = Enum.RaycastFilterType.Exclude, FilterDescendantsInstances = {} } end }

-- ================= instances =================
local Inst = {}
local METHODS, GET, SET = {}, {}, {}
local BASEPART = { Part = true, Seat = true, SpawnLocation = true, MeshPart = true, WedgePart = true, VehicleSeat = true }
local GUIOBJ = { Frame = true, TextLabel = true, TextButton = true, TextBox = true, ScrollingFrame = true, ImageLabel = true, ImageButton = true, CanvasGroup = true }
local SUPER = {
	BasePart = BASEPART, GuiObject = GUIOBJ, GuiButton = { TextButton = true, ImageButton = true },
	LuaSourceContainer = { Script = true, LocalScript = true, ModuleScript = true }, BaseScript = { Script = true, LocalScript = true },
	ValueBase = { IntValue = true, NumberValue = true, StringValue = true, BoolValue = true },
	Light = { SpotLight = true, PointLight = true, SurfaceLight = true }, Constraint = { WeldConstraint = true },
	LayerCollector = { ScreenGui = true, BillboardGui = true }, GuiBase2d = GUIOBJ,
}
local EVENTS = { ChildAdded = true, ChildRemoved = true, Changed = true, Activated = true, MouseButton1Click = true, FocusLost = true,
	CharacterAdded = true, CharacterRemoving = true, Died = true, OnServerEvent = true, OnClientEvent = true, PlayerAdded = true,
	PlayerRemoving = true, RenderStepped = true, Heartbeat = true, Stepped = true, InputBegan = true, InputEnded = true,
	PromptGamePassPurchaseFinished = true, PromptProductPurchaseFinished = true, Touched = true, AncestryChanged = true, DescendantAdded = true }
local DEFAULTS = {
	Transparency = 0, Anchored = false, CanCollide = true, CanQuery = true, CanTouch = true, Massless = false, Visible = true,
	Size = function(o) return BASEPART[o.ClassName] and v3(4, 1, 2) or UDim2.new() end,
	CFrame = function() return CFrame.new() end, AssemblyLinearVelocity = function() return v3() end,
	AssemblyAngularVelocity = function() return v3() end, Text = "", Value = 0, Enabled = true, Sit = false, Health = 100,
	JumpPower = 50, ClockTime = 14, Gravity = 196.2, Rotation = 0, TextSize = 14, ZIndex = 1,
}
local function isA(o, cls)
	local c = rawget(o, "__p").ClassName
	if c == cls or cls == "Instance" then return true end
	local s = SUPER[cls]
	return s ~= nil and s[c] == true
end

-- ---- spatial grid for ray tests (xz cells of 64 studs) ----
local CELL = 64
local grid = {}
local function aabb(c, s)
	local r = c.r
	local hx, hy, hz = s.x / 2, s.y / 2, s.z / 2
	local ex = math.abs(r[1]) * hx + math.abs(r[2]) * hy + math.abs(r[3]) * hz
	local ez = math.abs(r[7]) * hx + math.abs(r[8]) * hy + math.abs(r[9]) * hz
	return c.p.x - ex, c.p.x + ex, c.p.z - ez, c.p.z + ez
end
local function gridKey(i, j) return i * 100003 + j end
local function unregister(o)
	local cells = rawget(o, "__cells")
	if not cells then return end
	for _, k in ipairs(cells) do
		local L = grid[k]
		if L then
			for n = #L, 1, -1 do
				if L[n] == o then
					L[n] = L[#L]
					L[#L] = nil
					break
				end
			end
		end
	end
	rawset(o, "__cells", nil)
end
local function register(o)
	unregister(o)
	local p = rawget(o, "__p")
	local c, s = p.CFrame or CFrame.new(), p.Size or v3(4, 1, 2)
	local x0, x1, z0, z1 = aabb(c, s)
	local cells = {}
	for i = math.floor(x0 / CELL), math.floor(x1 / CELL) do
		for j = math.floor(z0 / CELL), math.floor(z1 / CELL) do
			local k = gridKey(i, j)
			local L = grid[k]
			if not L then
				L = {}
				grid[k] = L
			end
			L[#L + 1] = o
			cells[#cells + 1] = k
		end
	end
	rawset(o, "__cells", cells)
end
local WS -- the Workspace instance
local function inWorkspace(o)
	local q = o
	while q do
		if q == WS then return true end
		q = rawget(q, "__parent")
	end
	return false
end
local function maybeRegister(o)
	local p = rawget(o, "__p")
	if BASEPART[p.ClassName] and p.CanQuery ~= false and inWorkspace(o) then register(o) else unregister(o) end
end

local function newInstance(cls)
	local o = setmetatable({ __p = { ClassName = cls, Name = cls }, __c = {}, __parent = nil, __attrs = {}, __as = {}, __ps = {}, __ev = {} }, Inst)
	return o
end
Inst.__index = function(o, k)
	-- Humanoid.Sit is a property, Seat:Sit() a method
	if k == "Sit" and rawget(o, "__p").ClassName == "Humanoid" then return rawget(o, "__p").Sit == true end
	local m = METHODS[k]
	if m then return m end
	if EVENTS[k] then
		local ev = rawget(o, "__ev")
		local s = ev[k]
		if not s then
			s = newSignal()
			ev[k] = s
		end
		return s
	end
	local p = rawget(o, "__p")
	local v = p[k]
	if v ~= nil then return v end
	local g = GET[k]
	if g then
		local r = g(o)
		if r ~= nil then return r end
	end
	for _, ch in ipairs(rawget(o, "__c")) do
		if rawget(ch, "__p").Name == k then return ch end
	end
	local d = DEFAULTS[k]
	if type(d) == "function" then
		d = d(o)
		p[k] = d
	end
	return d
end
local function setParent(o, np)
	local op = rawget(o, "__parent")
	if op == np then return end
	if rawget(o, "__destroyed") then error("The Parent property of " .. o.Name .. " is locked", 3) end
	if op then
		local L = rawget(op, "__c")
		for i = #L, 1, -1 do
			if L[i] == o then
				table.remove(L, i)
				break
			end
		end
	end
	rawset(o, "__parent", np)
	if np then table.insert(rawget(np, "__c"), o) end
	-- (un)register every part of the moved tree for ray tests
	local function walk(x)
		if BASEPART[rawget(x, "__p").ClassName] then maybeRegister(x) end
		for _, ch in ipairs(rawget(x, "__c")) do walk(ch) end
	end
	walk(o)
	if op and rawget(op, "__ev").ChildRemoved then op.ChildRemoved:Fire(o) end
	if np and rawget(np, "__ev").ChildAdded then np.ChildAdded:Fire(o) end
end
Inst.__newindex = function(o, k, v)
	if k == "Parent" then
		setParent(o, v)
		return
	end
	local s = SET[k]
	if s then
		s(o, v)
	else
		rawget(o, "__p")[k] = v
	end
	local sig = rawget(o, "__ps")[k]
	if sig then sig:Fire() end
end
Inst.__tostring = function(o) return o.Name end
GET.Parent = function(o) return rawget(o, "__parent") end
GET.Position = function(o)
	local c = rawget(o, "__p").CFrame
	if c then return c.p end
	if BASEPART[o.ClassName] then return v3() end
	return nil
end
GET.AssemblyMass = function(o)
	local s = o.Size
	return s.x * s.y * s.z * 0.7
end
GET.DistributedGameTime = function() return M.now end
SET.Position = function(o, v)
	local p = rawget(o, "__p")
	if not BASEPART[p.ClassName] then
		p.Position = v
		return
	end
	local c = p.CFrame or CFrame.new()
	p.CFrame = cf(v, c.r)
	if rawget(o, "__cells") or BASEPART[p.ClassName] then maybeRegister(o) end
end
SET.CFrame = function(o, v)
	local p = rawget(o, "__p")
	p.CFrame = v
	if rawget(o, "__cells") then register(o) end
end
SET.Size = function(o, v)
	local p = rawget(o, "__p")
	p.Size = v
	if rawget(o, "__cells") then register(o) end
end
SET.CanQuery = function(o, v)
	rawget(o, "__p").CanQuery = v
	if BASEPART[o.ClassName] then maybeRegister(o) end
end
SET.Text = function(o, v)
	rawget(o, "__p").Text = tostring(v)
end

function METHODS.IsA(o, cls) return isA(o, cls) end
function METHODS.GetChildren(o) return table.clone(rawget(o, "__c")) end
function METHODS.GetDescendants(o)
	local out = {}
	local function walk(x)
		for _, ch in ipairs(rawget(x, "__c")) do
			out[#out + 1] = ch
			walk(ch)
		end
	end
	walk(o)
	return out
end
function METHODS.FindFirstChild(o, name, recursive)
	for _, ch in ipairs(rawget(o, "__c")) do
		if rawget(ch, "__p").Name == name then return ch end
	end
	if recursive then
		for _, ch in ipairs(rawget(o, "__c")) do
			local r = ch:FindFirstChild(name, true)
			if r then return r end
		end
	end
	return nil
end
function METHODS.FindFirstChildOfClass(o, cls)
	for _, ch in ipairs(rawget(o, "__c")) do
		if rawget(ch, "__p").ClassName == cls then return ch end
	end
	return nil
end
function METHODS.FindFirstChildWhichIsA(o, cls)
	for _, ch in ipairs(rawget(o, "__c")) do
		if isA(ch, cls) then return ch end
	end
	return nil
end
function METHODS.FindFirstAncestor(o, name)
	local q = rawget(o, "__parent")
	while q do
		if q.Name == name then return q end
		q = rawget(q, "__parent")
	end
	return nil
end
function METHODS.IsDescendantOf(o, a)
	local q = rawget(o, "__parent")
	while q do
		if q == a then return true end
		q = rawget(q, "__parent")
	end
	return false
end
function METHODS.WaitForChild(o, name, timeout)
	local t0 = M.now
	while true do
		local c = o:FindFirstChild(name)
		if c then return c end
		if M.now - t0 > (timeout or 30) then
			if not timeout then table.insert(M.logs, "Infinite yield possible on " .. o:GetFullName() .. ":WaitForChild(\"" .. name .. "\")") end
			if timeout then return nil end
		end
		task_.wait()
	end
end
function METHODS.GetFullName(o)
	local n = o.Name
	local q = rawget(o, "__parent")
	while q and q.ClassName ~= "DataModel" do
		n = q.Name .. "." .. n
		q = rawget(q, "__parent")
	end
	return n
end
function METHODS.Destroy(o)
	if rawget(o, "__destroyed") then return end
	for _, ch in ipairs(table.clone(rawget(o, "__c"))) do ch:Destroy() end
	setParent(o, nil)
	unregister(o)
	rawset(o, "__destroyed", true)
end
function METHODS.ClearAllChildren(o)
	for _, ch in ipairs(table.clone(rawget(o, "__c"))) do ch:Destroy() end
end
function METHODS.Clone(o)
	local c = newInstance(o.ClassName)
	for k, v in pairs(rawget(o, "__p")) do rawget(c, "__p")[k] = v end
	for k, v in pairs(rawget(o, "__attrs")) do rawget(c, "__attrs")[k] = v end
	rawset(c, "__src", rawget(o, "__src"))
	rawset(c, "__mockModule", rawget(o, "__mockModule"))
	for _, ch in ipairs(rawget(o, "__c")) do ch:Clone().Parent = c end
	return c
end
function METHODS.GetAttribute(o, k) return rawget(o, "__attrs")[k] end
function METHODS.GetAttributes(o) return table.clone(rawget(o, "__attrs")) end
function METHODS.SetAttribute(o, k, v)
	local a = rawget(o, "__attrs")
	if a[k] == v then return end
	a[k] = v
	local s = rawget(o, "__as")[k]
	if s then s:Fire() end
end
function METHODS.GetAttributeChangedSignal(o, k)
	local as = rawget(o, "__as")
	as[k] = as[k] or newSignal()
	return as[k]
end
function METHODS.GetPropertyChangedSignal(o, k)
	local ps = rawget(o, "__ps")
	ps[k] = ps[k] or newSignal()
	return ps[k]
end
-- Model
function METHODS.GetPivot(o)
	if o.ClassName == "Model" then
		local pp = rawget(o, "__p").PrimaryPart
		if pp then return pp.CFrame end
		for _, d in ipairs(o:GetDescendants()) do
			if BASEPART[d.ClassName] then return d.CFrame end
		end
		return CFrame.new()
	end
	return o.CFrame
end
function METHODS.PivotTo(o, c)
	if o.ClassName ~= "Model" then
		o.CFrame = c
		return
	end
	local pivot = o:GetPivot()
	local inv = pivot:Inverse()
	local pp = rawget(o, "__p").PrimaryPart
	for _, d in ipairs(o:GetDescendants()) do
		if BASEPART[d.ClassName] then
			if d == pp then d.CFrame = c else d.CFrame = c * (inv * d.CFrame) end
		end
	end
	M.pivots = (M.pivots or 0) + 1
end
-- parts
function METHODS.SetNetworkOwner() end
function METHODS.GetNetworkOwner() return nil end
function METHODS.Sit(seat, hum)
	hum.Sit = true
	hum.SeatPart = seat
end
function METHODS.SetStateEnabled() end
function METHODS.ChangeState() end
function METHODS.Play() end
function METHODS.Stop() end
-- remotes (client and server in one process; the player is always M.player)
function METHODS.FireServer(o, ...) o.OnServerEvent:Fire(M.player, ...) end
function METHODS.FireClient(o, _, ...) o.OnClientEvent:Fire(...) end
function METHODS.FireAllClients(o, ...) o.OnClientEvent:Fire(...) end
function METHODS.InvokeServer(o, ...)
	local f = rawget(o, "__p").OnServerInvoke
	if not f then error("OnServerInvoke is not set on " .. o.Name) end
	return f(M.player, ...)
end
-- terrain
M.terrainBlocks = 0
function METHODS.FillBlock(o, c, size)
	local b = newInstance("TerrainBlock")
	rawget(b, "__p").CFrame = c
	rawget(b, "__p").Size = size
	rawset(b, "__terrain", o)
	register(b)
	M.terrainBlocks += 1
end
-- players
function METHODS.GetPlayers(o)
	local out = {}
	for _, ch in ipairs(rawget(o, "__c")) do
		if ch.ClassName == "Player" then out[#out + 1] = ch end
	end
	return out
end
function METHODS.GetPlayerByUserId(o, id)
	for _, p in ipairs(o:GetPlayers()) do
		if p.UserId == id then return p end
	end
	return nil
end
function METHODS.LoadCharacter(plr)
	local old = rawget(plr, "__p").Character
	if old then old:Destroy() end
	local m = newInstance("Model")
	m.Name = plr.Name
	local hum = newInstance("Humanoid")
	hum.Parent = m
	local root = newInstance("Part")
	root.Name = "HumanoidRootPart"
	root.Size = v3(2, 2, 1)
	root.CFrame = CFrame.new(0, 10, 0)
	root.Parent = m
	local head = newInstance("Part")
	head.Name = "Head"
	head.Size = v3(2, 1, 1)
	head.CFrame = CFrame.new(0, 11.5, 0)
	head.Parent = m
	m.PrimaryPart = root
	plr.Character = m
	m.Parent = WS
	plr.CharacterAdded:Fire(m)
end
function METHODS.Kick(plr, msg) table.insert(M.logs, "KICK " .. tostring(msg)) end
-- services
function METHODS.GetService(o, name)
	local s = o:FindFirstChild(name)
	if s then return s end
	s = newInstance(name)
	s.Name = name
	s.Parent = o
	return s
end
function METHODS.BindToClose(o, f) M.onClose = f end
function METHODS.IsStudio() return true end
function METHODS.IsServer() return true end
function METHODS.IsClient() return true end
M.actions = {}
function METHODS.BindAction(o, name, f, touch, ...)
	M.actions[name] = { f = f, keys = { ... } }
end
function METHODS.UnbindAction(o, name) M.actions[name] = nil end
function METHODS.SetTitle() end
function METHODS.SetPosition() end
function METHODS.SetImage() end
function METHODS.RegisterCollisionGroup() end
function METHODS.CollisionGroupSetCollidable() end
function METHODS.UserOwnsGamePassAsync() return false end
function METHODS.PromptGamePassPurchase(o, plr, id) table.insert(M.logs, "PROMPT pass " .. id) end
function METHODS.PromptProductPurchase(o, plr, id) table.insert(M.logs, "PROMPT product " .. id) end
M.store = {}
function METHODS.GetDataStore(o, name)
	M.store[name] = M.store[name] or {}
	local data = M.store[name]
	local ds = {}
	local function copy(v)
		if type(v) ~= "table" then return v end
		local t = {}
		for k, x in pairs(v) do t[k] = copy(x) end
		return t
	end
	function ds.GetAsync(_, k) return copy(data[k]) end
	function ds.SetAsync(_, k, v) data[k] = copy(v) end
	function ds.UpdateAsync(_, k, f) data[k] = copy(f(copy(data[k]))) end
	return ds
end

-- ---- ray tests ----
local function hitBox(part, o, d)
	local p = rawget(part, "__p")
	local c, s = p.CFrame, p.Size
	local rt = transpose(c.r)
	local lo = mulRv(rt, o - c.p)
	local ld = mulRv(rt, d)
	local h = { s.x / 2, s.y / 2, s.z / 2 }
	local O = { lo.x, lo.y, lo.z }
	local Dd = { ld.x, ld.y, ld.z }
	local tmin, tmax, axis, sign = -math.huge, math.huge, 0, 0
	local inside = true
	for a = 1, 3 do
		if math.abs(O[a]) > h[a] then inside = false end
		if math.abs(Dd[a]) < 1e-12 then
			if math.abs(O[a]) > h[a] then return nil end
		else
			local t1, t2 = (-h[a] - O[a]) / Dd[a], (h[a] - O[a]) / Dd[a]
			local sg = -1
			if t1 > t2 then
				t1, t2 = t2, t1
				sg = 1
			end
			if t1 > tmin then
				tmin, axis, sign = t1, a, sg
			end
			if t2 < tmax then tmax = t2 end
			if tmin > tmax then return nil end
		end
	end
	if inside or tmin < 0 or tmin > 1 then return nil end
	local n = axis == 1 and v3(sign, 0, 0) or axis == 2 and v3(0, sign, 0) or v3(0, 0, sign)
	return tmin, mulRv(c.r, n)
end
local function passes(part, params)
	local inst = rawget(part, "__terrain") or part
	local list = params and params.FilterDescendantsInstances or {}
	local found = false
	for _, f in ipairs(list) do
		if inst == f or inst:IsDescendantOf(f) then
			found = true
			break
		end
	end
	if params and params.FilterType == Enum.RaycastFilterType.Include then return found end
	return not found
end
M.rays = 0
function METHODS.Raycast(ws, o, d, params)
	M.rays += 1
	local x0, x1 = math.min(o.x, o.x + d.x), math.max(o.x, o.x + d.x)
	local z0, z1 = math.min(o.z, o.z + d.z), math.max(o.z, o.z + d.z)
	local best, bn, bp = math.huge, nil, nil
	local seen = {}
	for i = math.floor(x0 / CELL), math.floor(x1 / CELL) do
		for j = math.floor(z0 / CELL), math.floor(z1 / CELL) do
			local L = grid[gridKey(i, j)]
			if L then
				for _, part in ipairs(L) do
					if not seen[part] then
						seen[part] = true
						local t, n = hitBox(part, o, d)
						if t and t < best and (rawget(part, "__terrain") or rawget(part, "__p").CanQuery ~= false) and passes(part, params) then
							best, bn, bp = t, n, part
						end
					end
				end
			end
		end
	end
	if not bp then return nil end
	local inst = rawget(bp, "__terrain") or bp
	return { Instance = inst, Position = o + d * best, Normal = bn, Distance = d.Magnitude * best, Material = Enum.Material.Plastic }
end

-- ================= the data model =================
typeof = function(v)
	local mt = getmetatable(v)
	if mt == Inst then return "Instance" elseif mt == V3 then return "Vector3" elseif mt == CF then return "CFrame" end
	return type(v)
end
Instance = {}
function Instance.new(cls, parent)
	local o = newInstance(cls)
	if parent then o.Parent = parent end
	return o
end
game = newInstance("DataModel")
game.Name = "Game"
WS = game:GetService("Workspace")
workspace = WS
local terrain = newInstance("Terrain")
terrain.Name = "Terrain"
terrain.Parent = WS
local camera = newInstance("Camera")
camera.Name = "Camera"
camera.Parent = WS
rawget(WS, "__p").CurrentCamera = camera
local starterPlayer = game:GetService("StarterPlayer")
local sps = newInstance("StarterPlayerScripts")
sps.Name = "StarterPlayerScripts"
sps.Parent = starterPlayer
M.game, M.workspace = game, WS

-- ================= scripts =================
local modules = {}
local function env(inst)
	return setmetatable({ script = inst }, { __index = GENV, __newindex = GENV })
end
local function compile(inst)
	local src = rawget(inst, "__src")
	local f, err = loadstring(src, "=" .. inst:GetFullName())
	if not f then error("compile error in " .. inst:GetFullName() .. ": " .. tostring(err)) end
	setfenv(f, env(inst))
	return f
end
function require(inst)
	if type(inst) ~= "table" then error("require expects a ModuleScript") end
	local mm = rawget(inst, "__mockModule")
	if mm then return mm end
	local m = modules[inst]
	if m then
		while m.loading do task_.wait() end
		if m.err then error("Requested module experienced an error while loading: " .. inst:GetFullName(), 2) end
		return m.value
	end
	m = { loading = true }
	modules[inst] = m
	local f = compile(inst)
	local ok, v = pcall(f)
	m.loading = false
	if not ok then
		m.err = v
		error(v, 0)
	end
	m.value = v
	return v
end
function M.runScript(inst)
	local f = compile(inst)
	local co = coroutine.create(f)
	resume(co)
	return co
end

-- build an instance tree from the place file (made by the Node test runner): {cls, name, props, src, kids}
function M.build(spec, parent)
	local o
	local svc = spec.cls == "Workspace" or spec.cls == "ReplicatedStorage" or spec.cls == "ServerStorage" or spec.cls == "ServerScriptService" or spec.cls == "StarterPlayer"
	if svc then
		o = game:GetService(spec.cls)
	elseif spec.cls == "StarterPlayerScripts" then
		o = sps
	else
		o = newInstance(spec.cls)
		o.Name = spec.name
	end
	for k, v in pairs(spec.props or {}) do o[k] = v end
	if spec.src then rawset(o, "__src", spec.src) end
	for _, k in ipairs(spec.kids or {}) do M.build(k, o) end
	if parent and not svc and spec.cls ~= "StarterPlayerScripts" then o.Parent = parent end
	return o
end

-- start every server Script
function M.startServer()
	for _, d in ipairs(game:GetService("ServerScriptService"):GetDescendants()) do
		if d.ClassName == "Script" then M.runScript(d) end
	end
end

-- a player joins: PlayerGui, PlayerScripts (PlayerModule + copies of StarterPlayerScripts), PlayerAdded, then the LocalScripts run
function M.addPlayer(userId, name)
	local players = game:GetService("Players")
	local plr = newInstance("Player")
	plr.Name = name or "Tester"
	plr.UserId = userId
	local pg = newInstance("PlayerGui")
	pg.Name = "PlayerGui"
	pg.Parent = plr
	local ps = newInstance("PlayerScripts")
	ps.Name = "PlayerScripts"
	ps.Parent = plr
	local pm = newInstance("ModuleScript")
	pm.Name = "PlayerModule"
	local controls = {}
	function controls.GetMoveVector() return M.move or Vector3.zero end
	function controls.Enable() end
	function controls.Disable() end
	rawset(pm, "__mockModule", { GetControls = function() return controls end })
	pm.Parent = ps
	for _, ch in ipairs(sps:GetChildren()) do ch:Clone().Parent = ps end
	M.player = plr
	rawget(players, "__p").LocalPlayer = plr
	plr.Parent = players
	players.PlayerAdded:Fire(plr)
	for _, d in ipairs(ps:GetDescendants()) do
		if d.ClassName == "LocalScript" then M.runScript(d) end
	end
	return plr
end

function M.removePlayer(plr)
	local players = game:GetService("Players")
	players.PlayerRemoving:Fire(plr)
	wakeReady()
	if plr.Character then plr.Character:Destroy() end
	plr.Parent = nil
end

-- simulated frames at 60 fps; onFrame(frameIndex) runs after each frame's scripts
local DT = 1 / 60
function M.run(seconds, onFrame)
	local rs = game:GetService("RunService")
	local n = math.floor(seconds * 60 + 0.5)
	for f = 1, n do
		M.now += DT
		M.frame += 1
		wakeReady()
		rs.Stepped:Fire(M.now, DT)
		rs.RenderStepped:Fire(DT)
		rs.Heartbeat:Fire(DT)
		if onFrame and onFrame(f) == "stop" then return f end
	end
	return n
end

-- run a function as a script thread (it may yield) and keep the simulation going until it returns
function M.call(f, maxSeconds)
	local done, res = false, nil
	task_.spawn(function()
		res = table.pack(f())
		done = true
	end)
	local t0 = M.now
	while not done and M.now - t0 < (maxSeconds or 30) do M.run(1 / 60) end
	if not done then error("M.call timed out") end
	return unpack(res, 1, res.n)
end

-- press / release a key through ContextActionService bindings and UserInputService.InputBegan
function M.key(code, down)
	for _, a in pairs(M.actions) do
		for _, k in ipairs(a.keys) do
			if k == code then
				task_.spawn(a.f, "action", down and Enum.UserInputState.Begin or Enum.UserInputState.End, { KeyCode = code })
				return
			end
		end
	end
	if down then game:GetService("UserInputService").InputBegan:Fire({ KeyCode = code, UserInputType = Enum.UserInputType.Keyboard }, false) end
end

-- the module instance of a client module (to inspect its state in tests)
function M.client(name)
	local ps = M.player:FindFirstChild("PlayerScripts")
	local c = ps:FindFirstChild("Client")
	return require(c:FindFirstChild(name))
end

return M
