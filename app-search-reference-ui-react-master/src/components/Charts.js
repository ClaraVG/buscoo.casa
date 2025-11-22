import React, { useEffect, useState } from "react";
import { WithSearch } from "@elastic/react-search-ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

const COLORS = [
  "#003366",
  "#174978",
  "#2F5F8A",
  "#46769B",
  "#5E8CAD",
  "#75A2BF"
];

// 👇 antes recibías { searchTerm, filters }
function ChartsInner({ resultSearchTerm, filters }) {
  const [avgPriceByNeighborhood, setAvgPriceByNeighborhood] = useState([]);
  const [roomsDistribution, setRoomsDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAggs() {
      try {
        setLoading(true);
        setError("");

        const esFilters = (filters || []).flatMap((f) =>
          (f.values || []).map((value) => {
            // rango { from, to }
            if (value && typeof value === "object") {
              const range = {};
              if (value.from != null) range.gte = value.from;
              if (value.to != null) range.lt = value.to;
              return { range: { [f.field]: range } };
            }

            // valor normal
            return { term: { [f.field]: value } };
          })
        );

        let esQuery;

        // 👇 usamos resultSearchTerm en vez de searchTerm
        if (resultSearchTerm && resultSearchTerm.trim() !== "") {
          esQuery = {
            bool: {
              must: [
                {
                  multi_match: {
                    query: resultSearchTerm,
                    fields: ["title", "neighborhood", "description"]
                  }
                }
              ],
              filter: esFilters
            }
          };
        } else if (esFilters.length) {
          esQuery = {
            bool: {
              filter: esFilters
            }
          };
        } else {
          esQuery = { match_all: {} };
        }

        const response = await fetch(
          "http://localhost:9200/pisos_index/_search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              size: 0,
              query: esQuery,
              aggs: {
                avg_price_by_neighborhood: {
                  terms: {
                    field: "neighborhood",
                    size: 50
                  },
                  aggs: {
                    avg_price: {
                      avg: { field: "price_eur" }
                    }
                  }
                },
                rooms_distribution: {
                  terms: {
                    field: "rooms",
                    size: 20
                  }
                }
              }
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        const json = await response.json();
        const aggs = json.aggregations || {};

        const bucketsNeighborhood =
          aggs.avg_price_by_neighborhood?.buckets || [];
        const avgData = bucketsNeighborhood
          .filter((b) => b.avg_price && b.avg_price.value != null)
          .map((b) => ({
            neighborhood: b.key,
            avg: Number(b.avg_price.value.toFixed(2))
          }));

        const bucketsRooms = aggs.rooms_distribution?.buckets || [];
        const roomsData = bucketsRooms.map((b) => ({
          rooms: `${b.key} hab`,
          count: b.doc_count
        }));

        setAvgPriceByNeighborhood(avgData);
        setRoomsDistribution(roomsData);
      } catch (e) {
        console.error(e);
        setError("Error cargando datos para las gráficas");
      } finally {
        setLoading(false);
      }
    }

    // 👇 solo se ejecuta cuando cambia resultSearchTerm o los filtros
    fetchAggs();
  }, [resultSearchTerm, filters]);

  if (loading) {
    return <div style={{ marginTop: "1rem" }}>Cargando gráficas…</div>;
  }

  if (error) {
    return (
      <div style={{ marginTop: "1rem", color: "red" }}>
        {error}
      </div>
    );
  }

  if (!avgPriceByNeighborhood.length && !roomsDistribution.length) {
    return (
      <div style={{ marginTop: "1rem" }}>
        No hay datos para las gráficas con estos filtros.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem", width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "96px"
        }}
      >
        {/* Gráfica de barras */}
        <div style={{ flex: "0 0 55%", maxWidth: "700px" }}>
          <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
            Precio medio por Barrio (Total Filtrado)
          </h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgPriceByNeighborhood}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="neighborhood" hide={false} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                <Bar dataKey="avg">
                  {avgPriceByNeighborhood.map((entry, index) => (
                    <Cell
                      key={`bar-${entry.neighborhood}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de pastel */}
        <div style={{ flex: "0 0 30%", maxWidth: "350px" }}>
          <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
            Distribución de Habitaciones (Total Filtrado)
          </h3>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roomsDistribution}
                  dataKey="count"
                  nameKey="rooms"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  {roomsDistribution.map((entry, index) => (
                    <Cell
                      key={`pie-${entry.rooms}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Charts() {
  return (
    <WithSearch
      mapContextToProps={({ resultSearchTerm, filters }) => ({
        resultSearchTerm,
        filters
      })}
    >
      {(props) => <ChartsInner {...props} />}
    </WithSearch>
  );
}
