-- Irbid Drive (Roblox) - the real road graph (OpenStreetMap, exported by tools/make_roblox.js): parsing, a 50 m spatial hash of
-- segments, nearest-road lookups, Dijkstra routing that respects one-way streets (the web game's route()), and polylines along a route.
-- Units: metres, x = east, z = south, y = terrain height. Pure Luau (no Roblox API), so the tests can run it outside Studio.
local Road = {}

local CELL = 50
local function key(i, j)
	return (i + 500) * 1000 + (j + 500)
end

local function nums(s, out)
	for n in string.gmatch(s, "-?%d+") do
		out[#out + 1] = tonumber(n)
	end
	return out
end

-- nodeStr: "x,z,y,..." (decimetres); edgeStrs: list of strings, edges separated by ";" (see tools/make_roblox.js); names: street names
function Road.build(nodeStr, edgeStrs, names)
	local g = { nodes = {}, edges = {}, hash = {}, names = names }
	local v = nums(nodeStr, {})
	for i = 1, #v, 3 do
		local id = #g.nodes + 1
		g.nodes[id] = { id = id, x = v[i] / 10, z = v[i + 1] / 10, y = v[i + 2] / 10, out = {}, deg = 0 }
	end
	for _, s in ipairs(edgeStrs) do
		for row in string.gmatch(s, "[^;]+") do
			local r = nums(row, {})
			local n = r[8]
			local e = { id = #g.edges + 1, a = r[1], b = r[2], ow = r[3] == 1, lim = r[4], name = names[r[5]] or "", kind = r[6], w = r[7] / 10, n = n, x = {}, z = {}, y = {}, cum = {} }
			local c = 0
			for k = 1, n do
				local o = 8 + (k - 1) * 3
				e.x[k], e.z[k], e.y[k] = r[o + 1] / 10, r[o + 2] / 10, r[o + 3] / 10
				if k > 1 then
					c += math.sqrt((e.x[k] - e.x[k - 1]) ^ 2 + (e.z[k] - e.z[k - 1]) ^ 2)
				end
				e.cum[k] = c
			end
			e.len = c
			g.edges[e.id] = e
			local na, nb = g.nodes[e.a], g.nodes[e.b]
			na.deg += 1
			nb.deg += 1
			table.insert(na.out, { e = e, d = 1 })
			if not e.ow then
				table.insert(nb.out, { e = e, d = -1 })
			end
			for k = 1, n - 1 do
				local i0, i1 = math.floor(math.min(e.x[k], e.x[k + 1]) / CELL), math.floor(math.max(e.x[k], e.x[k + 1]) / CELL)
				local j0, j1 = math.floor(math.min(e.z[k], e.z[k + 1]) / CELL), math.floor(math.max(e.z[k], e.z[k + 1]) / CELL)
				for i = i0, i1 do
					for j = j0, j1 do
						local kk = key(i, j)
						local L = g.hash[kk]
						if not L then
							L = {}
							g.hash[kk] = L
						end
						L[#L + 1] = { e, k }
					end
				end
			end
		end
	end
	return g
end

-- every segment within r metres of (x, z): calls fn(edge, k) (k = segment index; may repeat a segment that spans cells)
function Road.each(g, x, z, r, fn)
	local ci, cj, R = math.floor(x / CELL), math.floor(z / CELL), math.ceil(r / CELL)
	for i = ci - R, ci + R do
		for j = cj - R, cj + R do
			local L = g.hash[key(i, j)]
			if L then
				for _, s in ipairs(L) do
					fn(s[1], s[2])
				end
			end
		end
	end
end

-- nearest point on any road within maxd: {e, k, t, x, z, y, d, s (distance along the edge from node a), tx, tz (edge direction)}
function Road.nearest(g, x, z, maxd)
	maxd = maxd or 60
	local best, bd, bk, bt = nil, maxd * maxd, 0, 0
	Road.each(g, x, z, maxd, function(e, k)
		local ax, az = e.x[k], e.z[k]
		local dx, dz = e.x[k + 1] - ax, e.z[k + 1] - az
		local l2 = math.max(dx * dx + dz * dz, 1e-9)
		local t = math.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1)
		local d = (x - ax - dx * t) ^ 2 + (z - az - dz * t) ^ 2
		if d < bd then
			best, bd, bk, bt = e, d, k, t
		end
	end)
	if not best then
		return nil
	end
	local e, k, t = best, bk, bt
	local dx, dz = e.x[k + 1] - e.x[k], e.z[k + 1] - e.z[k]
	local l = math.max(math.sqrt(dx * dx + dz * dz), 1e-6)
	return {
		e = e, k = k, t = t, d = math.sqrt(bd),
		x = e.x[k] + dx * t, z = e.z[k] + dz * t, y = e.y[k] + (e.y[k + 1] - e.y[k]) * t,
		s = e.cum[k] + (e.cum[k + 1] - e.cum[k]) * t, tx = dx / l, tz = dz / l,
	}
end

-- the travel direction on an edge for a heading (fx, fz): 1 = a -> b, -1 = b -> a (one-way edges are always 1)
function Road.dirFor(near, fx, fz)
	if near.e.ow then
		return 1
	end
	return (near.tx * fx + near.tz * fz) >= 0 and 1 or -1
end

-- Dijkstra with a binary heap on junction nodes, one-way edges respected, service roads cost 1.25x (as in the web game)
-- -> list of traversals {e = edge, d = 1 | -1}, {} when from == to, nil when unreachable
function Road.route(g, from, to)
	if from == to then
		return {}
	end
	local D, prev, done, H = { [from] = 0 }, {}, {}, { { 0, from } }
	local function push(k, v)
		H[#H + 1] = { k, v }
		local i = #H
		while i > 1 do
			local p = i // 2
			if H[p][1] <= H[i][1] then
				break
			end
			H[p], H[i] = H[i], H[p]
			i = p
		end
	end
	local function pop()
		local t = H[1]
		local l = table.remove(H)
		if #H > 0 then
			H[1] = l
			local i = 1
			while true do
				local a, b, m = 2 * i, 2 * i + 1, i
				if a <= #H and H[a][1] < H[m][1] then
					m = a
				end
				if b <= #H and H[b][1] < H[m][1] then
					m = b
				end
				if m == i then
					break
				end
				H[m], H[i] = H[i], H[m]
				i = m
			end
		end
		return t
	end
	while #H > 0 do
		local top = pop()
		local du, u = top[1], top[2]
		if not done[u] then
			done[u] = true
			if u == to then
				break
			end
			for _, o in ipairs(g.nodes[u].out) do
				local v = o.d > 0 and o.e.b or o.e.a
				if not done[v] then
					local nd = du + o.e.len * (o.e.kind == 2 and 1.25 or 1)
					if D[v] == nil or nd < D[v] then
						D[v] = nd
						prev[v] = { u = u, o = o }
						push(nd, v)
					end
				end
			end
		end
	end
	if D[to] == nil then
		return nil
	end
	local r = {}
	local v = to
	while v ~= from do
		table.insert(r, 1, prev[v].o)
		v = prev[v].u
	end
	return r
end

-- lane offset to the right of the travel direction (traffic drives on the right in Jordan); same widths as the web game's appendTrav
function Road.lane(e)
	return e.ow and e.w * 0.18 or e.w * 0.25
end

-- a polyline along a list of traversals: {x, z, y, c (distance along), ends (distance at the end of each traversal)}
-- laneFn(e) -> metres to the right (nil = on the centre line)
function Road.path(travs, laneFn)
	local P = { x = {}, z = {}, y = {}, c = {}, ends = {} }
	local c = 0
	for ti, tr in ipairs(travs) do
		local e, d = tr.e, tr.d
		local off = laneFn and laneFn(e) or 0
		local n = e.n
		for q = 1, n do
			local k = d > 0 and q or n + 1 - q
			local k0, k1 = math.max(1, k - 1), math.min(n, k + 1)
			local tx, tz = (e.x[k1] - e.x[k0]) * d, (e.z[k1] - e.z[k0]) * d
			local l = math.max(math.sqrt(tx * tx + tz * tz), 1e-6)
			local px, pz = e.x[k] - tz / l * off, e.z[k] + tx / l * off
			local m = #P.x
			local step = m > 0 and math.sqrt((px - P.x[m]) ^ 2 + (pz - P.z[m]) ^ 2) or 0
			if m == 0 or step > 0.5 then
				c += step
				P.x[m + 1], P.z[m + 1], P.y[m + 1], P.c[m + 1] = px, pz, e.y[k], c
			end
		end
		P.ends[ti] = c
	end
	return P
end

-- decode an exported path string "x,z,y,..." (decimetres) into a polyline like Road.path's
function Road.pathFromString(s)
	local v = nums(s, {})
	local P = { x = {}, z = {}, y = {}, c = {}, ends = {} }
	local c = 0
	for i = 1, #v, 3 do
		local m = #P.x
		local px, pz = v[i] / 10, v[i + 1] / 10
		if m > 0 then
			c += math.sqrt((px - P.x[m]) ^ 2 + (pz - P.z[m]) ^ 2)
		end
		P.x[m + 1], P.z[m + 1], P.y[m + 1], P.c[m + 1] = px, pz, v[i + 2] / 10, c
	end
	P.ends[1] = c
	return P
end

-- position on a polyline at distance s; hint = a point index at or before s (pass the returned index back next frame)
-- -> x, z, y, direction x, direction z, index
function Road.sample(P, s, hint)
	local n = #P.x
	if n == 1 then
		return P.x[1], P.z[1], P.y[1], 0, 1, 1
	end
	local i = math.clamp(hint or 1, 1, n - 1)
	if P.c[i] > s then
		i = 1
	end
	while i < n - 1 and P.c[i + 1] < s do
		i += 1
	end
	local seg = math.max(P.c[i + 1] - P.c[i], 1e-6)
	local t = math.clamp((s - P.c[i]) / seg, 0, 1)
	local dx, dz = P.x[i + 1] - P.x[i], P.z[i + 1] - P.z[i]
	local l = math.max(math.sqrt(dx * dx + dz * dz), 1e-6)
	return P.x[i] + dx * t, P.z[i] + dz * t, P.y[i] + (P.y[i + 1] - P.y[i]) * t, dx / l, dz / l, i
end

-- the point index of a polyline nearest to (x, z), searching from index a to b
function Road.closestIndex(P, x, z, a, b)
	local bi, bd = a, math.huge
	for i = math.max(1, a), math.min(#P.x, b) do
		local d = (P.x[i] - x) ^ 2 + (P.z[i] - z) ^ 2
		if d < bd then
			bi, bd = i, d
		end
	end
	return bi, math.sqrt(bd)
end

-- the nearest point ON a polyline (between points a and b): distance along it, distance from it, segment index
function Road.project(P, x, z, a, b)
	local n = #P.x
	local bs, bd, bj = 0, math.huge, 1
	for j = math.max(1, a), math.min(n - 1, b) do
		local ax, az = P.x[j], P.z[j]
		local dx, dz = P.x[j + 1] - ax, P.z[j + 1] - az
		local l2 = math.max(dx * dx + dz * dz, 1e-9)
		local t = math.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1)
		local d = (x - ax - dx * t) ^ 2 + (z - az - dz * t) ^ 2
		if d < bd then
			bs, bd, bj = P.c[j] + (P.c[j + 1] - P.c[j]) * t, d, j
		end
	end
	if n == 1 then
		return 0, math.sqrt((x - P.x[1]) ^ 2 + (z - P.z[1]) ^ 2), 1
	end
	return bs, math.sqrt(bd), bj
end

-- a safe speed for each point of a polyline (m/s): the web game's curveCap (turn angle over a few points) plus braking room (10 m/s^2)
function Road.speedCaps(P)
	local n, cap = #P.x, {}
	for j = 1, n do
		local v = 120
		if j + 3 <= n then
			local a1 = math.atan2(P.x[j + 1] - P.x[j], P.z[j + 1] - P.z[j])
			local a2 = math.atan2(P.x[j + 3] - P.x[j + 2], P.z[j + 3] - P.z[j + 2])
			local da = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
			v = math.clamp(math.sqrt(224 / math.max(0.02, math.abs(da))), 9, 120)
		end
		cap[j] = v
	end
	for j = n - 1, 1, -1 do
		cap[j] = math.min(cap[j], math.sqrt(cap[j + 1] ^ 2 + 2 * 10 * (P.c[j + 1] - P.c[j])))
	end
	return cap
end

-- the edge's node in the travel direction, and the point index sequence helper for routing from a position
function Road.nodeAhead(near, d)
	return d > 0 and near.e.b or near.e.a
end

-- route from a position (on or near a road, heading fx, fz) to the node nearest (tx, tz); the first traversal is the current edge
-- -> traversals, distance along the first traversal where the position is   (nil when no road or no route)
function Road.routeFrom(g, x, z, fx, fz, tx, tz)
	local near = Road.nearest(g, x, z, 120)
	local dest = Road.nearest(g, tx, tz, 400)
	if not (near and dest) then
		return nil
	end
	local d = Road.dirFor(near, fx, fz)
	local start = Road.nodeAhead(near, d)
	-- the destination node: the end of its edge nearer along the edge
	local de = dest.e
	local goal = (dest.s <= de.len - dest.s) and de.a or de.b
	local r = Road.route(g, start, goal)
	if not r then
		-- try the other end (one-way streets)
		goal = goal == de.a and de.b or de.a
		r = Road.route(g, start, goal)
		if not r then
			return nil
		end
	end
	table.insert(r, 1, { e = near.e, d = d })
	return r, d > 0 and near.s or (near.e.len - near.s)
end

return Road
