import React from "react";

export default function CustomResultView({ result }) {
  const title = result?.title?.raw || "Sin título";
  const url = result?.url?.raw;
  const price = result?.price_eur?.raw;
  const rooms = result?.rooms?.raw;
  const bathrooms = result?.bathrooms?.raw;
  const surface = result?.surface_m2?.raw;
  const neighborhood = result?.neighborhood?.raw;

  const imagesRaw = result?.images?.raw;
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];

  const mainImage =
    images.find((img) => typeof img === "string" && img.includes("fotos")) ||
    images[0] ||
    null;

  const roomsLabel = rooms === 1 ? "Habitación" : "Habitaciones";
  const bathroomsLabel = bathrooms === 1 ? "Baño" : "Baños";

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

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px"
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
              </a>
            ) : (
              <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
            )}
            {neighborhood && (
              <div style={{ color: "#555", fontSize: "14px" }}>
                📍 {neighborhood}
              </div>
            )}
          </div>

          {price !== undefined && price !== null && (
            <div
              style={{
                minWidth: "110px",
                textAlign: "right",
                fontSize: "28px",
                fontWeight: "700",
                color: "#1a1a1a"
              }}
            >
              {price} €
            </div>
          )}
        </div>

        <div style={{ marginTop: "8px" }}>
          {surface !== undefined && surface !== null && (
            <div>
              <span style={{ fontSize: "18px", marginRight: "4px" }}>📐</span>
              {surface} m²
            </div>
          )}

          {rooms !== undefined && rooms !== null && (
            <div>
              <span style={{ fontSize: "18px", marginRight: "4px" }}>🛌</span>
              {rooms} {roomsLabel}
            </div>
          )}

          {bathrooms !== undefined && bathrooms !== null && (
            <div>
              <span style={{ fontSize: "18px", marginRight: "4px" }}>🚿</span>
              {bathrooms} {bathroomsLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
