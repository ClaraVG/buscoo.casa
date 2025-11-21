// src/components/RoomsFacetView.js
import React from "react";
import CustomFacetView from "./CustomFacetView";

const ROOM_VALUES = [1, 2, 3, 4, 5];

export default function RoomsFacetView(props) {
  // options vienen de Search UI, showMore lo ignoramos
  const { options = [], showMore: _ignored, ...rest } = props;

  const map = new Map(options.map((o) => [String(o.value), o]));

  const mergedOptions = ROOM_VALUES.map((v) => {
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

  // Forzamos showMore = false para que no aparezca el botón
  return (
    <CustomFacetView
      {...rest}
      options={mergedOptions}
      showMore={false}
    />
  );
}
