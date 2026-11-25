const analyticsNumber = new Intl.NumberFormat();
const chartColors = {
  residents: "#276a45",
  requests: "#d19b00",
  concerns: "#5277b8"
};

function monthLabel(month, includeYear = false) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {}),
    timeZone: "UTC"
  });
}

function formatComparison(current, previous) {
  const difference = current - previous;
  if (difference === 0) return `No change from ${analyticsNumber.format(previous)} last month`;
  const direction = difference > 0 ? "more" : "fewer";
  return `${analyticsNumber.format(Math.abs(difference))} ${direction} than last month (${analyticsNumber.format(previous)})`;
}

function drawChart(monthly) {
  const svg = document.getElementById("analyticsChart");
  const namespace = "http://www.w3.org/2000/svg";
  const width = 840;
  const height = 360;
  const margin = { top: 24, right: 24, bottom: 56, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const series = [
    { key: "residents", label: "Residents" },
    { key: "requests", label: "Service requests" },
    { key: "concerns", label: "Concerns" }
  ];
  const maximum = Math.max(1, ...monthly.flatMap(item =>
    series.map(line => Number(item[line.key]) || 0)
  ));
  const axisMaximum = Math.ceil(maximum / 5) * 5 || 1;

  function append(tag, attributes, text) {
    const element = document.createElementNS(namespace, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    if (text !== undefined) element.textContent = text;
    svg.appendChild(element);
    return element;
  }

  svg.replaceChildren();
  for (let tick = 0; tick <= 5; tick += 1) {
    const value = axisMaximum * (5 - tick) / 5;
    const y = margin.top + plotHeight * tick / 5;
    append("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: "chart-gridline" });
    append("text", { x: margin.left - 10, y: y + 4, "text-anchor": "end", class: "chart-axis-label" },
      analyticsNumber.format(value));
  }

  const pointsFor = (index, value) => ({
    x: monthly.length < 2
      ? margin.left + plotWidth / 2
      : margin.left + plotWidth * index / (monthly.length - 1),
    y: margin.top + plotHeight * (1 - (Number(value) || 0) / axisMaximum)
  });

  series.forEach(line => {
    const points = monthly.map((item, index) => pointsFor(index, item[line.key]));
    append("polyline", {
      points: points.map(point => `${point.x},${point.y}`).join(" "),
      class: `chart-line chart-line-${line.key}`,
      "aria-label": line.label
    });
    points.forEach((point, index) => {
      const circle = append("circle", {
        cx: point.x,
        cy: point.y,
        r: 4,
        class: `chart-point chart-point-${line.key}`,
        tabindex: 0,
        "aria-label": `${line.label}, ${monthLabel(monthly[index].month, true)}: ${analyticsNumber.format(monthly[index][line.key])}`
      });
      const title = document.createElementNS(namespace, "title");
      title.textContent = `${line.label}: ${analyticsNumber.format(monthly[index][line.key])}`;
      circle.appendChild(title);
    });
  });

  monthly.forEach((item, index) => {
    const x = pointsFor(index, 0).x;
    append("text", { x, y: height - 20, "text-anchor": "middle", class: "chart-axis-label" },
      monthLabel(item.month));
  });
}

async function loadAnalytics() {
  const message = document.getElementById("analyticsMessage");
  try {
    const [adminResponse, analyticsResponse] = await Promise.all([
      fetch("/api/admin-auth/me"),
      fetch("/api/analytics/monthly")
    ]);

    if (adminResponse.status === 401 || analyticsResponse.status === 401) {
      return (location.href = "/admin/login.html");
    }

    const [adminData, data] = await Promise.all([
      adminResponse.json(),
      analyticsResponse.json()
    ]);
    if (!adminResponse.ok) throw new Error(adminData.message || "Unable to load admin account.");
    if (!analyticsResponse.ok) throw new Error(data.message || "Unable to load monthly analytics.");

    document.getElementById("adminName").textContent = adminData.admin.fullName;
    document.getElementById("analyticsPeriod").textContent =
      `${monthLabel(data.currentMonth, true)} compared with ${monthLabel(data.previousMonth, true)}`;
    document.getElementById("residentTotal").textContent =
      analyticsNumber.format(data.summary.residents.current);
    document.getElementById("residentComparison").textContent =
      formatComparison(data.summary.residents.current, data.summary.residents.previous);
    document.getElementById("requestTotal").textContent =
      analyticsNumber.format(data.summary.requests.current);
    const topService = document.getElementById("topService");
    topService.textContent = data.mostRequestedService
      ? `Most requested: ${data.mostRequestedService.name} (${analyticsNumber.format(data.mostRequestedService.requests)})`
      : "No service requests this month";
    document.getElementById("concernTotal").textContent =
      analyticsNumber.format(data.summary.concerns.current);
    document.getElementById("concernComparison").textContent =
      formatComparison(data.summary.concerns.current, data.summary.concerns.previous);

    drawChart(data.monthly);
  } catch (error) {
    console.error("Unable to load monthly analytics.", error);
    message.textContent = error.message || "Unable to load monthly analytics.";
    message.classList.add("error");
  }
}

document.getElementById("logoutButton").addEventListener("click", async () => {
  const response = await fetch("/api/admin-auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Unable to log out.");
  location.replace("/");
});

loadAnalytics();
