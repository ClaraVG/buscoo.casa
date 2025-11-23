// src/components/Charts.js
import React, { useEffect, useState } from "react";
import { withSearch } from "@elastic/react-search-ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ["#174978", "#356fa6", "#6b97c4", "#a8c1df", "#ccd9ee"];

// Construye una query de Elasticsearch basada en resultSearchTerm + filters de Search UI
function buildEsQuery(resultSearchTerm, filters) {
  const must = [];
  const filterClauses = [];

  // Búsqueda por texto (igual que Search UI: sobre "title")
  if (resultSearchTerm && resultSearchTerm.trim() !== "") {
    must.push({
      multi_match: {
        query: resultSearchTerm,
        fields: ["title"],
        type: "bool_prefix"
      }
    });
  }

  // Filtros (rooms, bathrooms, price_eur, surface_m2, neighborhood, ...)
  (filters || []).forEach((f) => {
    // f: { field, values, type }   type: "any" | "all"
    if (!f.values || f.values.length === 0) return;

    if (f.type === "any") {
      // (A OR B OR C)
      const should = f.values.map((v) => {
        // Rango (price_eur, surface_m2)
        if (v && (v.from !== undefined || v.to !== undefined)) {
          const rangeBody = {};
          if (v.from !== undefined && v.from !== null) rangeBody.gte = v.from;
          if (v.to !== undefined && v.to !== null) rangeBody.lte = v.to;
          return {
            range: {
              [f.field]: rangeBody
            }
          };
        }
        // Valor discreto (rooms, bathrooms, neighborhood)
        return {
          term: {
            [f.field]: v
          }
        };
      });

      filterClauses.push({
        bool: {
          should,
          minimum_should_match: 1
        }
      });
    } else if (f.type === "all") {
      // (A AND B AND C)
      f.values.forEach((v) => {
        if (v && (v.from !== undefined || v.to !== undefined)) {
          const rangeBody = {};
          if (v.from !== undefined && v.from !== null) rangeBody.gte = v.from;
          if (v.to !== undefined && v.to !== null) rangeBody.lte = v.to;
          filterClauses.push({
            range: {
              [f.field]: rangeBody
            }
          });
        } else {
          filterClauses.push({
            term: {
              [f.field]: v
            }
          });
        }
      });
    }
  });

  const bool = {};
  if (must.length > 0) bool.must = must;
  if (filterClauses.length > 0) bool.filter = filterClauses;

  const query =
    Object.keys(bool).length > 0
      ? { bool }
      : { match_all: {} };

  return {
    size: 0, // <-- MUY IMPORTANTE: no queremos documentos, solo agregaciones
    query,
    aggs: {
      // Precio medio por barrio
      neighborhood_avg_price: {
        terms: {
          field: "neighborhood",
          size: 50
        },
        aggs: {
          avg_price: {
            avg: {
              field: "price_eur"
            }
          }
        }
      },
      // Distribución de habitaciones
      rooms_distribution: {
        terms: {
          field: "rooms",
          size: 20
        }
      }
    }
  };
}

function Charts({ resultSearchTerm, filters, totalResults }) {
  const [priceByNeighborhood, setPriceByNeighborhood] = useState([]);
  const [roomsDistribution, setRoomsDistribution] = useState([]);
  const [loadingAggs, setLoadingAggs] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si aún no hay resultados (no se ha buscado), no hacemos nada
    if (totalResults == null) {
      return;
    }

    // Si la búsqueda actual no devuelve resultados, limpiamos gráficas
    if (!totalResults || totalResults === 0) {
      setPriceByNeighborhood([]);
      setRoomsDistribution([]);
      setError(null);
      return;
    }

    setLoadingAggs(true);
    setError(null);

    const body = buildEsQuery(resultSearchTerm, filters);

    fetch("http://localhost:9200/pisos_index/_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const aggs = data.aggregations || {};

        // ----- Precio medio por barrio -----
        const neighBuckets =
          aggs.neighborhood_avg_price?.buckets || [];
        const priceData = neighBuckets
          .map((b) => ({
            neighborhood: b.key,
            avgPrice: b.avg_price?.value ?? null
          }))
          .filter((d) => d.avgPrice !== null);

        // ----- Distribución de habitaciones -----
        const roomBuckets = aggs.rooms_distribution?.buckets || [];
        const roomsData = roomBuckets
          .map((b) => ({
            rooms: b.key,
            count: b.doc_count
          }))
          .sort((a, b) => a.rooms - b.rooms)
          .map((d) => ({
            name: `${d.rooms} hab`,
            value: d.count
          }));

        setPriceByNeighborhood(priceData);
        setRoomsDistribution(roomsData);
      })
      .catch((e) => {
        console.error("Error obteniendo agregaciones para Charts:", e);
        setError("No se pudieron cargar las gráficas.");
        setPriceByNeighborhood([]);
        setRoomsDistribution([]);
      })
      .finally(() => {
        setLoadingAggs(false);
      });
  }, [resultSearchTerm, filters, totalResults]);

  if (loadingAggs) {
    return null; // si quieres, puedes poner un spinner aquí
  }

  if (error) {
    return (
      <div style={{ marginBottom: "16px", textAlign: "center", color: "red" }}>
        {error}
      </div>
    );
  }

  if (!totalResults || totalResults === 0) {
    return (
      <div style={{ marginBottom: "16px", textAlign: "center" }}>
        No hay datos para las gráficas con estos filtros.
      </div>
    );
  }

  if (
    priceByNeighborhood.length === 0 &&
    roomsDistribution.length === 0
  ) {
    return (
      <div style={{ marginBottom: "16px", textAlign: "center" }}>
        No hay datos para las gráficas con estos filtros.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "32px", marginBottom: "16px" }}>
      {/* Gráfica de barras: Precio medio por barrio */}
      <div style={{ flex: 2 }}>
        <h4 style={{ textAlign: "center", marginBottom: "8px" }}>
          Precio medio por Barrio (Total Filtrado)
        </h4>
        {priceByNeighborhood.length === 0 ? (
          <div style={{ textAlign: "center" }}>Sin datos de precio.</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priceByNeighborhood}>
              <XAxis
                dataKey="neighborhood"
                tick={false}
                tickLine={false}
                axisLine={false}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgPrice">
                {priceByNeighborhood.map((entry, index) => (
                  <Cell
                    key={entry.neighborhood}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfica de tarta: Distribución de habitaciones */}
      <div style={{ flex: 1 }}>
        <h4 style={{ textAlign: "center", marginBottom: "8px" }}>
          Distribución de Habitaciones (Total Filtrado)
        </h4>
        {roomsDistribution.length === 0 ? (
          <div style={{ textAlign: "center" }}>Sin datos de habitaciones.</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={roomsDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {roomsDistribution.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Conectamos Charts al estado de Search UI usando resultSearchTerm
export default withSearch(
  ({ resultSearchTerm, filters, totalResults }) => ({
    resultSearchTerm,
    filters,
    totalResults
  })
)(Charts);
