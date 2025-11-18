import React from "react";

import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

import CustomResultView from "./components/CustomResultView";

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

// Conexión a Elasticsearch
const connector = new ElasticsearchAPIConnector({
  host: "http://localhost:9200",
  index: "pisos_index"
});

// Configuración
const config = {
  apiConnector: connector,
  debug: true,
  trackUrlState: false,
  alwaysSearchOnInitialLoad: true,

  searchQuery: {
    // 🔹 SOLO usamos title como campo de búsqueda de texto
    // para evitar el error de phrase_prefix sobre neighborhood (keyword)
    search_fields: {
      title: {}
      // neighborhood fuera de aquí, que es keyword
    },

    // Campos que devolvemos
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

    // Facetas
    facets: {
      neighborhood: {
        type: "value",
        field: "neighborhood" // neighborhood es keyword, perfecto para facet
      },
      rooms: {
        type: "value",
        field: "rooms"
      },
      price_eur: {
        type: "value",
        field: "price_eur"
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
                <Facet field="neighborhood" label="Barrio" />
                <Facet field="rooms" label="Habitaciones" />
                <Facet field="price_eur" label="Precio (€)" />
              </div>
            }
            bodyHeader={
              <>
                <PagingInfo />
                <ResultsPerPage />
              </>
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
