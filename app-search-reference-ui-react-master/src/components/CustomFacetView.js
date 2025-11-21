// CustomFacetView.js
import React from "react";

function formatOptionLabel(option) {
  const v = option.value;

  // Facetas de rango: { from, to, name }
  if (v && typeof v === "object") {
    if (v.name) return v.name;

    const from = v.from ?? null;
    const to = v.to ?? null;

    if (from !== null && to !== null) return `${from} - ${to}`;
    if (from !== null) return `≥ ${from}`;
    if (to !== null) return `≤ ${to}`;

    return JSON.stringify(v);
  }

  // Valor "normal" (barrio, rooms, baños…)
  return String(v);
}

// Ordena rangos numéricos de forma lógica: <x, x-y, ≥z
function sortRangeOptions(options) {
  return [...options].sort((a, b) => {
    const va = a.value || {};
    const vb = b.value || {};

    const fromA =
      va.from !== undefined && va.from !== null
        ? va.from
        : Number.NEGATIVE_INFINITY;
    const toA =
      va.to !== undefined && va.to !== null ? va.to : Number.POSITIVE_INFINITY;

    const fromB =
      vb.from !== undefined && vb.from !== null
        ? vb.from
        : Number.NEGATIVE_INFINITY;
    const toB =
      vb.to !== undefined && vb.to !== null ? vb.to : Number.POSITIVE_INFINITY;

    if (fromA !== fromB) return fromA - fromB;
    return toA - toB;
  });
}

// Orden alfabético para barrios
function sortAlphaOptions(options) {
  return [...options].sort((a, b) =>
    String(a.value).localeCompare(String(b.value), "es", {
      sensitivity: "base"
    })
  );
}

export default function CustomFacetView({
  label,
  options,
  onSelect,
  onRemove,
  showMore,
  onMoreClick
}) {
  const safeLabel = (label || "").toString();

  let processedOptions = options || [];

  // Rango de superficie o precio -> ordenar por from/to
  if (safeLabel === "Superficie (m²)" || safeLabel === "Precio (€)") {
    processedOptions = sortRangeOptions(processedOptions);
  }

  // Barrios -> alfabético
  if (safeLabel === "Barrio") {
    processedOptions = sortAlphaOptions(processedOptions);
  }

  return (
    <div className="sui-facet" style={{ marginBottom: "16px" }}>
      <div className="sui-facet__title" style={{ fontSize: 12, color: "#666" }}>
        {safeLabel.toUpperCase()}
      </div>

      <div className="sui-facet__options-list">
        {processedOptions.map((option, index) => {
          const disabled = option.count === 0 && !option.selected;
          const labelText = formatOptionLabel(option);
          const key = `${labelText}-${index}`;

          return (
            <div
              key={key}
              className="sui-facet__option"
              style={
                disabled
                  ? {
                      opacity: 0.4,
                      pointerEvents: "none"
                    }
                  : {}
              }
            >
              <label
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <input
                  type="checkbox"
                  checked={option.selected}
                  onChange={() =>
                    option.selected
                      ? onRemove(option.value)
                      : onSelect(option.value)
                  }
                  disabled={disabled}
                />
                <span className="sui-facet__option-label">{labelText}</span>
                <span
                  className="sui-facet__option-count"
                  style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}
                >
                  {option.count}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {showMore && (
        <button
          type="button"
          className="sui-facet__view-more"
          onClick={onMoreClick}
          style={{
            marginTop: 4,
            fontSize: 12,
            background: "none",
            border: "none",
            color: "#0073e6",
            cursor: "pointer",
            padding: 0
          }}
        >
          Ver más
        </button>
      )}
    </div>
  );
}
