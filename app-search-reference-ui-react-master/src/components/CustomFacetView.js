// src/components/CustomFacetView.js
import React, { useState, useEffect } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export default function CustomFacetView(props) {
  const {
    label,
    options = [],
    onChange,
    onSelect,
    onRemove,
    field
  } = props;

  // ==========================
  // ¿Es faceta de rango (precio, superficie...)? -> value = { from, to, name? }
  // ==========================
  const firstVal = options[0]?.value;
  const isRangeFacet =
    firstVal &&
    typeof firstVal === "object" &&
    (Object.prototype.hasOwnProperty.call(firstVal, "from") ||
      Object.prototype.hasOwnProperty.call(firstVal, "to"));

  // Inferimos el campo de ES si no viene por props
  const inferFieldFromLabel = () => {
    if (!label) return null;
    const lower = label.toLowerCase();
    if (lower.includes("precio")) return "price_eur";
    if (lower.includes("superficie")) return "surface_m2";
    return null;
  };

  const esField = field || inferFieldFromLabel();

  // ------- Estado para facetas de rango (price_eur, surface_m2) -------
  const [globalMin, setGlobalMin] = useState(null);
  const [globalMax, setGlobalMax] = useState(null);
  const [rangeValues, setRangeValues] = useState([0, 0]);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeError, setRangeError] = useState(null);

  // Cargar min y max reales desde Elasticsearch (todos los documentos)
  useEffect(() => {
    if (!isRangeFacet) return;
    if (!esField) return;

    setLoadingRange(true);
    setRangeError(null);

    fetch("http://localhost:9200/pisos_index/_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        size: 0,
        query: { match_all: {} },
        aggs: {
          min_val: { min: { field: esField } },
          max_val: { max: { field: esField } }
        }
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const aggs = data.aggregations || {};
        const min = aggs.min_val?.value;
        const max = aggs.max_val?.value;

        if (typeof min === "number" && typeof max === "number") {
          setGlobalMin(min);
          setGlobalMax(max);
          setRangeValues([min, max]);
        } else {
          setRangeError("No se pudo obtener el rango.");
        }
      })
      .catch((e) => {
        console.error("Error obteniendo rango para facet:", label, e);
        setRangeError("No se pudo obtener el rango.");
      })
      .finally(() => {
        setLoadingRange(false);
      });
  }, [isRangeFacet, esField, label]);

  // Aplica el filtro de rango al mover el slider
  const applyRangeFilter = (min, max) => {
    if (!isRangeFacet) return;

    const value = { from: min, to: max };

    const unit =
      esField === "price_eur" ? "€" : esField === "surface_m2" ? " m²" : "";

    const name = `${Math.round(min)}${unit} - ${Math.round(max)}${unit}`;

    // para facetas de rango Search UI espera onChange(value)
    if (onChange) {
      onChange({
        ...value,
        name
      });
    }
  };

  const handleRangeChange = (vals) => {
    const [min, max] = vals;
    setRangeValues([min, max]);
    applyRangeFilter(min, max);
  };

  // Render para facetas de rango (slider doble tipo Amazon)
  if (isRangeFacet) {
    if (loadingRange || globalMin == null || globalMax == null) {
      return (
        <div className="sui-facet">
          <div className="sui-facet__title">{label}</div>
          <div style={{ fontSize: 12, color: "#666" }}>Cargando rango...</div>
        </div>
      );
    }

    if (rangeError) {
      return (
        <div className="sui-facet">
          <div className="sui-facet__title">{label}</div>
          <div style={{ fontSize: 12, color: "red" }}>{rangeError}</div>
        </div>
      );
    }

    const unit =
      esField === "price_eur" ? "€" : esField === "surface_m2" ? " m²" : "";
    const [currentMin, currentMax] = rangeValues;
    const step = esField === "price_eur" ? 10 : 5;

    return (
      <div className="sui-facet">
        <div className="sui-facet__title">{label}</div>

        <div
          className="sui-facet__range-label"
          style={{ fontWeight: 600, marginBottom: 4 }}
        >
          {Math.round(currentMin)}
          {unit} – {Math.round(currentMax)}
          {unit}
        </div>

        <div style={{ padding: "10px 4px 6px 4px" }}>
          <Slider
            range
            min={globalMin}
            max={globalMax}
            step={step}
            value={rangeValues}
            onChange={handleRangeChange}
            allowCross={false}
          />
        </div>
      </div>
    );
  }

  // ------- Facetas normales (checkbox) -------

  if (!options.length) return null;

  const hasAnySelection = options.some((o) => o.selected);

  const handleCheckboxChange = (option) => {
    if (option.selected) {
      // estaba marcada → quitar filtro
      if (onRemove) {
        onRemove(option.value);
      } else if (onChange) {
        onChange(option.value);
      }
    } else {
      // estaba desmarcada → añadir filtro
      if (onSelect) {
        onSelect(option.value);
      } else if (onChange) {
        onChange(option.value);
      }
    }
  };

  return (
    <div className="sui-facet">
      <div className="sui-facet__title">{label}</div>
      <div className="sui-facet__options-list">
        {options.map((option) => {
          const disabled = !option.selected && option.count === 0;

          const valueLabel =
            option.value && option.value.name
              ? option.value.name
              : String(option.value);

          return (
            <label
              key={String(valueLabel)}
              className="sui-facet__option"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 4,
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? "default" : "pointer"
              }}
            >
              <span>
                <input
                  type="checkbox"
                  checked={!!option.selected}
                  disabled={disabled}
                  onChange={() => !disabled && handleCheckboxChange(option)}
                  style={{ marginRight: 6 }}
                />
                {valueLabel}
              </span>
              <span className="sui-facet__option-count">{option.count}</span>
            </label>
          );
        })}
      </div>

      {/* Si quieres recuperar el botón Limpiar, aquí lo tienes preparado */}
      {/* {hasAnySelection && (
        <button
          type="button"
          onClick={() => onRemove && options.forEach(o => o.selected && onRemove(o.value))}
          style={{
            marginTop: 6,
            fontSize: "12px",
            border: "none",
            background: "transparent",
            color: "#174978",
            cursor: "pointer",
            padding: 0
          }}
        >
          Limpiar
        </button>
      )} */}
    </div>
  );
}
