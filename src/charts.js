/**
 * Chart helpers shared by the sheets: one dark house style for every embedded chart.
 * Google rejects chartArea right/bottom; only left, top and backgroundColor are set.
 */

function percentBars_(color) {
  return {
    colors: [color],
    legend: { position: "none" },
    hAxis: { format: "percent", minValue: 0, maxValue: 1 },
  };
}

/** One chart in the house dark style; `spec` = { type, ranges, w, h, title, opts }. */
function insertDarkChart_(sh, spec, row, col, offsetX) {
  const axisText = { color: TH.muted, fontSize: 10 };
  const opts = spec.opts || {};
  const b = sh
    .newChart()
    .setChartType(spec.type)
    .setNumHeaders(1)
    .setPosition(row, col, offsetX, 0)
    .setOption("title", spec.title)
    .setOption("titleTextStyle", { color: TH.text, fontSize: 14, bold: true })
    .setOption("backgroundColor", TH.surface)
    .setOption("chartArea", { backgroundColor: TH.surface, left: 60, top: 56 })
    .setOption("legend", { position: "top", textStyle: axisText })
    .setOption(
      "hAxis",
      Object.assign(
        { textStyle: axisText, gridlines: { color: TH.grid } },
        opts.hAxis || {},
      ),
    )
    .setOption(
      "vAxis",
      Object.assign(
        { textStyle: axisText, gridlines: { color: TH.grid } },
        opts.vAxis || {},
      ),
    )
    .setOption("width", spec.w)
    .setOption("height", spec.h);
  spec.ranges.forEach((r) => b.addRange(r));
  Object.keys(opts).forEach((k) => {
    if (k === "hAxis" || k === "vAxis") return;
    b.setOption(
      k,
      k === "legend"
        ? Object.assign({ textStyle: axisText }, opts[k])
        : opts[k],
    );
  });
  sh.insertChart(b.build());
}
