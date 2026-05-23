const dateStr = "2026-05-22 05:32:20 PM";

const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
if (match) {
  const [_, y, m, d, h, min, s, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  const isoString = `${y}-${m}-${d}T${hours.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}+08:00`;
  const time = new Date(isoString).getTime();
  console.log(isoString, time, new Date(time).toUTCString());
}
