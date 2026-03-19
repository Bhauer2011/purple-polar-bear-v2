export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(value, options = {}) {
  if (!value) {
    return "Date TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options
  });
}

export function formatTimeRange(value, durationHours = 3) {
  if (!value) {
    return "Time TBD";
  }

  const start = new Date(value);
  if (Number.isNaN(start.getTime())) {
    return "Time TBD";
  }

  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  const formatOptions = {
    hour: "numeric",
    minute: "2-digit"
  };

  return `${start.toLocaleTimeString("en-US", formatOptions)} - ${end.toLocaleTimeString("en-US", formatOptions)}`;
}

export function formatMoney(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return "$0.00";
  }

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

export function groupByCategory(items) {
  return items.reduce((groups, item) => {
    const key = item.category || "Favorites";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

export function isUpcomingEvent(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return date.getTime() >= Date.now();
}

export function stars(rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)}`;
}

export function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
