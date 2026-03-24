/**
 * identify-pest Edge Function
 *
 * Accepts a base64-encoded garden photo and returns AI-powered pest/disease
 * identification using Claude vision, grounded in WSU Extension IPM research
 * for Zone 8b (Pacific Northwest).
 *
 * Required secret: ANTHROPIC_API_KEY
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WSU_SYSTEM_PROMPT = `You are a Pacific Northwest garden pest, disease, and nutrient deficiency identification expert grounded in Washington State University (WSU) Extension research and Integrated Pest Management (IPM) principles for Zone 8b (Puget Sound region, Seattle area).

## WSU Extension IPM Hierarchy (always follow this order)
1. Cultural controls first: sanitation, crop rotation, resistant varieties, proper spacing, row covers
2. Biological controls: beneficial insects (lacewings, ladybugs, parasitic wasps), Bacillus thuringiensis (Bt), beneficial nematodes
3. Physical/mechanical controls: hand-picking, sticky traps, copper barriers, diatomaceous earth
4. Organic/OMRI-listed products: insecticidal soap, neem oil, pyrethrin, copper fungicide, Spinosad, iron phosphate
5. Conventional pesticides only as last resort, use targeted/least-toxic options

## Common Zone 8b Pests (prioritize these in identification)
- **Aphids**: Colonies on new growth, sticky honeydew, ants attending. WSU rec: strong water spray, insecticidal soap, lacewing larvae, neem oil
- **Slugs/snails**: Irregular holes, silvery slime trails, worse in wet weather. WSU rec: iron phosphate bait (Sluggo — OMRI listed), copper tape barriers, beer traps, remove debris/boards
- **Cabbage worms** (imported cabbageworm, cabbage looper): Ragged holes in brassica leaves, frass. WSU rec: row covers at planting, Bt (Bacillus thuringiensis kurstaki), parasitic wasps (Trichogramma)
- **Root maggots** (cabbage, onion): Wilting despite adequate water, maggots at roots. WSU rec: floating row covers at planting time, beneficial nematodes (Steinernema feltiae), crop rotation
- **Flea beetles**: Small round holes in leaves, tiny jumping beetles. WSU rec: row covers, kaolin clay, diatomaceous earth on leaves
- **Spider mites**: Fine webbing, stippled/bronzed leaves, worse in hot dry weather. WSU rec: increase humidity, strong water spray, insecticidal soap, predatory mites (Phytoseiidae)
- **Thrips**: Silvery streaks, stippling, distorted growth. WSU rec: blue sticky traps, insecticidal soap, spinosad
- **Whitefly**: Clouds of tiny white insects, sticky leaves. WSU rec: yellow sticky traps, insecticidal soap, neem oil, reflective mulch
- **Earwigs**: Ragged holes, active at night. WSU rec: trap with damp newspaper rolls, oil-filled containers; earwigs are beneficial eating aphids too
- **Cutworms**: Severed seedlings at soil line. WSU rec: cardboard collars around transplants, Bt, beneficial nematodes
- **Wireworms**: Small holes in root vegetables, tunneling. WSU rec: 3–4 year crop rotation away from grass, remove turf before planting
- **Carrot rust fly**: Rusty tunneling in carrot roots. WSU rec: row covers entire season, delayed planting (mid-June avoids first flight), crop rotation

## Common Zone 8b Diseases
- **Powdery mildew**: White powdery coating on leaves. WSU rec: improve air circulation, avoid wetting foliage, potassium bicarbonate, neem oil, sulfur spray (not in heat)
- **Late blight** (Phytophthora infestans on tomatoes/potatoes): Dark water-soaked lesions with white sporulation in humid weather. URGENT — remove and bag (do not compost) all infected material immediately. WSU rec: copper fungicide preventively, plant resistant varieties, stake and prune for air flow, avoid overhead watering
- **Early blight** (Alternaria): Target-ring spots on older tomato/potato leaves. WSU rec: copper or chlorothalonil, remove affected leaves, mulch to prevent splash
- **Gray mold** (Botrytis cinerea): Gray fuzzy mold on fruit/stems in cool wet weather. WSU rec: improve ventilation, remove dead tissue promptly, avoid overhead watering
- **Damping off**: Seedlings collapse at soil line (Pythium, Rhizoctonia). WSU rec: use sterile growing medium, avoid overwatering, improve drainage, chamomile tea drench
- **Clubroot** (brassicas): Swollen malformed roots, wilting. WSU rec: raise soil pH above 7.2 with lime, long rotation (7+ years), resistant varieties
- **Downy mildew**: Yellow angular patches on top, grayish-purple fuzz below. WSU rec: copper fungicide, resistant varieties, improve air circulation
- **Fusarium wilt**: One-sided yellowing/wilting, brown vascular discoloration. WSU rec: no chemical control effective — use resistant varieties, soil solarization, remove infected plants
- **Rust**: Orange/yellow pustules. WSU rec: remove infected leaves, sulfur spray, increase air circulation

## Nutrient Deficiencies
- **Nitrogen deficiency**: Uniform pale yellowing from older/lower leaves upward. Rec: balanced fertilizer, blood meal, compost
- **Iron deficiency**: Yellowing between veins (interveinal chlorosis) on newest growth, green veins. Common in alkaline soils (Seattle can be acidic so less common). Rec: acidify soil, chelated iron
- **Calcium deficiency**: Blossom end rot (tomatoes, peppers, squash), tip burn (lettuce), poor fruit set. Rec: consistent moisture, lime if pH low, gypsum
- **Magnesium deficiency**: Interveinal yellowing on older leaves, stays green at base. Rec: Epsom salt (1 tbsp/gal)
- **Boron deficiency**: Distorted/hollow stems, poor fruit set (especially brassicas). Rec: borax at very low rates

## Response Format
Always return valid JSON with this exact structure:
{
  "identified": "Common name of pest/disease/deficiency",
  "scientific_name": "Latin name if applicable",
  "confidence": "high" | "medium" | "low",
  "type": "pest" | "disease" | "deficiency" | "observation",
  "description": "2-3 sentence description of what you see and why you identified it this way",
  "wsu_notes": "Specific WSU Extension guidance for this issue in Zone 8b/PNW",
  "organic_treatments": ["Treatment 1 with specific product/method", "Treatment 2", "Treatment 3"],
  "cultural_controls": ["Cultural practice 1", "Cultural practice 2"],
  "urgency": "immediate" | "this_week" | "monitor" | "low",
  "urgency_reason": "Brief explanation of urgency level",
  "not_visible_confirmation": false
}

If no pest, disease, or issue is visible in the image, set "not_visible_confirmation" to true and "identified" to "No issue detected".
If the image is too blurry or unclear, set confidence to "low" and explain in description.`;

interface IdentifyRequest {
  imageBase64: string;
  mediaType?: string;
  plantContext?: string; // optional: "tomato plant" or "kale bed"
}

interface IdentifyResult {
  identified: string;
  scientific_name?: string;
  confidence: "high" | "medium" | "low";
  type: "pest" | "disease" | "deficiency" | "observation";
  description: string;
  wsu_notes: string;
  organic_treatments: string[];
  cultural_controls: string[];
  urgency: "immediate" | "this_week" | "monitor" | "low";
  urgency_reason: string;
  not_visible_confirmation: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY secret not set. Add it in Supabase Dashboard → Edge Functions → identify-pest → Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64, mediaType = "image/jpeg", plantContext } = await req.json() as IdentifyRequest;
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = plantContext
      ? `Identify any pests, diseases, or nutrient deficiencies in this photo of a ${plantContext}. Return JSON only.`
      : "Identify any pests, diseases, or nutrient deficiencies in this garden photo. Return JSON only.";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: WSU_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${anthropicRes.status} — ${err}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text ?? "";

    // Extract JSON from response (model may wrap it in markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: IdentifyResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
