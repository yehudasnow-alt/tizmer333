/*
 * GET /api/ical?listing=<id>&unit=<roomId>
 * יומן iCal של התאריכים שסומנו כתפוסים באתר (ידנית ע"י המארח/המנהל),
 * להדבקה ב-Booking / Airbnb / אתרים אחרים כדי שיחסמו אותם גם שם.
 * תאריכים שהגיעו מסנכרון של אתר אחר לא מיוצאים בחזרה, כדי לא ליצור לולאה.
 */
import { send, requireEnv, db, isoAdd, todayIL } from "./_lib.js";

const ymd = (iso) => iso.replace(/-/g, "");
const fold = (line) => {
  /* RFC 5545: שורות עד 75 בתים */
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
};
const text = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export default async function handler(req, res) {
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) return;
  const listing = String(req.query.listing || "").slice(0, 64);
  const unit = String(req.query.unit || "").slice(0, 64);
  if (!listing) return send(res, 400, "missing listing");
  try {
    const rows = await db(`listings?select=id,name,blocked_dates,rooms&id=eq.${encodeURIComponent(listing)}`);
    const l = rows[0];
    if (!l) return send(res, 404, "not found");
    let dates = l.blocked_dates || [];
    let label = l.name;
    if (unit) {
      const r = (Array.isArray(l.rooms) ? l.rooms : []).find((x) => x && x.id === unit);
      if (!r) return send(res, 404, "unit not found");
      dates = r.blocked_dates || [];
      label = `${l.name} – ${r.name || unit}`;
    }
    const from = isoAdd(todayIL(), -30);
    const nights = [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= from))].sort();

    /* לילות רצופים → אירוע אחד (DTEND = יום העזיבה, לא כולל) */
    const ranges = [];
    for (const d of nights) {
      const last = ranges[ranges.length - 1];
      if (last && last.end === d) last.end = isoAdd(d, 1);
      else ranges.push({ start: d, end: isoAdd(d, 1) });
    }
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tamara//Zimmers//HE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      fold("X-WR-CALNAME:" + text(label)), "X-WR-TIMEZONE:Asia/Jerusalem"
    ];
    for (const r of ranges) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${l.id}-${unit || "main"}-${ymd(r.start)}@tamara`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(r.start)}`,
        `DTEND;VALUE=DATE:${ymd(r.end)}`,
        "SUMMARY:Not available",
        "TRANSP:OPAQUE",
        "END:VEVENT"
      );
    }
    lines.push("END:VCALENDAR");
    return send(res, 200, lines.join("\r\n") + "\r\n", {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="tamara-${l.id}${unit ? "-" + unit : ""}.ics"`,
      "Cache-Control": "public, s-maxage=900, max-age=300"
    });
  } catch (e) {
    return send(res, 500, String(e.message || e).slice(0, 200));
  }
}
