/**
 * Netlify Scheduled Function (Runs every 5 minutes)
 * Invokes the secure CareNest missed-dose and care-plan escalation endpoint.
 */
export default async (req: Request) => {
  const siteUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const cronSecret = process.env.CRON_SECRET || "";

  try {
    const endpointUrl = `${siteUrl.replace(/\/$/, "")}/api/scheduler/process-escalations`;
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const data = await response.json();
    return new Response(JSON.stringify({ success: response.ok, data }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Netlify Scheduled Escalations Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  schedule: "*/5 * * * *",
};
