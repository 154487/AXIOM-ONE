import { Resend } from "resend";

// Lazy initialization — avoids build-time error when API key is not set yet
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "AXIOM ONE <onboarding@resend.dev>";
const APP_NAME = "AXIOM ONE";

// ─── Email templates ──────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="color:#ffffff;font-weight:700;font-size:20px;letter-spacing:2px;">${APP_NAME}</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#152030;border-radius:12px;border:1px solid #1E2D42;padding:40px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="color:#AAB2BD;font-size:12px;margin:0;">
                Este é um email automático do ${APP_NAME}. Não responda a esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

export async function sendPasswordChangedEmail({
  to,
  name,
  ip,
  userAgent,
}: {
  to: string;
  name?: string | null;
  ip?: string;
  userAgent?: string;
}) {
  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
    timeStyle: "short",
  });

  const displayName = name ?? to.split("@")[0];
  const deviceInfo = userAgent
    ? `<p style="color:#AAB2BD;font-size:14px;margin:0 0 4px 0;">Dispositivo: <span style="color:#ffffff;">${truncateUA(userAgent)}</span></p>`
    : "";
  const ipInfo = ip
    ? `<p style="color:#AAB2BD;font-size:14px;margin:0;">IP: <span style="color:#ffffff;">${ip}</span></p>`
    : "";

  const content = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Senha alterada</h1>
    <p style="color:#AAB2BD;font-size:15px;margin:0 0 28px 0;">
      Olá, ${displayName}. Sua senha foi alterada com sucesso.
    </p>

    <!-- Info block -->
    <div style="background:#1A2840;border-radius:8px;border:1px solid #1E2D42;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#AAB2BD;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">Detalhes da alteração</p>
      <p style="color:#AAB2BD;font-size:14px;margin:0 0 4px 0;">Data/hora: <span style="color:#ffffff;">${now}</span></p>
      ${deviceInfo}
      ${ipInfo}
    </div>

    <!-- Warning -->
    <div style="background:#EF444415;border-radius:8px;border:1px solid #EF444430;padding:18px 24px;margin-bottom:28px;">
      <p style="color:#EF4444;font-size:14px;font-weight:600;margin:0 0 6px 0;">⚠️ Não foi você?</p>
      <p style="color:#AAB2BD;font-size:14px;margin:0;">
        Se você não realizou esta alteração, sua conta pode estar comprometida.
        Entre em contato imediatamente e altere sua senha.
      </p>
    </div>

    <p style="color:#AAB2BD;font-size:13px;margin:0;">
      Se foi você quem fez a alteração, pode ignorar este email com segurança.
    </p>
  `;

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `🔐 Sua senha foi alterada — ${APP_NAME}`,
    html: baseLayout(content),
  });
}

export async function sendProfileUpdatedEmail({
  to,
  name,
  changes,
}: {
  to: string;
  name?: string | null;
  changes: { field: string; label: string }[];
}) {
  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
    timeStyle: "short",
  });

  const displayName = name ?? to.split("@")[0];
  const changesList = changes
    .map((c) => `<li style="color:#AAB2BD;font-size:14px;padding:4px 0;">${c.label}</li>`)
    .join("");

  const content = `
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Perfil atualizado</h1>
    <p style="color:#AAB2BD;font-size:15px;margin:0 0 28px 0;">
      Olá, ${displayName}. Seu perfil foi atualizado com sucesso.
    </p>

    <div style="background:#1A2840;border-radius:8px;border:1px solid #1E2D42;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#AAB2BD;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">Campos alterados</p>
      <ul style="margin:0;padding-left:18px;">${changesList}</ul>
      <p style="color:#AAB2BD;font-size:14px;margin:12px 0 0 0;">Data/hora: <span style="color:#ffffff;">${now}</span></p>
    </div>

    <div style="background:#EF444415;border-radius:8px;border:1px solid #EF444430;padding:18px 24px;">
      <p style="color:#EF4444;font-size:14px;font-weight:600;margin:0 0 6px 0;">⚠️ Não foi você?</p>
      <p style="color:#AAB2BD;font-size:14px;margin:0;">
        Se você não reconhece essa alteração, entre em contato imediatamente.
      </p>
    </div>
  `;

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `📝 Seu perfil foi atualizado — ${APP_NAME}`,
    html: baseLayout(content),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateUA(ua: string): string {
  // Simplify user-agent to something readable
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 60);
}
