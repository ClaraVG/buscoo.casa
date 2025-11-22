import React, { useEffect, useState } from "react";
import CustomFacetView from "./CustomFacetView";

const ES_HOST = "http://localhost:9200";
const INDEX_NAME = "pisos_index";

export default function RoomsFacetView(props) {
  // 👇 añadimos "values"
  const { options = [], showMore: _ignored, values = [], ...rest } = props;

  const [maxFromIndex, setMaxFromIndex] = useState(null);

  useEffect(() => {
    async function fetchMaxRooms() {
      try {
        const res = await fetch(`${ES_HOST}/${INDEX_NAME}/_search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            size: 0,
            aggs: {
              max_rooms: {
                max: { field: "rooms" }
              }
            }
          })
        });

        if (!res.ok) {
          console.error("Error fetching max rooms", res.status);
          return;
        }

        const json = await res.json();
        const value = json.aggregations?.max_rooms?.value;

        if (value != null) {
          setMaxFromIndex(Math.floor(value)); // p.ej. 6.0 -> 6
        }
      } catch (e) {
        console.error("Error fetching max rooms", e);
      }
    }

    fetchMaxRooms();
  }, []);

  const MIN_ROOMS = 1;
  const DEFAULT_MAX_ROOMS = 5;

  const maxFromFacets = options.reduce((max, o) => {
    const n = Number(o.value);
    if (Number.isNaN(n)) return max;
    return Math.max(max, n);
  }, 0);

  const maxRooms = Math.max(
    DEFAULT_MAX_ROOMS,
    maxFromFacets,
    maxFromIndex ?? 0
  );

  const allRoomValues = [];
  for (let v = MIN_ROOMS; v <= maxRooms; v += 1) {
    allRoomValues.push(v);
  }

  // normalizamos opciones reales a número
  const map = new Map(
    options.map((o) => {
      const n = Number(o.value);
      return [n, { ...o, value: n }];
    })
  );

  // 👇 función para saber si un valor está seleccionado según Search UI
  const isValueSelected = (v) =>
    (values || []).some((sel) => {
      const val = sel && typeof sel === "object" ? sel.value : sel;
      return String(val) === String(v);
    });

  const mergedOptions = allRoomValues.map((v) => {
    const existing = map.get(v);
    if (existing) return existing;

    const option = {
      value: v,
      count: 0,
      selected: isValueSelected(v) // 🔹 AQUÍ está la magia
    };

    if (maxFromIndex != null && v === maxFromIndex) {
      option.count = 1;
    }

    return option;
  });

  return (
    <CustomFacetView
      {...rest}
      options={mergedOptions}
      showMore={false}
    />
  );
}
