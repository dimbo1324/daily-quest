/**
 * Styling of the Schedule sheet: the block table, «Today», the summary, hidden helpers and
 * the conditional formats (current block, overlaps, one-off dates).
 */

function styleSchedule_(sh) {
  const S = SCHEDULE;
  baseStyle_(sh);
  const rows = sh.getMaxRows() - 1;
  const data = sh.getRange(2, 1, rows, S.COLS);
  headerStyle_(sh.getRange(1, 1, 1, S.COLS));
  gridLines_(data);
  sh.getRange(2, S.DAYS, rows, 1)
    .setHorizontalAlignment("center")
    .setFontColor(TH.muted);
  sh.getRange(2, S.START, rows, 2)
    .setHorizontalAlignment("center")
    .setFontColor(TH.accent);
  sh.getRange(2, S.ACT, rows, 1).setFontColor(TH.text);
  sh.getRange(2, S.XP, rows, 1)
    .setHorizontalAlignment("center")
    .setFontColor(TH.green)
    .setFontWeight("bold");
  sh.getRange(2, S.DUR, rows, 1)
    .setHorizontalAlignment("center")
    .setFontColor(TH.dim);
  sh.getRange(2, S.NOTES, rows, 1).setFontColor(TH.muted).setWrap(true);
  [96, 64, 64, 220, 48, 78, 260, 20, 64, 64, 220, 40, 20, 150, 170].forEach(
    (w, i) => sh.setColumnWidth(i + 1, w),
  );
  sh.setRowHeight(1, 34);
  sh.setRowHeights(2, rows, 24);
  sh.setFrozenRows(1);

  // Today
  const T = S.TODAY;
  sh.getRange(1, T, 1, 4)
    .merge()
    .setFontWeight("bold")
    .setFontSize(12)
    .setFontColor(TH.text);
  headerStyle_(sh.getRange(2, T, 1, 4));
  const today = sh.getRange(3, T, S.TODAY_ROWS, 4);
  today.setBackground(TH.surface);
  gridLines_(today);
  sh.getRange(3, T, S.TODAY_ROWS, 2)
    .setHorizontalAlignment("center")
    .setFontColor(TH.accent);
  sh.getRange(3, T + 3, S.TODAY_ROWS, 1).setHorizontalAlignment("center");

  // Summary and hint
  const sum = sh.getRange(1, S.SUM, 5, 2);
  sum
    .setBackground(TH.surface)
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      true,
      TH.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );
  sh.getRange(1, S.SUM, 5, 1).setFontColor(TH.muted);
  sh.getRange(1, S.SUM + 1, 5, 1)
    .setFontColor(TH.accent)
    .setFontWeight("bold");
  sh.getRange(7, S.SUM, 14, 2)
    .merge()
    .setWrap(true)
    .setFontColor(TH.dim)
    .setFontStyle("italic")
    .setVerticalAlignment("top");

  // Helpers and the lookup table are hidden; the formulas above depend on them.
  sh.getRange(1, S.HELP, sh.getMaxRows(), S.LOOKUP + 8 - S.HELP).setFontColor(
    TH.bg,
  );
  sh.hideColumns(S.HELP, S.LOOKUP + 8 - S.HELP);

  const nowInToday =
    "=AND(ISNUMBER($I3),IF($J3>$I3,AND(MOD(NOW(),1)>=$I3,MOD(NOW(),1)<$J3),OR(MOD(NOW(),1)>=$I3,MOD(NOW(),1)<$J3)))";
  const overlap =
    "=AND($A3=$A2,ISNUMBER($B3),ISNUMBER($B2),ISNUMBER($C2),$C2>$B2,$B3<$C2)";
  sh.setConditionalFormatRules([
    cf_()
      .whenFormulaSatisfied("=$U2=TRUE")
      .setBackground(TH.accentBg)
      .setBold(true)
      .setRanges([data])
      .build(),
    cf_()
      .whenFormulaSatisfied(nowInToday)
      .setBackground(TH.accentBg)
      .setBold(true)
      .setRanges([today])
      .build(),
    cf_()
      .whenFormulaSatisfied(overlap)
      .setBackground(TH.redBg)
      .setFontColor("#fecaca")
      .setRanges([sh.getRange(3, 1, rows - 1, S.COLS)])
      .build(),
    cf_()
      .whenFormulaSatisfied("=ISNUMBER($A2)")
      .setFontColor(TH.yellow)
      .setRanges([sh.getRange(2, S.DAYS, rows, 1)])
      .build(),
    cf_()
      .whenFormulaSatisfied("=ISEVEN(ROW())")
      .setBackground(TH.zebra)
      .setRanges([data])
      .build(),
  ]);
}
