// App.js
import React from "react";

import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

import CustomResultView from "./components/CustomResultView";
import Charts from "./components/Charts";
import CustomFacetView from "./components/CustomFacetView";
import RoomsFacetView from "./components/RoomsFacetView";
import BathroomsFacetView from "./components/BathroomsFacetView";
// OJO: ya no usamos DynamicFacet

import {
  ErrorBoundary,
  Facet,
  SearchProvider,
  SearchBox,
  Results,
  PagingInfo,
  ResultsPerPage,
  Paging
} from "@elastic/react-search-ui";

import { Layout } from "@elastic/react-search-ui-views";
import "@elastic/react-search-ui-views/lib/styles/styles.css";

import "./App.css";

// Conector bien configurado
const connector = new ElasticsearchAPIConnector({
  host: "http://localhost:9200",
  index: "pisos_index",
  // pon la versión que tengas; si es ES 8.x, cambia a "8.0"
  apiVersion: "7.17",
  queryParameters: {
    track_total_hits: true
  }
});

const config = {
  apiConnector: connector,
  debug: true,
  trackUrlState: false,
  alwaysSearchOnInitialLoad: true,

  searchQuery: {
    search_fields: {
      title: {}
    },

    result_fields: {
      url: { raw: {} },
      listing_id: { raw: {} },
      title: { raw: {} },
      price_eur: { raw: {} },
      rooms: { raw: {} },
      bathrooms: { raw: {} },
      surface_m2: { raw: {} },
      neighborhood: { raw: {} },
      images: { raw: {} }
    },

    // Todos los campos que queremos como facetas "OR"
    disjunctiveFacets: [
      "neighborhood",
      "rooms",
      "bathrooms",
      "surface_m2",
      "price_eur"
    ],

    // Definición de facetas que Search UI enviará a Elasticsearch
    facets: {
      neighborhood: {
        type: "value",
        field: "neighborhood",
        size: 50
      },
      rooms: {
        type: "value",
        field: "rooms",
        size: 100
      },
      bathrooms: {
        type: "value",
        field: "bathrooms",
        size: 100
      },
      price_eur: {
        type: "range",
        field: "price_eur",
        ranges: [
          { from: 0, to: 700, name: "≤ 700€" },
          { from: 700, to: 900, name: "700€ - 900€" },
          { from: 900, to: 1100, name: "900€ - 1100€" },
          { from: 1100, name: "≥ 1100€" }
        ]
      },
      surface_m2: {
        type: "range",
        field: "surface_m2",
        ranges: [
          { to: 50, name: "≤ 50 m²" },
          { from: 50, to: 80, name: "50 - 80 m²" },
          { from: 80, to: 120, name: "80 - 120 m²" },
          { from: 120, name: "≥ 120 m²" }
        ]
      }
    }
  }
};

export default function App() {
  return (
    <SearchProvider config={config}>
      <div className="App">
        <ErrorBoundary>
          <Layout
            header={
              <SearchBox
                autocompleteSuggestions={false}
                autocompleteResults={false}
                searchAsYouType={false}
                inputView={({
                  getInputProps,
                  getButtonProps,
                  getAutocomplete
                }) => (
                  <div className="sui-search-box">
                    <div className="sui-search-box__wrapper">
                      <input
                        {...getInputProps({
                          placeholder: "Buscar pisos..."
                        })}
                        className="sui-search-box__text-input"
                      />
                      {getAutocomplete && getAutocomplete()}
                    </div>
                    <input
                      {...getButtonProps({
                        value: "Buscar"
                      })}
                      className="sui-search-box__submit button"
                    />
                  </div>
                )}
              />
            }
            sideContent={
              <div>
                {/* Habitaciones y Baños con facet + vistas personalizadas */}
                <Facet
                  field="rooms"
                  label="Habitaciones"
                  filterType="any"
                  view={RoomsFacetView}
                />

                <Facet
                  field="bathrooms"
                  label="Baños"
                  filterType="any"
                  view={BathroomsFacetView}
                />

                {/* Superficie y Precio como rangos */}
                <Facet
                  field="surface_m2"
                  label="Superficie (m²)"
                  filterType="any"
                  view={CustomFacetView}
                  show={500}
                />
                <Facet
                  field="price_eur"
                  label="Precio (€)"
                  filterType="any"
                  view={CustomFacetView}
                  show={500}
                />

                {/* Barrio como facet normal con CustomFacetView */}
                <Facet
                  field="neighborhood"
                  label="Barrio"
                  filterType="any"
                  view={CustomFacetView}
                  show={500}
                />
              </div>
            }
            bodyHeader={
              <div style={{ width: "100%" }}>
                <Charts />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "5px"
                  }}
                >
                  <PagingInfo
                    view={({ start, end, totalResults }) => (
                      <span style={{ fontSize: "20px" }}>
                        Mostrando {start} - {end} de {totalResults}
                      </span>
                    )}
                  />

                  <ResultsPerPage
                    view={({ value, onChange, options }) => (
                      <div className="sui-results-per-page" style={{ fontSize: "20px" }}>
                        <label className="sui-results-per-page__label">
                          Mostrar{" "}
                          <select
                            className="sui-results-per-page__select"
                            value={value}
                            onChange={(e) => onChange(Number(e.target.value))}
                          >
                            {options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  />
                </div>
              </div>
            }
            bodyContent={
              <Results
                titleField="title"
                urlField="url"
                shouldTrackClickThrough={false}
                resultView={CustomResultView}
              />
            }
            bodyFooter={<Paging />}
          />
        </ErrorBoundary>
      </div>
    </SearchProvider>
  );
}
