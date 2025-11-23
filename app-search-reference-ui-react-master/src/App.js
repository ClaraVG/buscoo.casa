import React from "react";

import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

import CustomResultView from "./components/CustomResultView";
import Charts from "./components/Charts";
import CustomFacetView from "./components/CustomFacetView";
import RoomsFacetView from "./components/RoomsFacetView";
import BathroomsFacetView from "./components/BathroomsFacetView";
import SurfaceFacetView from "./components/SurfaceFacetView";
import PriceFacetView from "./components/PriceFacetView";
import NeighborhoodFacetView from "./components/NeighborhoodFacetView";

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

const connector = new ElasticsearchAPIConnector({
  host: "http://localhost:9200",
  index: "pisos_index",
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

    disjunctiveFacets: [
      "neighborhood",
      "rooms",
      "bathrooms",
      "surface_m2",
      "price_eur"
    ],

    facets: {
      neighborhood: {
        type: "value",
        field: "neighborhood",
        size: 100
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
          { to: 700, name: "≤ 700€" },
          { from: 701, to: 900, name: "700€ - 900€" },
          { from: 901, to: 1099, name: "900€ - 1100€" },
          { from: 1100, name: "≥ 1100€" }
        ]
      },
      surface_m2: {
        type: "range",
        field: "surface_m2",
        ranges: [
          { to: 50, name: "≤ 50 m²" },
          { from: 51, to: 80, name: "50 - 80 m²" },
          { from: 81, to: 120, name: "80 - 120 m²" },
          { from: 121, name: "≥ 120 m²" }
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
              />
            }
            sideContent={
              <div>
                <Facet
                  field="rooms"
                  label="Habitaciones"
                  filterType="any"
                  view={RoomsFacetView}
                  show={100}
                />
                <Facet
                  field="bathrooms"
                  label="Baños"
                  filterType="any"
                  view={BathroomsFacetView}
                  show={100}
                />
                <Facet
                  field="surface_m2"
                  label="Superficie (m²)"
                  filterType="any"
                  view={SurfaceFacetView}
                />

                <Facet
                  field="price_eur"
                  label="Precio (€)"
                  filterType="any"
                  view={PriceFacetView}
                />

                <Facet
                  field="neighborhood"
                  label="Barrio"
                  filterType="any"
                  view={NeighborhoodFacetView}
                  show={100}
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
                      <div
                        className="sui-results-per-page"
                        style={{ fontSize: "20px" }}
                      >
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
