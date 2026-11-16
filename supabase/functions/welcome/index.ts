// JeFIT — Fonction Supabase « welcome » : tous les mails de l'app, envoyés via Resend.
//   action "welcome"       : mail de bienvenue avec le nom d'utilisateur (une fois par adresse)
//   action "changed"       : mail « ton mot de passe a été modifié »
//   action "reset-request" : envoie un code à 6 chiffres pour « mot de passe oublié »
//   action "reset-confirm" : vérifie le code et change le mot de passe
// À coller dans Supabase › Edge Functions › welcome › Code, puis Deploy.
// Réglages : « Verify JWT » DÉSACTIVÉ (la fonction vérifie elle-même la connexion).
// Secret requis (Edge Functions › Secrets) : RESEND_API_KEY = la clé « re_… » de Resend.
// La clé Resend ne doit JAMAIS être mise dans index.html.

const APP_URL = "https://jeremyrosa1722038.github.io/JeFIT/";
const FROM = "JeFIT <onboarding@resend.dev>"; // à remplacer quand vous aurez votre propre domaine
const DOMAIN = "@jefit.app"; // e-mails techniques des comptes JeFIT (nom.utilisateur@jefit.app)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const isMail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const mask = (m: string) => m.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + "•".repeat(Math.min(b.length, 6)) + c);
const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" });

const SB = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { return ""; } })();
const RK = Deno.env.get("RESEND_API_KEY");
const admin = (path: string, init: RequestInit = {}) =>
  fetch(SB + "/auth/v1/admin" + path, {
    ...init,
    headers: { Authorization: "Bearer " + SR, apikey: SR, "Content-Type": "application/json" },
  });

