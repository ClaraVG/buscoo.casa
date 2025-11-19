import React from "react";

export default function CustomResultView({ result }) {
  const title = result?.title?.raw || "Sin título";
  const url = result?.url?.raw;
  const price = result?.price_eur?.raw;
  const rooms = result?.rooms?.raw;
  const neighborhood = result?.neighborhood?.raw;

  // Aseguramos que images es un array
  const imagesRaw = result?.images?.raw;
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];

  // Elegimos la primera imagen "buena"
  const mainImage =
    images.find((img) => typeof img === "string" && img.includes("fotos")) ||
    images[0] ||
    null;

  return (
    <div
      className="result-card"
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px",
        display: "flex",
        gap: "16px",
        background: "#fff"
      }}
    >
      {/* Thumbnail */}
      {mainImage ? (
        <img
          src={mainImage}
          alt={title}
          style={{
            width: "180px",
            height: "140px",
            objectFit: "cover",
            borderRadius: "8px"
          }}
        />
      ) : (
        <div
          style={{
            width: "180px",
            height: "140px",
            background: "#eee",
            borderRadius: "8px"
          }}
        />
      )}

      {/* Texto */}
      <div style={{ flex: 1 }}>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
          </a>
        ) : (
          <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
        )}

        {price !== undefined && (
          <div>
            💶 <strong>{price} €</strong>
          </div>
        )}
        {rooms !== undefined && <div>🛏 {rooms} rooms</div>}
        {neighborhood && <div>📍 {neighborhood}</div>}
      </div>
    </div>
  );
}
