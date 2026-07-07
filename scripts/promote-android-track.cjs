/* Mirrors the current release on one Google Play track onto another WITHOUT
 * re-uploading the AAB. Google Play rejects a duplicate versionCode, so you can't
 * `eas submit` the same build to two tracks; instead we read the source track's
 * active versionCode(s) and assign them to the target track as a completed release.
 *
 * Used by the Android release workflow to publish one build to both the Groups and
 * Alpha closed-testing tracks. Node 18+ only (global fetch / crypto).
 *
 * Usage:
 *   node scripts/promote-android-track.cjs --from Groups --to alpha
 * Options (with defaults):
 *   --from Groups   source track to copy the release from
 *   --to alpha      target track to publish the same versionCode to
 *   --package org.vasilyoshev.selftend
 *   --key .secrets/google-play-service-account.json
 */
const fs = require("fs");
const crypto = require("crypto");

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const FROM = arg("from", "Groups");
const TO = arg("to", "alpha");
const PKG = arg("package", "org.vasilyoshev.selftend");
const KEY_PATH = arg("key", ".secrets/google-play-service-account.json");
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function makeJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  return `${signingInput}.${b64url(signer.sign(sa.private_key))}`;
}

async function req(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  if (!fs.existsSync(KEY_PATH)) throw new Error(`Service-account key not found at ${KEY_PATH}`);
  const sa = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: makeJwt(sa),
    }),
  });
  const token = (await tokenRes.json()).access_token;
  if (!token) throw new Error("Failed to obtain access token from Google");

  const edit = await req(`${API}/${PKG}/edits`, token, { method: "POST" });
  console.log(`Opened edit ${edit.id} for ${PKG}`);

  try {
    const source = await req(`${API}/${PKG}/edits/${edit.id}/tracks/${encodeURIComponent(FROM)}`, token);
    const codes = (source.releases || []).flatMap((r) => r.versionCodes || []).map(Number).filter(Boolean);
    if (!codes.length) {
      throw new Error(`Track "${FROM}" has no active release with a versionCode to copy.`);
    }
    const versionCode = String(Math.max(...codes));
    const name = (source.releases || []).find((r) => (r.versionCodes || []).includes(versionCode))?.name;
    console.log(`Source track "${FROM}" → versionCode ${versionCode}${name ? ` ("${name}")` : ""}`);

    const release = { status: "completed", versionCodes: [versionCode], ...(name ? { name } : {}) };
    await req(`${API}/${PKG}/edits/${edit.id}/tracks/${encodeURIComponent(TO)}`, token, {
      method: "PUT",
      body: JSON.stringify({ track: TO, releases: [release] }),
    });
    console.log(`Assigned versionCode ${versionCode} to track "${TO}" (completed)`);

    await req(`${API}/${PKG}/edits/${edit.id}:commit`, token, { method: "POST" });
    console.log(`✓ Committed. "${TO}" now mirrors "${FROM}" at versionCode ${versionCode}.`);
  } catch (err) {
    await req(`${API}/${PKG}/edits/${edit.id}`, token, { method: "DELETE" }).catch(() => {});
    throw err;
  }
}

main().catch((e) => {
  console.error("PROMOTE FAILED:", e.message);
  process.exit(1);
});
