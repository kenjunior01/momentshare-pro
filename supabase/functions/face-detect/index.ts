import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { photo_id, action } = await req.json();

    if (action === "detect") {
      // 1. Mark photo as processing
      await supabase.from("photos").update({ face_detection: "processing" }).eq("id", photo_id);

      // 2. In production: call face detection API (face-api.js, AWS Rekognition, etc.)
      // 3. For each detected face, insert into face_detections with embedding
      // 4. Cluster faces using cosine similarity (pgvector)
      // 5. Update photo face_count and detection status

      return new Response(JSON.stringify({ success: true, photo_id, status: "queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      // Find similar faces for a given embedding
      const { event_id, embedding, threshold = 0.6 } = await req.json();

      const { data, error } = await supabase.rpc("find_similar_faces", {
        query_embedding: embedding,
        event_id_param: event_id,
        threshold,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ matches: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
