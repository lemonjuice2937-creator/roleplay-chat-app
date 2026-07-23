import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    chat_id: string;
    sender_id: string;
    texto: string;
    created_at: string;
    papel_id: string | null;
  };
  old_record: null;
}

interface DeviceToken {
  token: string;
  platform: "android" | "ios" | "web";
}

interface ChatParticipant {
  user1_id: string;
  user2_id: string;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "mensagens") {
      return new Response(JSON.stringify({ message: "Ignorado" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { chat_id, sender_id, texto } = payload.record;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("user1_id, user2_id")
      .eq("id", chat_id)
      .single();

    if (chatError || !chat) {
      console.error("Erro ao buscar chat:", chatError);
      return new Response(JSON.stringify({ error: "Chat não encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const recipientId =
      (chat as ChatParticipant).user1_id === sender_id
        ? (chat as ChatParticipant).user2_id
        : (chat as ChatParticipant).user1_id;

    const { data: tokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", recipientId);

    if (tokensError || !tokens || tokens.length === 0) {
      console.log("Nenhum token encontrado para o destinatário:", recipientId);
      return new Response(
        JSON.stringify({ message: "Sem tokens para notificar" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { data: senderProfile } = await supabase
      .from("usuarios")
      .select("display_name")
      .eq("id", sender_id)
      .single();

    const senderName = senderProfile?.display_name || "Alguém";

    const firebaseServiceAccount = JSON.parse(
      Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!
    );

    const accessToken = await getAccessToken(firebaseServiceAccount);

    const projectId = firebaseServiceAccount.project_id;

    const results = await Promise.allSettled(
      tokens.map(async (t: DeviceToken) => {
        const message = {
          message: {
            token: t.token,
            notification: {
              title: senderName,
              body: `${senderName} te mandou uma nova mensagem!`,
            },
            data: {
              chat_id,
              sender_id,
              type: "new_message",
            },
            android: {
              priority: "high" as const,
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                },
              },
            },
          },
        };

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("Erro FCM:", result);
          if (
            result.error?.code === 404 ||
            result.error?.message?.includes("NOT_FOUND") ||
            result.error?.message?.includes("RegisteredToken")
          ) {
            await supabase
              .from("device_tokens")
              .delete()
              .eq("token", t.token);
            console.log("Token inválido removido:", t.token);
          }
        }

        return result;
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value?.message
    ).length;
    const failed = results.length - successful;

    return new Response(
      JSON.stringify({
        message: "Push notifications enviadas",
        successful,
        failed,
        total: results.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Erro na edge function:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
  };

  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const keyData = serviceAccount.private_key.replace(
    /-----BEGIN PRIVATE KEY-----\n?|\n?-----END PRIVATE KEY-----\n?/g,
    ""
  );
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    throw new Error("Falha ao obter access token: " + JSON.stringify(tokenData));
  }

  return tokenData.access_token;
}
