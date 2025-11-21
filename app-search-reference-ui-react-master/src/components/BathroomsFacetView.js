import React from "react";
import CustomFacetView from "./CustomFacetView";

// Valores que quieres que siempre aparezcan
const BATH_VALUES = [1, 2, 3, 4];

export default function BathroomsFacetView(props) {
  const { options = [], ...rest } = props;

  const map = new Map(options.map((o) => [String(o.value), o]));

  const mergedOptions = BATH_VALUES.map((v) => {
    const key = String(v);
    const existing = map.get(key);
    return (
      existing || {
        value: v,
        count: 0,
        selected: false
      }
    );
  });

  return <CustomFacetView {...rest} options={mergedOptions} />;
}
