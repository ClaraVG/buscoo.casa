import React from "react";

function formatOptionLabel(option) {
  const v = option.value;

  if (v && typeof v === "object") {
    if (v.name) return v.name;
    if ("from" in v && "to" in v) return `${v.from} - ${v.to}`;
    if ("from" in v) return `≥ ${v.from}`;
    if ("to" in v) return `≤ ${v.to}`;
  }

  return String(v);
}

function sortRangeOptions(options) {
  return [...options].sort((a, b) => {
    const va = a.value || {};
    const vb = b.value || {};

    const fromA = va.from ?? Number.NEGATIVE_INFINITY;
    const fromB = vb.from ?? Number.NEGATIVE_INFINITY;

    if (fromA !== fromB) return fromA - fromB;

    const toA = va.to ?? Number.POSITIVE_INFINITY;
    const toB = vb.to ?? Number.POSITIVE_INFINITY;

    return toA - toB;
  });
}

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

  if (safeLabel === "Superficie (m²)" || safeLabel === "Precio (€)") {
    processedOptions = sortRangeOptions(processedOptions);
  }

  if (safeLabel === "Barrio") {
    processedOptions = sortAlphaOptions(processedOptions);
  }

  return (
    <div className="sui-facet" style={{ marginBottom: "16px" }}>
      <div className="sui-facet__title" style={{ fontSize: 12, color: "#666" }}>
        {safeLabel.toUpperCase()}
      </div>

      <div className="sui-facet__options-list">
        {processedOptions.map((opt, index) => {
          const labelText = formatOptionLabel(opt);

          const disabled = opt.count === 0 && !opt.selected;

          return (
            <div
              key={`${labelText}-${index}`}
              className="sui-facet__option"
              style={
                disabled
                  ? { opacity: 0.4, pointerEvents: "none" }
                  : {}
              }
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={opt.selected}
                  disabled={disabled}
                  onChange={() =>
                    opt.selected
                      ? onRemove(opt.value)
                      : onSelect(opt.value)
                  }
                />
                <span>{labelText}</span>
                <span
                  style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}
                >
                  {opt.count}
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
