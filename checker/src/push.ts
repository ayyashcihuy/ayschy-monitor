/**
 * Minimal Expo push sender — no SDK dependency, just the HTTP API.
 * https://docs.expo.dev/push-notifications/sending-notifications/#formatting-push-tickets
 */
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  accessToken?: string,
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    priority: "high",
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.error(`[push] Expo push API returned ${res.status}: ${await res.text()}`);
  }
}
