import React from "react";
import CustomFacetView from "./CustomFacetView";

export default function createDynamicValueFacetView() {
  return function DynamicValueFacetView(props) {
    const { options = [], ...rest } = props;
    const initialValuesRef = React.useRef(null);

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

    mergedOptions.sort((a, b) => {
      const va = a.value;
      const vb = b.value;

      if (!isNaN(va) && !isNaN(vb)) {
        return Number(va) - Number(vb);
      }

      return String(va).localeCompare(String(vb));
    });

    return <CustomFacetView {...rest} options={mergedOptions} />;
  };
}
