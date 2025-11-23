// src/components/createDynamicValueFacetView.js
import React from "react";
import CustomFacetView from "./CustomFacetView";

export default function createDynamicValueFacetView() {
  return function DynamicValueFacetView(props) {
    const { options = [], ...rest } = props;
    const initialValuesRef = React.useRef(null);

    // Guardamos solo una vez los valores iniciales
    if (!initialValuesRef.current && options.length > 0) {
      initialValuesRef.current = options.map((o) => o.value);
    }

    const baseValues =
      initialValuesRef.current || options.map((o) => o.value);

    const uniqueBaseValues = Array.from(new Set(baseValues));

    const map = new Map(options.map((o) => [o.value, o]));

    let mergedOptions = uniqueBaseValues.map((value) => {
      const existing = map.get(value);
      return (
        existing || {
          value,
          count: 0,
          selected: false
        }
      );
    });

    // ⬇⬇⬇ ORDEN NUMÉRICO/ALFABÉTICO ⬇⬇⬇
    mergedOptions.sort((a, b) => {
      const va = a.value;
      const vb = b.value;

      // Si ambos son números
      if (!isNaN(va) && !isNaN(vb)) {
        return Number(va) - Number(vb);
      }

      // Si son strings
      return String(va).localeCompare(String(vb));
    });
    // ⬆⬆⬆ ORDEN ⬆⬆⬆

    return <CustomFacetView {...rest} options={mergedOptions} />;
  };
}
