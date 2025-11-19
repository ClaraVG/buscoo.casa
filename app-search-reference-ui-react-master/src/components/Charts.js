import React from "react";
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
  ResponsiveContainer
} from "recharts";

// Componente de gráficas responsive para sidebar
export default function Charts() {
  return (
    <WithSearch mapContextToProps={({ results }) => ({ results })}>
      {({ results }) => {
        if (!results) return null;

        const data = results.map((r) => ({
          neighborhood: r.neighborhood?.raw,
          price: r.price_eur?.raw,
          rooms: r.rooms?.raw
        }));

        // Precio medio por barrio con 2 decimales
        const avgPriceByNeighborhood = Object.values(
          data.reduce((acc, item) => {
            if (!item.neighborhood) return acc;
            if (!acc[item.neighborhood]) acc[item.neighborhood] = { neighborhood: item.neighborhood, total: 0, count: 0 };
            acc[item.neighborhood].total += item.price;
            acc[item.neighborhood].count += 1;
            return acc;
          }, {})
        ).map((i) => ({ neighborhood: i.neighborhood, avg: parseFloat((i.total / i.count).toFixed(2)) }));

        // Distribución de habitaciones con etiqueta personalizada
        const roomsDistribution = Object.values(
          data.reduce((acc, item) => {
            if (!item.rooms) return acc;
            const label = `${item.rooms} hab`;
            if (!acc[label]) acc[label] = { rooms: label, count: 0 };
            acc[label].count += 1;
            return acc;
          }, {})
        );

        return (
          <div style={{ marginBottom: "1.5rem", width: "100%" }}>
            <h3 style={{ fontSize: "14px", marginTop: "1rem" }}>Precio medio por barrio</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgPriceByNeighborhood}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="neighborhood" hide={false} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => value.toFixed(2)} />
                  <Bar dataKey="avg" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h3 style={{ fontSize: "14px", marginTop: "1rem" }}>Distribución de habitaciones</h3>
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
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }}
    </WithSearch>
  );
}
