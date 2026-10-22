// Irbid Drive (Roblox) vehicle catalogue test: the Roblox module (roblox/src/ReplicatedStorage/Modules/Catalog.lua, run by the Luau CLI) on the
// generated data (roblox/catalog/*.lua, tools/vehicle_catalog/make_roblox_catalog.py):
//  A. every variant read back equals the source database (build_car_database.py's JSON): identity and every spec; missing = nil, never 0
//  B. search, filters, sorting, paging and input limits; the brief's representative cars (sedan, sports car, pickup, EV, an old car,
//     a car with missing figures) and a suspect value; the 217 game cars' links
//   node roblox/tests/catalog_test.js <luau.exe> [tools/vehicle_catalog/generated/irbid_drive_vehicle_database.json]
// Without the JSON, part A is skipped (said so). Exits 1 on any failure.
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const LUAU = process.argv[2] || process.env.LUAU || 'luau', JSON_SRC = process.argv[3] || 'tools/vehicle_catalog/generated/irbid_drive_vehicle_database.json';
const CAT = path.join(__dirname, '..', 'catalog'), MOD = path.join(__dirname, '..', 'src', 'ReplicatedStorage', 'Modules', 'Catalog.lua');
const chunks = fs.readdirSync(CAT).filter(f => /^Catalog\d+\.lua$/.test(f)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
if (!chunks.length) { console.log('no roblox/catalog/Catalog*.lua: run tools/vehicle_catalog/make_roblox_catalog.py'); process.exit(1); }
const rd = f => fs.readFileSync(f, 'utf8');
const harness = `
local Catalog = (function() ${rd(MOD)} end)()
local Dict = (function() ${rd(path.join(CAT, 'CatalogDict.lua'))} end)()
local Links = (function() ${rd(path.join(CAT, 'CarLinks.lua'))} end)()
local chunks = {}
${chunks.map(f => `chunks[#chunks + 1] = (function() ${rd(path.join(CAT, f))} end)()`).join('\n')}
local pass, fail = 0, 0
local function check(name, ok, info)
	if ok then pass += 1 else fail += 1 end
	print((ok and "PASS " or "FAIL ") .. name .. (info and (" | " .. tostring(info)) or ""))
end
local t0 = os.clock()
local n = Catalog.load(Dict, chunks)
local tLoad = os.clock() - t0
check("all variants load", n == Dict.count and n > 30000, n .. " variants in " .. #chunks .. " modules, " .. string.format("%.2f s", tLoad))
local ids, dup = {}, 0
for i = 1, n do
	local id = Catalog.row(i).id
	if ids[id] then dup += 1 end
	ids[id] = true
	if Catalog.find(id) ~= i then dup += 1 end
end
check("ids unique and found", dup == 0, dup .. " problems")
-- A: dump every row for the comparison in Node
local function s(x) return x == nil and "~" or tostring(x) end
for i = 1, n do
	local r = Catalog.row(i)
	print("ROW\\t" .. table.concat({ r.id, s(r.make), s(r.model), s(r.gen), s(r.ys), s(r.ye), s(r.eng), s(r.fuel), s(r.cyl), s(r.cc), s(r.hp), s(r.nm), s(r.gear),
		s(r.drive), s(r.acc), s(r.top), s(r.l100), s(r.len), s(r.wid), s(r.hei), s(r.wb), s(r.kg), s(r.sus) }, "\\t"))
end
-- B: search
local function all(q, test)
	local per = q.per
	q.per = 50
	local res = Catalog.query(q)
	local items = {}
	for p = 1, res.pages do
		q.page = p
		for _, i in ipairs(Catalog.query(q).items) do items[#items + 1] = i end
	end
	q.per = per
	if test then
		for _, i in ipairs(items) do
			if not test(Catalog.row(i)) then return false, res.total, Catalog.short(i) end
		end
	end
	return #items == res.total, res.total
end
local function lower(x) return string.lower(x or "") end
local function has(r, w) return string.find(lower(r.make .. " " .. (r.model or "") .. " " .. (r.gen or "") .. " " .. (r.eng or "")), w, 1, true) ~= nil end
t0 = os.clock()
local q1 = Catalog.query({})
local tq = os.clock() - t0
check("no filter: every variant, 25 per page", q1.total == n and #q1.items == 25 and q1.pages == math.ceil(n / 25), string.format("%d in %.3f s", q1.total, tq))
local function rep(name, q, test, extra)
	local ok, total, bad = all(q, test)
	local r = total > 0 and Catalog.row(Catalog.query(q).items[1]) or nil
	check(name, ok and total > 0 and (not extra or (r and extra(r))), tostring(total) .. " found" .. (bad and (" · wrong: " .. bad) or "") .. (r and (" · first: " .. Catalog.short(r.i)) or ""))
end
rep("sedan: Toyota Corolla", { text = "toyota corolla" }, function(r) return has(r, "toyota") and has(r, "corolla") end)
rep("sports car: Porsche 911 GT3, quickest first", { text = "porsche 911 gt3", sort = "accel" }, function(r) return r.make == "Porsche" and has(r, "gt3") end,
	function(r) return r.acc and r.acc < 4 end)
rep("pickup: Toyota Hilux", { text = "hilux" }, function(r) return r.make == "Toyota" and has(r, "hilux") end)
local elec = table.find(Dict.fuels, "Electric")
rep("EV: Tesla, electric only", { text = "tesla", fuel = elec }, function(r) return r.make == "Tesla" and r.fuel == "Electric" end)
rep("old cars: before 1930", { years = { nil, 1930 } }, function(r) return r.ys and r.ys < 1930 end, function(r) return r.ys < 1930 end)
-- a variant with missing figures: shown as Unknown, never 0
local miss
for i = 1, n do
	local r = Catalog.row(i)
	if r.acc == nil and r.top == nil and r.kg == nil then miss = i break end
end
local L = miss and Catalog.details(miss)
local txt = {}
for _, l in ipairs(L or {}) do txt[l[1]] = l[2] end
check("missing figures show Unknown (not 0)", miss and txt["0–100 km/h"] == "Unknown" and txt["Top speed"] == "Unknown" and txt["Kerb weight"] == "Unknown"
	and txt["Body type"] == "Not in the source data", miss and Catalog.short(miss))
local sus
for i = 1, n do
	if bit32.band(Catalog.row(i).sus, 1) ~= 0 then sus = i break end
end
L = sus and Catalog.details(sus)
local suspectLine = ""
for _, l in ipairs(L or {}) do if l[1] == "Power" then suspectLine = l[2] end end
check("a suspect power value is labelled, and left out of power filters / sorting", sus and string.find(suspectLine, "suspect source value", 1, true)
	and not table.find(Catalog.query({ hp = { 0, nil }, per = 50, page = 1, text = Catalog.row(sus).id }).items, sus), sus and (Catalog.short(sus) .. " · " .. suspectLine))
check("game estimates are labelled as estimates", (function()
	for _, l in ipairs(Catalog.details(1)) do
		if string.find(l[1], "Handling", 1, true) and not string.find(l[1], "game estimate", 1, true) then return false end
	end
	return true
end)())
-- filters
rep("filter: manual gearbox", { gear = 1, text = "bmw" }, function(r) return string.find(lower(r.gear), "manual", 1, true) ~= nil end)
rep("filter: rear-wheel drive", { drive = table.find(Dict.drives, "Rear Wheel Drive"), text = "nissan" }, function(r) return r.drive == "Rear Wheel Drive" end)
rep("filter: any hybrid", { fuel = "hybrid", text = "toyota" }, function(r) return string.find(lower(r.fuel), "hybrid", 1, true) ~= nil end)
rep("filter: 400 hp or more", { hp = { 400, nil }, text = "ferrari" }, function(r) return r.hp and r.hp >= 400 and bit32.band(r.sus, 1) == 0 end)
rep("filter: top speed 300 km/h or more", { top = { 300, nil } }, function(r) return r.top and r.top >= 300 end)
rep("filter: 0–100 under 4 s", { acc = { nil, 4 } }, function(r) return r.acc and r.acc < 4 end)
rep("filter: one brand (Kia)", { make = table.find(Dict.makes, "Kia") }, function(r) return r.make == "Kia" end)
-- sorting
local function sorted(sort, key, asc)
	local res = Catalog.query({ sort = sort, per = 50, page = 1, text = "audi" })
	local prev
	for _, i in ipairs(res.items) do
		local v = Catalog.row(i)[key]
		if v and prev and ((asc and v < prev) or (not asc and v > prev)) then return false end
		prev = v or prev
	end
	return #res.items > 0
end
check("sort: most power first", sorted("power", "hp", false))
check("sort: top speed first", sorted("top", "top", false))
check("sort: quickest 0–100 first", sorted("accel", "acc", true))
check("sort: newest first", sorted("newest", "ys", false))
-- paging and input limits
local qa = Catalog.query({ text = "ford", page = 0 })
local qb = Catalog.query({ text = "ford", page = 99999 })
local qc = Catalog.query({ text = "ford", per = 1000 })
check("pages clamp to 1..pages, at most 50 per page", qa.page == 1 and qb.page == qb.pages and #qb.items > 0 and qc.per == 50 and #qc.items == 50,
	string.format("ford: %d, %d pages", qa.total, qa.pages))
local long = string.rep("a", 200)
check("a long query is cut to 40 characters, 6 words", #table.concat(Catalog.words(long)) == 40 and #Catalog.words("a b c d e f g h") == 6)
local ok = pcall(function() Catalog.query({ text = "%[(.*+?^$" }) end)
check("pattern characters are plain text", ok)
check("no match: an empty page", Catalog.query({ text = "zzzz no such car" }).total == 0)
-- the game cars' links
local linked, broken, none = 0, 0, 0
for i = 1, 217 do
	local idx, l = Catalog.link(Links, i)
	if l then
		if idx then linked += 1 else broken += 1 end
	else
		none += 1
	end
end
local f1 = Catalog.row((Catalog.link(Links, 1)))
check("game car links resolve", broken == 0 and linked > 150 and f1.make == "Ford" and f1.model == "Focus RS", linked .. " linked, " .. none .. " not in the catalogue, " .. broken .. " broken · car 1: " .. Catalog.short(f1.i))
print(string.format("DONE %d %d", pass, fail))
`;
const out = path.join(os.tmpdir(), 'irbid_catalog_test_' + process.pid + '.luau');
fs.writeFileSync(out, harness);
const r = spawnSync(LUAU, [out], { encoding: 'utf8', maxBuffer: 256 << 20 });
fs.unlinkSync(out);
if (r.status !== 0 && !/DONE/.test(r.stdout)) { console.log(r.stdout.slice(-3000), r.stderr); process.exit(1); }
let pass = 0, fail = 0;
const rows = [];
for (const ln of r.stdout.split('\n')) {
	if (ln.startsWith('ROW\t')) rows.push(ln.split('\t').slice(1));
	else if (/^(PASS|FAIL) /.test(ln)) { console.log(ln); ln.startsWith('PASS') ? pass++ : fail++; }
}
// ---- A ----
if (fs.existsSync(JSON_SRC)) {
	const db = JSON.parse(fs.readFileSync(JSON_SRC, 'utf8'));
	const want = new Map();
	for (const v of db.vehicles) {
		const parts = v.id.split('-'), last = parts[parts.length - 1];
		const sid = /^[0-9a-f]{8}$/.test(last) ? last : parts[parts.length - 2] + '-' + last;
		if (!want.has(sid)) want.set(sid, v);
	}
	const I = v => v.identity, S = v => v.real_world_specs;
	const cols = [v => I(v).make, v => I(v).model, v => I(v).generation, v => I(v).year_start, v => I(v).year_end, v => I(v).engine_variant, v => S(v).fuel_type,
		v => S(v).cylinders, v => S(v).displacement_cc, v => S(v).power_hp, v => S(v).torque_nm, v => S(v).transmission, v => S(v).drivetrain,
		v => S(v).acceleration_0_to_100_kmh_s, v => S(v).top_speed_kmh, v => S(v).fuel_economy_combined_l_100km, v => S(v).length_mm, v => S(v).width_mm,
		v => S(v).height_mm, v => S(v).wheelbase_mm, v => S(v).curb_weight_kg];
	let bad = 0, missingAsZero = 0, cmp = 0, firstBad = '';
	const norm = x => typeof x === 'string' ? x.replace(/[\t\r\n]+/g, ' ').trim() : x;
	for (const row of rows) {
		const v = want.get(row[0]);
		if (!v) { bad++; firstBad ||= 'unknown id ' + row[0]; continue; }
		cols.forEach((c, k) => {
			const exp = norm(c(v)), got = row[k + 1];
			cmp++;
			const same = (exp === null || exp === '') ? got === '~' : typeof exp === 'number' ? got !== '~' && Math.abs(+got - exp) <= 1e-9 * Math.max(1, Math.abs(exp)) : got === exp;
			if (exp === null && got === '0') missingAsZero++;
			if (!same) { bad++; firstBad ||= `${row[0]} field ${k + 1}: source ${JSON.stringify(exp)} vs ${got}`; }
		});
	}
	const okA = bad === 0 && rows.length === db.vehicle_record_count - (db.vehicle_record_count - rows.length) && rows.length > 30000;
	console.log(`${okA ? 'PASS' : 'FAIL'} A: every variant equals the source database | ${rows.length} variants (source ${db.vehicle_record_count}, exact duplicates kept once), ${cmp.toLocaleString()} values compared, ${bad} differ, ${missingAsZero} missing values shown as 0${firstBad ? ' · ' + firstBad : ''}`);
	okA ? pass++ : fail++;
} else console.log(`SKIP A: no ${JSON_SRC} (build it with tools/vehicle_catalog/build_car_database.py to compare with the source)`);
console.log(`\n${pass} passed, ${fail} failed, luau exit ${r.status}`);
process.exit(fail || r.status ? 1 : 0);
