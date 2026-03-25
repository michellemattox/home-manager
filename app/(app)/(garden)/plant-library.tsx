/**
 * Plant Library — Zone 8b (Puget Sound) Crop Reference
 *
 * Browseable reference for common PNW vegetables with planting depth, spacing,
 * days to maturity, companion plants, WSU Extension notes, and pest/disease risks.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useHouseholdStore } from "@/stores/householdStore";
import { useGardenPlots, useCreateGardenPlanting } from "@/hooks/useGarden";
import { showAlert } from "@/lib/alert";
import { toISODateString } from "@/utils/dateUtils";

type Season = "cool" | "warm" | "year_round";
type Difficulty = "easy" | "moderate" | "challenging";

interface PlantEntry {
  name: string;
  family: string;
  season: Season;
  difficulty: Difficulty;
  emoji: string;
  // Planting specs
  depthInches: string;
  spacingInches: string;
  daysToMaturity: string;
  sunHours: string;
  // Zone 8b windows
  startIndoors?: string;
  directSow?: string;
  transplant?: string;
  harvestWindow: string;
  // Soil & water
  soilPh: string;
  waterNeeds: "low" | "moderate" | "high";
  feedingNeeds: "light" | "moderate" | "heavy";
  // WSU / PNW notes
  wsuNotes: string;
  // Companions
  goodCompanions: string[];
  badCompanions: string[];
  // Common issues
  commonPests: string[];
  commonDiseases: string[];
  // Tips
  zoneTip: string;
}

const SEASON_STYLES: Record<Season, { label: string; bg: string; color: string }> = {
  cool:      { label: "Cool Season", bg: "#eff6ff", color: "#1d4ed8" },
  warm:      { label: "Warm Season", bg: "#fef9c3", color: "#a16207" },
  year_round:{ label: "Year-Round",  bg: "#f0fdf4", color: "#16a34a" },
};

const DIFFICULTY_STYLES: Record<Difficulty, { label: string; color: string }> = {
  easy:       { label: "Easy",       color: "#16a34a" },
  moderate:   { label: "Moderate",   color: "#d97706" },
  challenging:{ label: "Challenging",color: "#dc2626" },
};

const WATER_LABELS = { low: "💧 Low", moderate: "💧💧 Moderate", high: "💧💧💧 High" };
const FEEDING_LABELS = { light: "🌿 Light feeder", moderate: "🌿🌿 Moderate feeder", heavy: "🌿🌿🌿 Heavy feeder" };

const PLANTS: PlantEntry[] = [
  {
    name: "Tomato", family: "Solanaceae", season: "warm", difficulty: "moderate", emoji: "🍅",
    depthInches: "1/4\"", spacingInches: "24–36\"", daysToMaturity: "60–80", sunHours: "8+",
    startIndoors: "Late Feb – early Mar (6–8 wks before transplant)",
    transplant: "After May 15 when nights stay above 50°F",
    harvestWindow: "July – October",
    soilPh: "6.0–6.8", waterNeeds: "high", feedingNeeds: "heavy",
    wsuNotes: "PNW summers are marginal for heat-loving tomatoes. Choose short-season varieties (Siletz, Stupice, Early Girl). Use black plastic mulch to warm soil. Wall-O-Waters allow earlier transplanting. Stake or cage at planting time — indeterminate types need pruning to 2–3 leaders for air circulation.",
    goodCompanions: ["Basil", "Carrots", "Parsley", "Marigolds", "Borage"],
    badCompanions: ["Fennel", "Brassicas", "Potatoes", "Corn"],
    commonPests: ["Aphids", "Hornworms", "Flea beetles", "Spider mites"],
    commonDiseases: ["Late blight (Phytophthora)", "Early blight (Alternaria)", "Gray mold (Botrytis)", "Fusarium wilt"],
    zoneTip: "Plant deeply — bury 2/3 of stem for extra roots. Choose varieties with 'V' (Verticillium) and 'F' (Fusarium) resistance ratings for PNW soils.",
  },
  {
    name: "Kale", family: "Brassicaceae", season: "year_round", difficulty: "easy", emoji: "🥬",
    depthInches: "1/4\"", spacingInches: "12–18\"", daysToMaturity: "50–70", sunHours: "4–6+",
    startIndoors: "Feb (for spring), June (for fall/winter)",
    transplant: "Mar–Apr or Jul–Aug",
    directSow: "Apr–May or Aug",
    harvestWindow: "Year-round in Zone 8b",
    soilPh: "6.0–7.5", waterNeeds: "moderate", feedingNeeds: "moderate",
    wsuNotes: "Zone 8b's ideal kale climate. Flavor improves dramatically after frost. Lacinato (dinosaur kale) and Red Russian are PNW favorites. Can be harvested continuously for 2+ years. Overwinters reliably without protection. Excellent succession crop — plant spring and fall crops.",
    goodCompanions: ["Beets", "Celery", "Herbs", "Onions"],
    badCompanions: ["Tomatoes", "Strawberries", "Beans"],
    commonPests: ["Aphids", "Cabbage worms", "Cabbage loopers", "Flea beetles", "Slugs"],
    commonDiseases: ["Black rot", "Downy mildew", "Clubroot"],
    zoneTip: "Row cover at planting prevents cabbage moth damage. Remove cover only to hand-weed. Harvest outer leaves from bottom up, leaving growing point intact.",
  },
  {
    name: "Peas", family: "Leguminosae", season: "cool", difficulty: "easy", emoji: "🫛",
    depthInches: "1–2\"", spacingInches: "2–4\" (rows 18\")", daysToMaturity: "55–75", sunHours: "4–6",
    directSow: "Mar 1 – Apr 15 (as soon as soil workable, 38°F+)",
    harvestWindow: "May – July",
    soilPh: "6.0–7.5", waterNeeds: "moderate", feedingNeeds: "light",
    wsuNotes: "Direct sow as early as March 1 in Zone 8b — peas are frost-hardy to 28°F. Inoculate seed with rhizobium inoculant for nitrogen fixation. Install trellis at sowing time. Stop producing in summer heat — plant and harvest before July. Succession sow every 2 weeks through April.",
    goodCompanions: ["Carrots", "Radishes", "Spinach", "Mint", "Turnips"],
    badCompanions: ["Onions", "Garlic", "Fennel"],
    commonPests: ["Aphids", "Pea weevil", "Cutworms"],
    commonDiseases: ["Powdery mildew", "Pea enation mosaic virus", "Root rot"],
    zoneTip: "Enation virus-resistant varieties (Oregon Sugar Pod II, Cascadia snap pea) are strongly recommended for Western WA. Enation is transmitted by aphids and devastates susceptible varieties.",
  },
  {
    name: "Carrot", family: "Apiaceae", season: "cool", difficulty: "moderate", emoji: "🥕",
    depthInches: "1/4\"", spacingInches: "2–3\" (thin to)", daysToMaturity: "65–80", sunHours: "4–6",
    directSow: "Apr – July 15 (succession); Aug for overwintering",
    harvestWindow: "July – March (store in ground under mulch)",
    soilPh: "6.0–6.8", waterNeeds: "moderate", feedingNeeds: "light",
    wsuNotes: "Deep, loose, rock-free soil essential for straight roots. Mix with sand or use raised beds. Keep surface moist until germination (10–14 days). Thin to 2\" apart at 1\" height. Sow mid-July for fall/winter harvest — frost sweetens carrots. Mulch with 6\" straw for in-ground winter storage.",
    goodCompanions: ["Tomatoes", "Lettuce", "Onions", "Rosemary", "Peas"],
    badCompanions: ["Fennel", "Dill (mature)", "Parsnips"],
    commonPests: ["Carrot rust fly", "Aphids", "Wireworms"],
    commonDiseases: ["Alternaria leaf blight", "Root rot"],
    zoneTip: "Carrot rust fly is the major PNW pest. Row cover from sowing to harvest is the most reliable control — no gaps. Delayed planting to mid-June avoids the first rust fly flight.",
  },
  {
    name: "Broccoli", family: "Brassicaceae", season: "cool", difficulty: "moderate", emoji: "🥦",
    depthInches: "1/4\"", spacingInches: "18–24\"", daysToMaturity: "55–75", sunHours: "4–6",
    startIndoors: "Feb (for spring transplant); June (for fall)",
    transplant: "Mar–Apr (spring); Jul–Aug (fall)",
    harvestWindow: "May–June (spring crop); Sept–Nov (fall crop)",
    soilPh: "6.0–7.0", waterNeeds: "high", feedingNeeds: "heavy",
    wsuNotes: "Zone 8b is excellent for fall broccoli — cool, moist fall weather produces dense, flavorful heads. Side-dress with nitrogen 3 weeks after transplanting. Harvest main head when buds are still tight; side shoots continue for weeks. Cover with row cover from planting to prevent cabbage moth.",
    goodCompanions: ["Beets", "Celery", "Chamomile", "Marigolds", "Onions"],
    badCompanions: ["Tomatoes", "Peppers", "Strawberries", "Beans"],
    commonPests: ["Cabbage worms", "Cabbage loopers", "Aphids", "Root maggots", "Flea beetles"],
    commonDiseases: ["Black rot", "Downy mildew", "Clubroot", "Blackleg"],
    zoneTip: "Install row cover at transplanting — this single step prevents the majority of cabbage caterpillar damage without any spray. Seal edges with soil or pins.",
  },
  {
    name: "Lettuce", family: "Asteraceae", season: "cool", difficulty: "easy", emoji: "🥗",
    depthInches: "1/8\" (surface sow)", spacingInches: "6–12\" (heads); 1\" (cut-and-come-again)", daysToMaturity: "40–65", sunHours: "3–5",
    directSow: "Mar – May; Aug – Sept (fall crop)",
    transplant: "Mar–Apr under row cover",
    harvestWindow: "Apr–June; Sept–Nov",
    soilPh: "6.0–7.0", waterNeeds: "moderate", feedingNeeds: "light",
    wsuNotes: "Succession sow every 2 weeks from March through May for continuous harvest. Bolts in summer heat — choose heat-tolerant types (Jericho, Nevada, Black Seeded Simpson) for late spring. Sow in August under shade cloth for fall crop. Slug pressure is the primary PNW problem.",
    goodCompanions: ["Carrots", "Radishes", "Strawberries", "Chives", "Garlic"],
    badCompanions: ["Celery", "Fennel", "Parsley"],
    commonPests: ["Slugs", "Aphids", "Leaf miners"],
    commonDiseases: ["Downy mildew", "Tip burn (calcium)", "Bottom rot"],
    zoneTip: "Surface sow — lettuce needs light to germinate. Press seeds gently into soil, keep moist. Apply iron phosphate bait (Sluggo) around beds immediately after sowing.",
  },
  {
    name: "Garlic", family: "Alliaceae", season: "cool", difficulty: "easy", emoji: "🧄",
    depthInches: "2\"", spacingInches: "6\" (rows 12\")", daysToMaturity: "240–270", sunHours: "6+",
    directSow: "Oct 1 – Nov 15 (fall planting only)",
    harvestWindow: "Mid-July (when bottom 3 leaves yellow)",
    soilPh: "6.0–7.5", waterNeeds: "moderate", feedingNeeds: "moderate",
    wsuNotes: "Fall-planted garlic is one of the most reliable Zone 8b crops. Choose hardneck types (Rocambole, Porcelain, Purple Stripe) — better flavor and cold hardiness than softneck. Plant pointed end up, 2\" deep. Mulch with 3\" straw after planting. Harvest scapes in June before curling; eat or use. Stop watering 2 weeks before harvest. Cure 3–4 weeks in warm, shaded, ventilated space.",
    goodCompanions: ["Tomatoes", "Peppers", "Roses", "Carrots", "Brassicas"],
    badCompanions: ["Beans", "Peas", "Asparagus"],
    commonPests: ["Onion thrips", "Leek moth"],
    commonDiseases: ["White rot", "Botrytis (neck rot)", "Rust"],
    zoneTip: "Zone 8b's mild winters rarely kill hardneck garlic. The bigger risk is wet soil — raised beds or well-drained raised rows prevent root rot over winter.",
  },
  {
    name: "Squash (Summer)", family: "Cucurbitaceae", season: "warm", difficulty: "easy", emoji: "🥒",
    depthInches: "1\"", spacingInches: "24–36\"", daysToMaturity: "45–60", sunHours: "6+",
    startIndoors: "Early May (3–4 weeks before transplant)",
    directSow: "After May 15 (soil 65°F+)",
    transplant: "After May 15",
    harvestWindow: "July – October",
    soilPh: "5.5–6.8", waterNeeds: "high", feedingNeeds: "heavy",
    wsuNotes: "Extremely productive in Zone 8b once warm weather arrives. Harvest frequently at 6–8\" for best quality and continued production — overgrown fruit signals plant to stop producing. Powdery mildew is inevitable by August; allow it and keep harvesting. Hand pollinate if bee activity is low.",
    goodCompanions: ["Corn", "Beans", "Nasturtiums", "Radishes", "Borage"],
    badCompanions: ["Potatoes", "Fennel"],
    commonPests: ["Aphids", "Squash bugs", "Spider mites", "Cucumber beetles"],
    commonDiseases: ["Powdery mildew", "Mosaic virus", "Botrytis"],
    zoneTip: "Plant in full sun and enrich planting hole with compost. The Three Sisters guild (corn, beans, squash) works well in Zone 8b and improves all three crops.",
  },
  {
    name: "Beans (Bush)", family: "Leguminosae", season: "warm", difficulty: "easy", emoji: "🫘",
    depthInches: "1–1.5\"", spacingInches: "4\" (rows 18\")", daysToMaturity: "50–65", sunHours: "6+",
    directSow: "May 15 – July 15 (soil 60°F+); succession sow every 2–3 weeks",
    harvestWindow: "July – September",
    soilPh: "6.0–7.0", waterNeeds: "moderate", feedingNeeds: "light",
    wsuNotes: "Direct sow after soil reaches 60°F — cold soil causes rot. Inoculate seed with bean inoculant. Succession sow every 2–3 weeks through July 15 for continuous harvest. Harvest frequently when pods snap cleanly — once seeds bulge, production slows. Avoid wetting foliage to prevent rust.",
    goodCompanions: ["Carrots", "Beets", "Cucumbers", "Squash", "Corn"],
    badCompanions: ["Onions", "Garlic", "Fennel", "Kohlrabi"],
    commonPests: ["Aphids", "Mexican bean beetles", "Cutworms"],
    commonDiseases: ["Rust", "Root rot", "Bean mosaic virus"],
    zoneTip: "Pole beans (Kentucky Wonder, Rattlesnake) are more productive in Zone 8b's short warm season than bush types because they produce over a longer window.",
  },
  {
    name: "Cucumber", family: "Cucurbitaceae", season: "warm", difficulty: "moderate", emoji: "🥒",
    depthInches: "1\"", spacingInches: "12\" (trellised) or 18–24\" (ground)", daysToMaturity: "55–70", sunHours: "6+",
    startIndoors: "Early May (3–4 weeks)",
    directSow: "After May 20 (soil 65°F+)",
    transplant: "After May 20",
    harvestWindow: "July – September",
    soilPh: "6.0–7.0", waterNeeds: "high", feedingNeeds: "moderate",
    wsuNotes: "Zone 8b summers are marginal for cucumbers — choose early varieties (Spacemaster, Straight Eight, Marketmore). Trellis vertically to maximize air circulation and space. Mulch heavily to retain heat and moisture. Consistent watering prevents bitterness. Harvest before turning yellow.",
    goodCompanions: ["Beans", "Corn", "Peas", "Sunflowers", "Radishes"],
    badCompanions: ["Fennel", "Sage", "Potatoes", "Melons"],
    commonPests: ["Aphids", "Spider mites", "Cucumber beetles"],
    commonDiseases: ["Powdery mildew", "Mosaic virus", "Angular leaf spot"],
    zoneTip: "Row cover at transplanting warms soil and protects from early cold. Remove when plants start to flower for pollination.",
  },
  {
    name: "Spinach", family: "Chenopodiaceae", season: "cool", difficulty: "easy", emoji: "🥬",
    depthInches: "1/2\"", spacingInches: "3–4\" (thin to 6\")", daysToMaturity: "35–50", sunHours: "3–5",
    directSow: "Mar – May; Aug 15 – Sept 1 (overwintering)",
    harvestWindow: "Apr–June; Oct – March (overwintered)",
    soilPh: "6.0–7.5", waterNeeds: "moderate", feedingNeeds: "moderate",
    wsuNotes: "Overwintering spinach is a Zone 8b specialty. Sow by September 1 — Bloomsdale Longstanding and Tyee overwinter reliably with minimal protection. Light row cover during hard freezes (below 20°F). Spring crop bolts quickly in warming weather — succession sow and harvest young leaves. Bolt-resistant varieties for spring: Corvair, Reflect.",
    goodCompanions: ["Strawberries", "Peas", "Beans", "Cabbage", "Celery"],
    badCompanions: ["Fennel"],
    commonPests: ["Aphids", "Leaf miners", "Slugs"],
    commonDiseases: ["Downy mildew", "Fusarium wilt"],
    zoneTip: "Overwintered spinach provides fresh greens from October through April with almost no effort in Zone 8b. It's the single best low-maintenance winter crop for Puget Sound.",
  },
  {
    name: "Beets", family: "Chenopodiaceae", season: "cool", difficulty: "easy", emoji: "🫀",
    depthInches: "1/2–1\"", spacingInches: "3–4\" (thin to)", daysToMaturity: "55–65", sunHours: "4–6",
    directSow: "Apr – July; Sept for storage",
    harvestWindow: "June – November; store in ground through winter",
    soilPh: "6.0–7.0", waterNeeds: "moderate", feedingNeeds: "light",
    wsuNotes: "Each beet 'seed' is actually a cluster of 2–4 seeds — thin to one plant per 3\". Boron deficiency (hollow black center) is common in PNW soils — apply borax at 1 tbsp per 100 sq ft if observed. Roots and greens both edible. Tolerates light frost; mulch for in-ground winter storage through Zone 8b winters.",
    goodCompanions: ["Onions", "Lettuce", "Brassicas", "Bush beans"],
    badCompanions: ["Pole beans", "Chard", "Spinach (compete)"],
    commonPests: ["Leaf miners", "Aphids", "Flea beetles"],
    commonDiseases: ["Cercospora leaf spot", "Boron deficiency"],
    zoneTip: "Detroit Dark Red and Chioggia are PNW favorites. For winter storage, leave in ground under 4–6\" straw mulch. Pull as needed through winter.",
  },
  {
    name: "Potatoes", family: "Solanaceae", season: "cool", difficulty: "easy", emoji: "🥔",
    depthInches: "4\"", spacingInches: "12\" (rows 24–36\")", daysToMaturity: "70–120", sunHours: "6+",
    directSow: "Mar 15 – May 15 (certified seed potatoes)",
    harvestWindow: "July (new potatoes) – October (maincrop)",
    soilPh: "5.0–6.0", waterNeeds: "moderate", feedingNeeds: "moderate",
    wsuNotes: "Use only certified seed potatoes — grocery potatoes carry disease. Chit (pre-sprout) in light 2 weeks before planting. Hill up soil around stems as they grow to increase yield and prevent greening. Stop watering when foliage yellows. Cure harvested potatoes 1 week at room temperature before storage. Late blight is a significant PNW risk — remove and bag any infected foliage immediately.",
    goodCompanions: ["Beans", "Cabbage", "Corn", "Marigolds", "Horseradish"],
    badCompanions: ["Tomatoes", "Fennel", "Cucumbers", "Sunflowers"],
    commonPests: ["Colorado potato beetle (rare in PNW)", "Wireworms", "Root maggots", "Aphids"],
    commonDiseases: ["Late blight", "Early blight", "Scab", "Blackleg"],
    zoneTip: "Fingerling types (La Ratte, French Fingerling) and waxy varieties (Yukon Gold, Red Pontiac) perform especially well in Zone 8b's cool summers.",
  },
  {
    name: "Onions", family: "Alliaceae", season: "cool", difficulty: "moderate", emoji: "🧅",
    depthInches: "1/4\" (seed) or 1\" (sets)", spacingInches: "4–6\"", daysToMaturity: "100–120 (from seed)", sunHours: "6+",
    startIndoors: "Late Jan – Feb (12–14 weeks before transplant)",
    transplant: "Mar–Apr",
    directSow: "Sets: Mar–Apr",
    harvestWindow: "July–August",
    soilPh: "6.0–7.0", waterNeeds: "moderate", feedingNeeds: "moderate",
    wsuNotes: "Long-day onion varieties required for PNW (Walla Walla, Yellow of Parma, Copra). Short-day types will not bulb properly. Start from seed in late January for best selection. Transplants available locally from March. Stop watering when tops fall over. Cure 3–4 weeks in warm, shaded, ventilated space before storage.",
    goodCompanions: ["Carrots", "Beets", "Lettuce", "Tomatoes", "Chamomile"],
    badCompanions: ["Beans", "Peas", "Asparagus"],
    commonPests: ["Onion thrips", "Onion maggots"],
    commonDiseases: ["Botrytis neck rot", "Purple blotch", "Downy mildew"],
    zoneTip: "Walla Walla Sweet is the iconic PNW onion — mild, sweet, and productive in Zone 8b. Plant thickly and thin progressively, eating thinnings as green onions.",
  },
  {
    name: "Pepper", family: "Solanaceae", season: "warm", difficulty: "challenging", emoji: "🫑",
    depthInches: "1/4\"", spacingInches: "18–24\"", daysToMaturity: "65–85", sunHours: "8+",
    startIndoors: "Late Jan – early Feb (10–12 weeks before transplant)",
    transplant: "After May 20 (soil 65°F+; nights above 55°F)",
    harvestWindow: "Aug – October",
    soilPh: "6.0–7.0", waterNeeds: "moderate", feedingNeeds: "moderate",
    wsuNotes: "Peppers are challenging in Zone 8b — summers are often too cool. Prioritize heat-absorbing strategies: black plastic mulch, wall-O-waters, south-facing walls, or hoop tunnels. Choose early varieties (Ace, Gypsy, Lipstick, Shishito). Grow in containers that can be moved indoors during cold snaps. Calcium deficiency (blossom end rot) is common — maintain consistent moisture.",
    goodCompanions: ["Tomatoes", "Basil", "Carrots", "Parsley"],
    badCompanions: ["Fennel", "Brassicas"],
    commonPests: ["Aphids", "Spider mites", "Flea beetles"],
    commonDiseases: ["Blossom end rot", "Phytophthora root rot", "Bacterial spot"],
    zoneTip: "If peppers ripen slowly, cut the entire plant and hang it root-up in a warm location — remaining peppers continue to ripen off the vine.",
  },
];

export default function PlantLibraryScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState<Season | null>(null);
  const [selected, setSelected] = useState<PlantEntry | null>(null);

  // Add to Garden
  const { data: plots = [] } = useGardenPlots(household?.id);
  const createPlanting = useCreateGardenPlanting();
  const [addingToPlot, setAddingToPlot] = useState(false);
  const [plotPickerVisible, setPlotPickerVisible] = useState(false);

  const handleAddToPlot = async (plotId: string) => {
    if (!selected || !household) return;
    setAddingToPlot(true);
    setPlotPickerVisible(false);
    try {
      await createPlanting.mutateAsync({
        household_id: household.id,
        plot_id: plotId,
        zone_id: null,
        plant_name: selected.name,
        plant_family: selected.family,
        variety: null,
        date_planted: toISODateString(new Date()),
        date_removed: null,
        season_year: new Date().getFullYear(),
        notes: null,
        source: null,
        quantity: null,
      } as any);
      setSelected(null);
      router.push(`/(app)/(garden)/${plotId}`);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setAddingToPlot(false);
    }
  };

  const filtered = useMemo(() => {
    let list = PLANTS;
    if (filterSeason) list = list.filter(p => p.season === filterSeason);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q) ||
        p.goodCompanions.some(c => c.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [search, filterSeason]);

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">📚 Plant Library</Text>
        <View className="bg-green-50 border border-green-200 rounded-lg px-2 py-1">
          <Text className="text-green-700 text-xs font-semibold">Zone 8b</Text>
        </View>
      </View>

      {/* Search + filter */}
      <View className="px-4 py-3 bg-white border-b border-gray-100 gap-2">
        <TextInput
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800"
          placeholder="Search crops, families, companions…"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setFilterSeason(null)}
            className={`px-3 py-1.5 rounded-xl border ${!filterSeason ? "bg-green-600 border-green-600" : "border-gray-200 bg-white"}`}
          >
            <Text className={`text-xs font-medium ${!filterSeason ? "text-white" : "text-gray-600"}`}>All ({PLANTS.length})</Text>
          </TouchableOpacity>
          {(["cool", "warm", "year_round"] as Season[]).map(s => {
            const st = SEASON_STYLES[s];
            const count = PLANTS.filter(p => p.season === s).length;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterSeason(filterSeason === s ? null : s)}
                className="px-3 py-1.5 rounded-xl border"
                style={filterSeason === s ? { backgroundColor: st.color, borderColor: st.color } : { backgroundColor: st.bg, borderColor: st.color + "55" }}
              >
                <Text className="text-xs font-medium" style={{ color: filterSeason === s ? "white" : st.color }}>
                  {st.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
        {filtered.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-gray-500 text-sm">No crops match your search.</Text>
          </View>
        ) : filtered.map(plant => {
          const ss = SEASON_STYLES[plant.season];
          const ds = DIFFICULTY_STYLES[plant.difficulty];
          return (
            <TouchableOpacity
              key={plant.name}
              onPress={() => setSelected(plant)}
              className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3"
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 32 }}>{plant.emoji}</Text>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="text-sm font-bold text-gray-900">{plant.name}</Text>
                  <Text className="text-xs text-gray-400 italic">{plant.family}</Text>
                </View>
                <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                  <View className="px-2 py-0.5 rounded-lg" style={{ backgroundColor: ss.bg }}>
                    <Text className="text-xs font-medium" style={{ color: ss.color }}>{ss.label}</Text>
                  </View>
                  <Text className="text-xs font-medium" style={{ color: ds.color }}>◉ {ds.label}</Text>
                  <Text className="text-xs text-gray-400">{plant.daysToMaturity} days</Text>
                </View>
                <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                  Harvest: {plant.harvestWindow}
                </Text>
              </View>
              <Text className="text-gray-300 text-lg">›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text className="text-green-600 text-base">← Back</Text>
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">{selected.emoji} {selected.name}</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* Season + Difficulty badges */}
              <View className="flex-row gap-2 flex-wrap">
                {(() => {
                  const ss = SEASON_STYLES[selected.season];
                  const ds = DIFFICULTY_STYLES[selected.difficulty];
                  return (
                    <>
                      <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: ss.bg }}>
                        <Text className="text-sm font-semibold" style={{ color: ss.color }}>{ss.label}</Text>
                      </View>
                      <View className="px-3 py-1.5 rounded-xl bg-gray-50">
                        <Text className="text-sm font-semibold" style={{ color: ds.color }}>◉ {ds.label}</Text>
                      </View>
                      <View className="px-3 py-1.5 rounded-xl bg-gray-50">
                        <Text className="text-sm text-gray-600 font-medium">{selected.family}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Planting specs */}
              <View className="bg-gray-50 rounded-xl p-4">
                <Text className="text-sm font-bold text-gray-800 mb-3">Planting Specs</Text>
                <View className="gap-2">
                  {[
                    ["Planting Depth", selected.depthInches],
                    ["Spacing", selected.spacingInches],
                    ["Days to Maturity", selected.daysToMaturity + " days"],
                    ["Sun Required", selected.sunHours + " hrs/day"],
                    ["Soil pH", selected.soilPh],
                    ["Water Needs", WATER_LABELS[selected.waterNeeds]],
                    ["Feeding", FEEDING_LABELS[selected.feedingNeeds]],
                  ].map(([label, value]) => (
                    <View key={label} className="flex-row items-center">
                      <Text className="text-xs text-gray-500 w-36">{label}</Text>
                      <Text className="text-xs font-semibold text-gray-800 flex-1">{value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Zone 8b Planting Windows */}
              <View className="bg-blue-50 rounded-xl p-4">
                <Text className="text-sm font-bold text-blue-900 mb-3">Zone 8b Planting Windows</Text>
                <View className="gap-2">
                  {selected.startIndoors && (
                    <View className="flex-row items-start gap-2">
                      <Text className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-semibold">🏠 Indoors</Text>
                      <Text className="text-xs text-blue-800 flex-1">{selected.startIndoors}</Text>
                    </View>
                  )}
                  {selected.directSow && (
                    <View className="flex-row items-start gap-2">
                      <Text className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded font-semibold">🌱 Direct Sow</Text>
                      <Text className="text-xs text-green-800 flex-1">{selected.directSow}</Text>
                    </View>
                  )}
                  {selected.transplant && (
                    <View className="flex-row items-start gap-2">
                      <Text className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-semibold">🔄 Transplant</Text>
                      <Text className="text-xs text-purple-800 flex-1">{selected.transplant}</Text>
                    </View>
                  )}
                  <View className="flex-row items-start gap-2">
                    <Text className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-semibold">🌾 Harvest</Text>
                    <Text className="text-xs text-amber-800 flex-1">{selected.harvestWindow}</Text>
                  </View>
                </View>
              </View>

              {/* WSU Notes */}
              <View className="bg-green-50 border border-green-200 rounded-xl p-4">
                <Text className="text-xs font-bold text-green-800 mb-1">WSU Extension — Zone 8b Notes</Text>
                <Text className="text-sm text-green-700 leading-5">{selected.wsuNotes}</Text>
              </View>

              {/* Zone tip */}
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Text className="text-xs font-bold text-amber-800 mb-1">PNW Tip</Text>
                <Text className="text-sm text-amber-700">{selected.zoneTip}</Text>
              </View>

              {/* Companions */}
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">Companion Planting</Text>
                <View className="gap-2">
                  <View className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <Text className="text-xs font-semibold text-green-700 mb-1">✓ Good Companions</Text>
                    <Text className="text-sm text-green-800">{selected.goodCompanions.join(", ")}</Text>
                  </View>
                  <View className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <Text className="text-xs font-semibold text-red-600 mb-1">✗ Keep Away From</Text>
                    <Text className="text-sm text-red-700">{selected.badCompanions.join(", ")}</Text>
                  </View>
                </View>
              </View>

              {/* Common issues */}
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">Common Issues in Zone 8b</Text>
                <View className="gap-2">
                  <View className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <Text className="text-xs font-semibold text-orange-700 mb-1">🐛 Common Pests</Text>
                    <Text className="text-sm text-orange-800">{selected.commonPests.join(", ")}</Text>
                  </View>
                  <View className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                    <Text className="text-xs font-semibold text-purple-700 mb-1">🍄 Common Diseases</Text>
                    <Text className="text-sm text-purple-800">{selected.commonDiseases.join(", ")}</Text>
                  </View>
                </View>
              </View>

              {/* Add to Garden CTA */}
              {plots.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPlotPickerVisible(true)}
                  disabled={addingToPlot}
                  className="bg-green-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                >
                  {addingToPlot && <ActivityIndicator size="small" color="white" />}
                  <Text className="text-white font-bold text-base">
                    {addingToPlot ? "Adding…" : `+ Add ${selected.name} to Garden`}
                  </Text>
                </TouchableOpacity>
              )}

              <View className="h-4" />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Plot Picker Modal */}
      <Modal
        visible={plotPickerVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setPlotPickerVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <Text className="flex-1 text-base font-semibold text-gray-900">
              Add to which plot?
            </Text>
            <TouchableOpacity onPress={() => setPlotPickerVisible(false)}>
              <Text className="text-blue-600 text-sm font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {plots.map((plot) => (
              <TouchableOpacity
                key={plot.id}
                onPress={() => handleAddToPlot(plot.id)}
                className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100"
              >
                <View>
                  <Text className="text-sm font-semibold text-gray-900">{plot.name}</Text>
                  {plot.description && (
                    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{plot.description}</Text>
                  )}
                </View>
                <Text className="text-gray-400 text-base">→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
