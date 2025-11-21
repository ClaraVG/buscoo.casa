// App.js
import React from "react";

import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

import CustomResultView from "./components/CustomResultView";
import Charts from "./components/Charts";
import CustomFacetView from "./components/CustomFacetView";
import RoomsFacetView from "./components/RoomsFacetView";
import BathroomsFacetView from "./components/BathroomsFacetView";

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
  index: "pisos_index"
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
        size: 50
      },
      rooms: {
        type: "value",
        field: "rooms",
        size: 10
      },
      bathrooms: {
        type: "value",
        field: "bathrooms",
        size: 10
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
                inputView={({ getInputProps, getButtonProps, getAutocomplete }) => (
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
                <Facet
                  field="surface_m2"
                  label="Superficie (m²)"
                  filterType="any"
                  view={CustomFacetView}
                />
                <Facet
                  field="price_eur"
                  label="Precio (€)"
                  filterType="any"
                  view={CustomFacetView}
                />
                {/* Barrio al final */}
                <Facet
                  field="neighborhood"
                  label="Barrio"
                  filterType="any"
                  view={CustomFacetView}
                />
              </div>
            }
            bodyHeader={
              // IMPORTANTÍSIMO: un único contenedor para que Layout
              // no meta Charts y PagingInfo en la misma fila
              <div style={{ width: "100%" }}>
                {/* Fila 1: gráficas centradas */}
                <Charts />

                {/* Fila 2: "Showing X..." + "Show 20" */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "5px"
                  }}
                >
                  <PagingInfo />
                  <ResultsPerPage />
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