/* ---------- Mise en page commune des mails ---------- */
const BTN = "display:inline-block;background:#ff5a1f;background-image:linear-gradient(135deg,#ff8a00,#ff3d2e);color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:15px 34px;border-radius:14px";
function shell(title: string, inner: string, foot: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#0b0b0f;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:28px 12px">
<tr><td align="center">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#15151c;border-radius:22px;overflow:hidden;border:1px solid #26262f">
  <tr><td style="background:#ff5a1f;background-image:linear-gradient(135deg,#ff8a00,#ff3d2e);padding:34px 28px 30px;text-align:center">
    <div style="font-size:44px;font-weight:900;font-style:italic;letter-spacing:1px;color:#ffffff">JEF<span style="opacity:.85">I</span>T</div>
    <div style="margin-top:6px;color:#fff3ea;font-size:13px;letter-spacing:3px;text-transform:uppercase">Prêt à transpirer ?</div>
  </td></tr>
  ${inner}
  <tr><td style="padding:18px 28px;border-top:1px solid #26262f;text-align:center;color:#6f6f7a;font-size:12px;line-height:1.5">${foot}</td></tr>
 </table>
</td></tr></table></body></html>`;
}
const box = (label: string, value: string, big = false) => `
  <tr><td style="padding:6px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f1712;border:1px solid #4a2a17;border-radius:14px">
      <tr><td style="padding:16px 18px;text-align:center">
        <div style="color:#ff9a5c;font-size:12px;letter-spacing:2px;text-transform:uppercase">${label}</div>
        <div style="margin-top:6px;color:#ffffff;font-weight:900;font-size:${big ? "34px;letter-spacing:8px" : "22px"}">${value}</div>
      </td></tr>
    </table>
  </td></tr>`;
const para = (h: string, p: string) => `
  <tr><td style="padding:30px 28px 10px">
    <h1 style="margin:0 0 10px;color:#ffffff;font-size:25px">${h}</h1>
    <p style="margin:0;color:#c9c9d1;font-size:15px;line-height:1.6">${p}</p>
  </td></tr>`;
const button = (t: string) => `<tr><td align="center" style="padding:22px 28px 30px"><a href="${APP_URL}" style="${BTN}">${t}</a></td></tr>`;

function welcomeMail(name: string) {
  const n = esc(name || "champion");
  const step = (ico: string, t: string, d: string) => `
    <tr><td style="padding:9px 0">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:44px;height:44px;border-radius:12px;background:#2a1a10;text-align:center;font-size:22px;line-height:44px">${ico}</td>
        <td style="padding-left:14px"><div style="font-weight:700;color:#ffffff;font-size:15px">${t}</div>
          <div style="color:#a9a9b3;font-size:13px;line-height:1.45">${d}</div></td>
      </tr></table>
    </td></tr>`;
  return shell("Bienvenue sur JeFIT",
    para(`Bienvenue ${n} ! 💪`, "Ton compte JeFIT est prêt. Tes séances, tes programmes et ta progression sont sauvegardés en ligne : connecte-toi sur ton téléphone, ta tablette ou ton ordinateur, tout te suit.") +
    box("Ton nom d’utilisateur", n) +
    `<tr><td style="padding:4px 28px 0;text-align:center;color:#8a8a95;font-size:12px">Pour te connecter : ce nom + ton mot de passe (jamais envoyé par mail).</td></tr>
     <tr><td style="padding:16px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step("🏋️", "Choisis un programme", "Musculation, Lafay, calisthénie, abdos, HYROX, corde à sauter…")}
      ${step("📈", "Suis ta progression", "Tes charges et répétitions précédentes s’affichent à chaque série.")}
      ${step("☁️", "Partout avec toi", "Synchronisation automatique entre tous tes appareils.")}
     </table></td></tr>` +
    button("Ouvrir JeFIT"),
    "Tu reçois ce mail car un compte JeFIT a été créé avec cette adresse.<br>Bon entraînement ! — L’équipe JeFIT");
}
function changedMail(name: string) {
  return shell("Mot de passe modifié",
    para("Mot de passe modifié 🔐", `Bonjour ${esc(name || "")}, le mot de passe de ton compte JeFIT vient d’être changé.`) +
    box("Compte", esc(name || "")) +
    box("Date", esc(DATE.format(new Date()))) +
    `<tr><td style="padding:16px 28px 0;color:#c9c9d1;font-size:14px;line-height:1.6">Sur tes autres appareils, connecte-toi avec le <b style="color:#fff">nouveau</b> mot de passe.<br><br>
      <b style="color:#ff9a5c">Ce n’est pas toi ?</b> Ouvre JeFIT, touche « Mot de passe oublié ? » et choisis-en un nouveau tout de suite.</td></tr>` +
    button("Ouvrir JeFIT"),
    "Mail de sécurité automatique — L’équipe JeFIT");
}
function codeMail(name: string, code: string) {
  return shell("Ton code JeFIT",
    para("Mot de passe oublié ?", `Bonjour ${esc(name || "")}, voici ton code pour choisir un nouveau mot de passe. Il est valable <b style="color:#fff">15 minutes</b>.`) +
    box("Ton code", code, true) +
    box("Nom d’utilisateur", esc(name || "")) +
    `<tr><td style="padding:16px 28px 30px;color:#8a8a95;font-size:13px;line-height:1.6;text-align:center">Saisis ce code dans JeFIT. Si tu n’as rien demandé, ignore ce mail : ton mot de passe ne change pas.</td></tr>`,
    "Mail de sécurité automatique — L’équipe JeFIT");
}

async function send(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RK, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error("Resend : " + (await r.text()));
}
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// Retrouve un compte par son e-mail technique (nom@jefit.app)
async function findUser(email: string) {
  for (let p = 1; p <= 20; p++) {
    const r = await admin(`/users?page=${p}&per_page=200&filter=${encodeURIComponent(email)}`);
    if (!r.ok) throw new Error("admin " + r.status);
    const users = ((await r.json()).users || []) as any[];
    const u = users.find((x) => String(x.email || "").toLowerCase() === email);
    if (u) return u;
    if (users.length < 200) return null;
  }
  return null;
}
async function caller(req: Request) {
  const u = await fetch(SB + "/auth/v1/user", { headers: { Authorization: req.headers.get("Authorization") || "", apikey: SR } });
  return u.ok ? await u.json() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST uniquement" }, 405);
  try {
    if (!RK) return json({ error: "Secret RESEND_API_KEY manquant" }, 500);
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || "welcome");

    /* ----- Actions d'un utilisateur connecté ----- */
    if (action === "welcome" || action === "changed") {
      const user = await caller(req);
      if (!user) return json({ error: "Non connecté" }, 401);
      const md = user.user_metadata || {};
      const to = String(md.contact_email || "").trim();
      if (!isMail(to)) return json({ error: "Aucun e-mail sur ce compte" }, 400);
      if (action === "changed") {
        await send(to, "Ton mot de passe JeFIT a été modifié 🔐", changedMail(md.name));
        return json({ ok: true });
      }
      if (md.welcome_sent === to) return json({ ok: true, already: true }); // une seule fois par adresse
      await send(to, "Bienvenue sur JeFIT 💪", welcomeMail(md.name));
      await admin("/users/" + user.id, { method: "PUT", body: JSON.stringify({ user_metadata: { welcome_sent: to } }) });
      return json({ ok: true });
    }

    /* ----- Mot de passe oublié (sans être connecté) ----- */
    if (action === "reset-request" || action === "reset-confirm") {
      const email = String(b.email || "").toLowerCase().trim();
      if (!email.endsWith(DOMAIN)) return json({ error: "Compte invalide" }, 400);
      const user = await findUser(email);
      if (!user) return json({ error: "Aucun compte en ligne avec ce nom.", code: "nouser" }, 404);
      const md = user.user_metadata || {}, am = user.app_metadata || {};
      const to = String(md.contact_email || "").trim();
      const now = Date.now();

      if (action === "reset-request") {
        if (!isMail(to)) return json({ error: "Aucun e-mail n’est lié à ce compte.", code: "nomail" }, 400);
        if (am.rst && now - (am.rst.at || 0) < 60_000) return json({ error: "Patiente une minute avant de redemander un code.", code: "wait" }, 429);
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
        await admin("/users/" + user.id, {
          method: "PUT",
          body: JSON.stringify({ app_metadata: { rst: { h: await sha(code + user.id), exp: now + 15 * 60_000, at: now, n: 0 } } }),
        });
        await send(to, `Ton code JeFIT : ${code}`, codeMail(md.name, code));
        return json({ ok: true, to: mask(to) });
      }

      // reset-confirm
      const code = String(b.code || "").replace(/\D/g, ""), pw = String(b.password || "");
      const r = am.rst;
      if (!r || now > r.exp) return json({ error: "Code expiré : redemande un nouveau code.", code: "expired" }, 400);
      if ((r.n || 0) >= 5) return json({ error: "Trop d’essais : redemande un nouveau code.", code: "expired" }, 400);
      if (pw.length < 6) return json({ error: "Le mot de passe doit faire au moins 6 caractères." }, 400);
      if ((await sha(code + user.id)) !== r.h) {
        await admin("/users/" + user.id, { method: "PUT", body: JSON.stringify({ app_metadata: { rst: { ...r, n: (r.n || 0) + 1 } } }) });
        return json({ error: `Code incorrect (${4 - (r.n || 0)} essai(s) restant(s)).`, code: "badcode" }, 400);
      }
      const up = await admin("/users/" + user.id, { method: "PUT", body: JSON.stringify({ password: pw, app_metadata: { rst: null } }) });
      if (!up.ok) return json({ error: "Changement impossible : " + (await up.text()) }, 500);
      if (isMail(to)) await send(to, "Ton mot de passe JeFIT a été modifié 🔐", changedMail(md.name)).catch(() => {});
      return json({ ok: true, name: md.name || "" });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
