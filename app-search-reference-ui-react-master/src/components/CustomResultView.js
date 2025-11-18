import React from "react";

export default function CustomResultView({ result }) {
  const title = result.title?.raw || "Sin título";
  const url = result.url?.raw;
  const price = result.price_eur?.raw;
  const rooms = result.rooms?.raw;
  const neighborhood = result.neighborhood?.raw;

  // Get images array
  const images = result.images?.raw || [];

  // Choose the first usable image (avoid icons)
  const mainImage = images.find(img => img.includes("fotos")) || images[0];

  return (
    <div className="result-card" style={{
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px",
      display: "flex",
      gap: "16px",
      background: "#fff"
    }}>
      
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
        >
        </div>
      )}

      {/* Text content */}
      <div style={{ flex: 1 }}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
        </a>

        <div>💶 <strong>{price} €</strong></div>
        {rooms !== undefined && <div>🛏 {rooms} rooms</div>}
        {neighborhood && <div>📍 {neighborhood}</div>}
      </div>
    </div>
  );
}
