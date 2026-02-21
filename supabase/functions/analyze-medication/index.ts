import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Extract mime type and raw base64 from data URL
    let mimeType = "image/jpeg";
    let rawBase64 = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medication identification assistant. Analyze the photo of a medication package and extract:
1. name - the brand/trade name of the medication (in Estonian if visible, otherwise the international name)
2. active_ingredient - the active ingredient in Latin (e.g. Paracetamolum, Ibuprofenum)
3. expiration_date - the expiration date in MM/YYYY format

Respond ONLY with a valid JSON object like: {"name": "...", "active_ingredient": "...", "expiration_date": "MM/YYYY"}
If you cannot identify the medication clearly, make your best guess based on what's visible. If the expiration date is not visible, use "12/2027" as a placeholder.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify this medication from the photo and return the JSON.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${rawBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse medication data from AI response");
    }

    const medication = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(medication), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
