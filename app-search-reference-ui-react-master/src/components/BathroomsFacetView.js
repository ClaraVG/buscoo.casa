import React from "react";
import CustomFacetView from "./CustomFacetView";

export default function BathroomsFacetView(props) {
  // 👇 añadimos "values"
  const { options = [], showMore: _ignored, values = [], ...rest } = props;

  const MIN_BATHS = 1;
  const DEFAULT_MAX_BATHS = 4;

  const maxFromData = options.reduce((max, o) => {
    const n = Number(o.value);
    if (Number.isNaN(n)) return max;
    return Math.max(max, n);
  }, 0);

  const maxBaths = Math.max(maxFromData, DEFAULT_MAX_BATHS);

  const allBathValues = [];
  for (let v = MIN_BATHS; v <= maxBaths; v += 1) {
    allBathValues.push(v);
  }

  // normalizamos a número igual que en rooms
  const map = new Map(
    options.map((o) => {
      const n = Number(o.value);
      return [n, { ...o, value: n }];
    })
  );

  // igual que en RoomsFacetView
  const isValueSelected = (v) =>
    (values || []).some((sel) => {
      const val = sel && typeof sel === "object" ? sel.value : sel;
      return String(val) === String(v);
    });

  const mergedOptions = allBathValues.map((v) => {
    const existing = map.get(v);
    if (existing) return existing;

    return {
      value: v,
      count: 0,
      selected: isValueSelected(v) // 🔹 marcamos si está seleccionado
    };
  });

  return (
    <CustomFacetView
      {...rest}
      options={mergedOptions}
      showMore={false}
    />
  );
}
