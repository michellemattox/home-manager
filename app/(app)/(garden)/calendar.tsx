/**
 * Seasonal Planting Calendar — Zone 8b (Puget Sound / Seattle)
 *
 * Based on WSU Extension guidelines, local frost dates, and PNW Master Gardener
 * recommendations. Last frost: ~March 15 · First fall frost: ~November 15
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// Zone 8b frost dates
const LAST_FROST = "~March 15";
const FIRST_FALL_FROST = "~November 15";
const GROWING_SEASON = "March–November";

type TaskType = "start_indoors" | "direct_sow" | "transplant" | "harvest" | "maintain" | "protect";

interface CalendarTask {
  crop: string;
  type: TaskType;
  note?: string;
}

interface MonthData {
  month: string;
  shortMonth: string;
  index: number; // 1-12
  frostRisk: "high" | "moderate" | "low" | "none";
  summary: string;
  tasks: CalendarTask[];
  maintenance: string[];
  wsuTip?: string;
}

const TASK_STYLES: Record<TaskType, { emoji: string; label: string; bg: string; color: string }> = {
  start_indoors: { emoji: "🏠", label: "Start Indoors", bg: "#eff6ff", color: "#1d4ed8" },
  direct_sow:    { emoji: "🌱", label: "Direct Sow",   bg: "#f0fdf4", color: "#15803d" },
  transplant:    { emoji: "🔄", label: "Transplant",   bg: "#fdf4ff", color: "#7e22ce" },
  harvest:       { emoji: "🌾", label: "Harvest",      bg: "#fffbeb", color: "#b45309" },
  maintain:      { emoji: "✂️",  label: "Maintain",     bg: "#f8fafc", color: "#475569" },
  protect:       { emoji: "🛡",  label: "Protect",      bg: "#fef2f2", color: "#b91c1c" },
};

const CALENDAR: MonthData[] = [
  {
    month: "January", shortMonth: "Jan", index: 1, frostRisk: "high",
    summary: "Planning season. Order seeds, start onions and leeks indoors late month.",
    tasks: [
      { crop: "Onions & Leeks", type: "start_indoors", note: "Start late Jan for spring transplant" },
      { crop: "Seed Catalog Planning", type: "maintain", note: "Order from Territorial, Nichols, Baker Creek" },
    ],
    maintenance: [
      "Prune fruit trees while dormant (apple, pear, plum)",
      "Check stored root vegetables for rot",
      "Clean and sharpen garden tools",
      "Review last year's garden notes and plan rotations",
    ],
    wsuTip: "WSU: January is ideal for dormant pruning of fruit trees. Cut out crossing branches and water sprouts. Apply dormant oil spray to fruit trees for pest control.",
  },
  {
    month: "February", shortMonth: "Feb", index: 2, frostRisk: "high",
    summary: "Start brassica seedlings indoors. Prepare raised beds with compost.",
    tasks: [
      { crop: "Broccoli, Cabbage, Kale", type: "start_indoors", note: "6–8 weeks before last frost" },
      { crop: "Celery & Celeriac", type: "start_indoors", note: "Slow germinator, start now" },
      { crop: "Onions & Leeks", type: "start_indoors", note: "If not started in January" },
    ],
    maintenance: [
      "Add compost to beds and work in gently",
      "Test soil pH — Zone 8b targets 6.0–6.8 for most vegetables",
      "Set up cold frame or low tunnel for early crops",
      "Prune roses once forsythia blooms",
    ],
    wsuTip: "WSU: Apply lime now if soil pH is below 6.0. Use dolomitic lime at 5–10 lbs/100 sq ft. Allow 2–3 months to take effect before planting.",
  },
  {
    month: "March", shortMonth: "Mar", index: 3, frostRisk: "moderate",
    summary: "Last frost ~March 15. Sow cool-season crops directly. Transplant hardy brassicas.",
    tasks: [
      { crop: "Peas (snap, shelling, snow)", type: "direct_sow", note: "Direct sow as soon as soil workable (~38°F)" },
      { crop: "Spinach & Arugula", type: "direct_sow", note: "Hardy to 28°F, direct sow now" },
      { crop: "Lettuce", type: "direct_sow", note: "Under row cover for early crop" },
      { crop: "Radishes & Turnips", type: "direct_sow" },
      { crop: "Kale, Broccoli, Cabbage", type: "transplant", note: "Harden off 1 week before transplanting" },
      { crop: "Tomatoes, Peppers", type: "start_indoors", note: "Start 6–8 weeks before last frost" },
      { crop: "Basil", type: "start_indoors", note: "Keep warm — 70°F+; germination slow in cold" },
    ],
    maintenance: [
      "Harden off brassica transplants in cold frame",
      "Mulch beds to warm soil faster",
      "Set up slug traps — spring rain activates slug pressure",
      "Apply iron phosphate bait (Sluggo) as prevention",
    ],
    wsuTip: "WSU: Peas are the anchor of PNW spring gardening. Inoculate seeds with rhizobium inoculant before sowing to maximize nitrogen fixation. Sow 1\" deep, 2\" apart.",
  },
  {
    month: "April", shortMonth: "Apr", index: 4, frostRisk: "low",
    summary: "Active planting month. Cool-season crops in full swing. Watch for slugs and aphids.",
    tasks: [
      { crop: "Beets & Swiss Chard", type: "direct_sow" },
      { crop: "Carrots & Parsnips", type: "direct_sow", note: "Thin to 2\" apart at 1\" height" },
      { crop: "Kale, Broccoli, Cauliflower", type: "transplant" },
      { crop: "Onion sets or starts", type: "transplant" },
      { crop: "Potatoes", type: "direct_sow", note: "Plant certified seed potatoes 4\" deep, 12\" apart" },
      { crop: "Lettuce (succession)", type: "direct_sow", note: "Sow every 2 weeks for continuous harvest" },
      { crop: "Cucumber, Squash, Melon", type: "start_indoors", note: "3–4 weeks before transplant date" },
    ],
    maintenance: [
      "Watch for aphid colonies on brassica transplants — knock off with water",
      "Cover brassicas with row cover to prevent cabbage moth damage",
      "Fertilize overwintered crops as growth resumes",
      "Begin regular slug monitoring; check under boards/pots at night",
    ],
    wsuTip: "WSU: Floating row cover over brassicas is the #1 defense against imported cabbageworm (Pieris rapae). Install at planting and seal edges. Remove only to hand-pollinate or harvest.",
  },
  {
    month: "May", shortMonth: "May", index: 5, frostRisk: "none",
    summary: "After May 15: transplant warm-season crops. Succession sow. Main growing season begins.",
    tasks: [
      { crop: "Tomatoes", type: "transplant", note: "After May 15 when nights stay above 50°F" },
      { crop: "Peppers & Eggplant", type: "transplant", note: "Late May; warm soil required — use black plastic mulch" },
      { crop: "Cucumbers & Zucchini", type: "transplant", note: "After May 15; direct sow also works" },
      { crop: "Winter Squash & Pumpkins", type: "direct_sow", note: "Direct sow or transplant late May" },
      { crop: "Beans (bush & pole)", type: "direct_sow", note: "Soil 60°F+; sow 1\" deep, 4\" apart" },
      { crop: "Corn", type: "direct_sow", note: "Soil 65°F+; plant in blocks for pollination" },
      { crop: "Basil", type: "transplant", note: "After last frost; keep warm and sheltered" },
      { crop: "Lettuce (succession)", type: "direct_sow", note: "Continue every 2 weeks" },
    ],
    maintenance: [
      "Stake or cage tomatoes at planting time",
      "Install drip irrigation before heat arrives",
      "Thin carrots, beets to proper spacing",
      "Side-dress heavy feeders (brassicas, corn) with balanced fertilizer",
    ],
    wsuTip: "WSU: Wait for consistently warm nights before transplanting tomatoes. Cold soil stunts root development and cold nights below 50°F cause blossom drop. Use Wall-O-Waters to extend season.",
  },
  {
    month: "June", shortMonth: "Jun", index: 6, frostRisk: "none",
    summary: "Full growing season. First harvests. Watch for spider mites in dry spells.",
    tasks: [
      { crop: "Fall Brassicas (broccoli, kale, Brussels)", type: "start_indoors", note: "Start early June for fall harvest" },
      { crop: "Beans (succession)", type: "direct_sow", note: "Sow every 2–3 weeks through July" },
      { crop: "Summer Squash", type: "harvest", note: "Harvest frequently at 6–8\" for best quality" },
      { crop: "Peas", type: "harvest", note: "Peak harvest; check daily" },
      { crop: "Lettuce & Spinach", type: "harvest", note: "Harvest before bolting in heat" },
    ],
    maintenance: [
      "Mulch 3\" deep around warm-season crops to conserve moisture",
      "Monitor for flea beetles on brassicas — apply kaolin clay or row cover",
      "Pinch basil flower buds to extend leaf harvest",
      "Water deeply and infrequently (1–2\" per week)",
    ],
    wsuTip: "WSU: Spider mites thrive in hot, dry conditions. Increase irrigation and humidity around plants. Use strong water spray on leaf undersides. Introduce predatory mites (Phytoseiidae) as biological control.",
  },
  {
    month: "July", shortMonth: "Jul", index: 7, frostRisk: "none",
    summary: "Peak summer heat. Main harvests. Plan fall garden. Watch for late blight if humid.",
    tasks: [
      { crop: "Fall Broccoli, Kale, Brussels Sprouts", type: "transplant", note: "Transplant starts for fall harvest" },
      { crop: "Carrots (fall crop)", type: "direct_sow", note: "Sow mid-July for fall/winter harvest" },
      { crop: "Beans (succession)", type: "direct_sow" },
      { crop: "Tomatoes, Cucumbers, Zucchini", type: "harvest", note: "Peak production" },
      { crop: "Garlic scapes", type: "harvest", note: "Remove before seed head swells" },
    ],
    maintenance: [
      "Watch tomato foliage for early or late blight signs (brown spots, yellowing)",
      "Prune indeterminate tomatoes to 2–3 main leaders for air circulation",
      "Harvest garlic when bottom 3 leaves yellow (~mid-July)",
      "Water consistently — irregular watering causes blossom end rot",
    ],
    wsuTip: "WSU: Late blight (Phytophthora infestans) risk increases during humid, cool nights in July–August. If spotted, remove and bag all affected tissue immediately — do NOT compost. Apply copper fungicide preventively in wet summers.",
  },
  {
    month: "August", shortMonth: "Aug", index: 8, frostRisk: "none",
    summary: "Heavy harvest season. Start overwintering crops. Cure garlic and dry herbs.",
    tasks: [
      { crop: "Overwintering Kale & Chard", type: "direct_sow", note: "Sow by Aug 15 for hardy overwintered crop" },
      { crop: "Spinach (overwintering)", type: "direct_sow", note: "Sow Aug 15–Sept 1 for fall/winter harvest" },
      { crop: "Fall lettuce mix", type: "direct_sow", note: "Under row cover in Aug for fall harvest" },
      { crop: "Cover crops (crimson clover, winter rye)", type: "direct_sow", note: "In beds finishing up by Sept" },
      { crop: "Tomatoes, Peppers, Eggplant", type: "harvest", note: "Peak — harvest frequently" },
      { crop: "Winter squash", type: "maintain", note: "Stop watering when rinds harden; cure in field" },
    ],
    maintenance: [
      "Begin curing harvested garlic in warm, dry, shaded location (2–4 weeks)",
      "Remove spent pea vines — compost (not if diseased)",
      "Side-dress fall brassicas with nitrogen fertilizer",
      "Save seeds from open-pollinated crops for next year",
    ],
    wsuTip: "WSU: For overwintering spinach and mache, sow by Sept 1 in Zone 8b. Varieties to choose: Bloomsdale, Tyee (spinach); Vit (mache). These survive Puget Sound winters with minimal protection.",
  },
  {
    month: "September", shortMonth: "Sep", index: 9, frostRisk: "low",
    summary: "Fall planting. Last warm-season harvests. Prepare for winter garden.",
    tasks: [
      { crop: "Garlic (hardneck)", type: "direct_sow", note: "Plant after Oct 1 for best bulb development" },
      { crop: "Fava Beans", type: "direct_sow", note: "Direct sow for overwintering — unique PNW crop" },
      { crop: "Radishes & Turnips", type: "direct_sow", note: "Fast crops before frost; 30–40 days" },
      { crop: "Mache / Corn Salad", type: "direct_sow", note: "Very cold-hardy; great PNW winter green" },
      { crop: "Tomatoes, Peppers", type: "harvest", note: "Bring in green tomatoes before first frost to ripen indoors" },
    ],
    maintenance: [
      "Apply row cover or low tunnels over fall brassicas as nights cool",
      "Remove dying tomato plants (compost if no disease; bag diseased material)",
      "Plant cover crops in empty beds immediately",
      "Collect rain barrel water before heavy rains begin",
    ],
    wsuTip: "WSU: Garlic planted Oct 1–Nov 15 overwinters in Zone 8b. Choose hardneck types (Rocambole, Porcelain) for Puget Sound — better flavor and cold hardiness than softneck. Plant 2\" deep, 6\" apart.",
  },
  {
    month: "October", shortMonth: "Oct", index: 10, frostRisk: "moderate",
    summary: "Final harvests. Plant garlic. Prepare beds for winter. Root cellar crops.",
    tasks: [
      { crop: "Garlic", type: "direct_sow", note: "Ideal planting window Oct 1–Nov 15" },
      { crop: "Overwintering onions", type: "direct_sow", note: "Plant starts for early spring harvest" },
      { crop: "Winter squash", type: "harvest", note: "Harvest before hard frost; cure 10–14 days at 80–85°F" },
      { crop: "Root vegetables (carrots, beets)", type: "harvest", note: "Can leave in ground under mulch through winter" },
      { crop: "Brussels Sprouts & Kale", type: "harvest", note: "Flavor improves after frost" },
    ],
    maintenance: [
      "Mulch carrot and beet beds with 6\" straw for winter storage in ground",
      "Add compost to empty beds and leave surface rough for frost to break down",
      "Clean up diseased plant debris; bag for garbage (not compost)",
      "Drain and store drip irrigation before hard freezes",
    ],
    wsuTip: "WSU: Frost sweetens Brussels sprouts, kale, parsnips, and carrots in Zone 8b. Leave these crops in the ground after first frost for improved flavor. Protect with row cover during hard frosts below 25°F.",
  },
  {
    month: "November", shortMonth: "Nov", index: 11, frostRisk: "high",
    summary: "Winter garden maintenance. Harvest hardy greens under protection. First frost ~Nov 15.",
    tasks: [
      { crop: "Kale, Chard, Spinach", type: "harvest", note: "Continues under row cover or cold frame" },
      { crop: "Leeks", type: "harvest", note: "Very cold-hardy; harvest through winter" },
      { crop: "Overwintered crops", type: "protect", note: "Apply row cover before hard freezes" },
    ],
    maintenance: [
      "Apply row cover over winter greens before hard frosts",
      "Check cold frames and low tunnels for condensation and ventilation",
      "Order seed catalogs for next season planning",
      "Lime bare beds if pH test shows below 6.0",
    ],
    wsuTip: "WSU: Zone 8b winter minimum temperatures range from 10–20°F. Most hardy greens survive with row cover. Leeks, kale, and mache reliably overwinter without protection. Spinach needs light cover below 20°F.",
  },
  {
    month: "December", shortMonth: "Dec", index: 12, frostRisk: "high",
    summary: "Rest and planning season. Harvest leeks and overwintered greens. Order seeds.",
    tasks: [
      { crop: "Leeks & Winter Greens", type: "harvest", note: "Continue harvesting hardy overwintered crops" },
      { crop: "Forced chicory (witloof)", type: "harvest", note: "If you dug roots and forced indoors" },
    ],
    maintenance: [
      "Order seeds for next season — popular varieties sell out by January",
      "Plan crop rotations using 4-family system (Solanaceae, Brassicaceae, Leguminosae, Apiaceae/other)",
      "Top-dress beds with aged compost",
      "Maintain cold frames — ventilate on sunny days above 40°F",
    ],
    wsuTip: "WSU: December is ideal for planning crop rotations. Follow the 4-family rotation: Nightshades → Brassicas → Legumes → Roots/Others. Minimum 2-year gap between same-family crops in the same bed to break pest/disease cycles.",
  },
];

const FROST_RISK_STYLES = {
  high:     { bg: "#fef2f2", color: "#dc2626", label: "Hard frost likely" },
  moderate: { bg: "#fffbeb", color: "#d97706", label: "Frost possible" },
  low:      { bg: "#eff6ff", color: "#2563eb", label: "Light frost risk" },
  none:     { bg: "#f0fdf4", color: "#16a34a", label: "Frost-free" },
};

export default function CalendarScreen() {
  const router = useRouter();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthData = CALENDAR[selectedMonth - 1];
  const frostStyle = FROST_RISK_STYLES[monthData.frostRisk];

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">📅 Planting Calendar</Text>
        <View className="bg-green-50 border border-green-200 rounded-lg px-2 py-1">
          <Text className="text-green-700 text-xs font-semibold">Zone 8b</Text>
        </View>
      </View>

      {/* Zone info strip */}
      <View className="px-4 py-2 bg-green-700 flex-row items-center gap-4">
        <Text className="text-white text-xs">Last frost: <Text className="font-semibold">{LAST_FROST}</Text></Text>
        <Text className="text-green-300 text-xs">·</Text>
        <Text className="text-white text-xs">First fall frost: <Text className="font-semibold">{FIRST_FALL_FROST}</Text></Text>
        <Text className="text-green-300 text-xs">·</Text>
        <Text className="text-white text-xs">Season: <Text className="font-semibold">{GROWING_SEASON}</Text></Text>
      </View>

      {/* Month selector */}
      <View className="bg-white border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
          {CALENDAR.map(m => (
            <TouchableOpacity
              key={m.index}
              onPress={() => setSelectedMonth(m.index)}
              className={`px-3 py-2 rounded-xl border items-center min-w-[48px] ${selectedMonth === m.index ? "bg-green-600 border-green-600" : m.index === currentMonth ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}
            >
              <Text className={`text-xs font-semibold ${selectedMonth === m.index ? "text-white" : m.index === currentMonth ? "text-green-700" : "text-gray-600"}`}>
                {m.shortMonth}
              </Text>
              {m.index === currentMonth && selectedMonth !== m.index && (
                <View className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Month header */}
        <View>
          <View className="flex-row items-center gap-3 mb-1">
            <Text className="text-xl font-bold text-gray-900">{monthData.month}</Text>
            <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: frostStyle.bg }}>
              <Text className="text-xs font-semibold" style={{ color: frostStyle.color }}>
                ❄ {frostStyle.label}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-600">{monthData.summary}</Text>
        </View>

        {/* Planting tasks */}
        {monthData.tasks.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">What to Plant / Harvest</Text>
            <View className="gap-2">
              {monthData.tasks.map((task, i) => {
                const ts = TASK_STYLES[task.type];
                return (
                  <View key={i} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-start gap-3">
                    <View className="px-2 py-1 rounded-lg mt-0.5" style={{ backgroundColor: ts.bg }}>
                      <Text className="text-xs font-semibold" style={{ color: ts.color }}>
                        {ts.emoji} {ts.label}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{task.crop}</Text>
                      {task.note && <Text className="text-xs text-gray-500 mt-0.5">{task.note}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Maintenance tasks */}
        {monthData.maintenance.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Garden Maintenance</Text>
            <View className="bg-white border border-gray-100 rounded-xl px-4 py-3 gap-2">
              {monthData.maintenance.map((m, i) => (
                <View key={i} className="flex-row items-start gap-2">
                  <Text className="text-green-600 text-sm mt-0.5">•</Text>
                  <Text className="text-sm text-gray-700 flex-1">{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* WSU Tip */}
        {monthData.wsuTip && (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-xs font-bold text-green-800 mb-1">WSU Extension Tip</Text>
            <Text className="text-sm text-green-700 leading-5">{monthData.wsuTip}</Text>
          </View>
        )}

        {/* Legend */}
        <View className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <Text className="text-xs font-semibold text-gray-600 mb-2">Legend</Text>
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(TASK_STYLES).map(([key, ts]) => (
              <View key={key} className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: ts.bg }}>
                <Text className="text-xs">{ts.emoji}</Text>
                <Text className="text-xs font-medium" style={{ color: ts.color }}>{ts.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
