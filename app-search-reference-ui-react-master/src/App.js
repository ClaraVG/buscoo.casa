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
  Paging,
  WithSearch
} from "@elastic/react-search-ui";
import { Layout } from "@elastic/react-search-ui-views";
import "@elastic/react-search-ui-views/lib/styles/styles.css";

import {
  buildAutocompleteQueryConfig,
  buildFacetConfigFromConfig,
  buildSearchOptionsFromConfig,
  getConfig,
  getFacetFields
} from "./config/config-helper";

const { titleField, urlField, thumbnailField } = getConfig();

const connector = new ElasticsearchAPIConnector({
  host: "http://localhost:9200",
  index: "pisos_index"
});

const config = {
  apiConnector: connector,

  // BÚSQUEDA POR DEFECTO
  searchQuery: {
    search_fields: {
      title: {},
      neighborhood: {},
    },
    result_fields: {
      title: { raw: {} },
      price_eur: { raw: {} },
      rooms: { raw: {} },
      neighborhood: { raw: {} },
      url: { raw: {} },
      images: { raw: {} }
    },
    facets: buildFacetConfigFromConfig(),
  },

  // AUTOCOMPLETADO
  autocompleteQuery: buildAutocompleteQueryConfig(),

  // BUSCAR AUTOMÁTICAMENTE AL CARGAR
  alwaysSearchOnInitialLoad: true,
};

export default function App() {
  return (
    <SearchProvider 
      config={config}
      
      // BÚSQUEDA INICIAL VACÍA = MUESTRA TODO
      initialState={{ searchTerm: "" }}  
    >
      <WithSearch mapContextToProps={({ wasSearched }) => ({ wasSearched })}>
        {({ wasSearched }) => (
          <div className="App">
            <ErrorBoundary>
              <Layout
                header={<SearchBox autocompleteSuggestions={true} />}

                sideContent={
                  <div>
                    {getFacetFields().map(field => (
                      <Facet key={field} field={field} label={field} />
                    ))}
                  </div>
                }

                bodyContent={
                  <Results
                    titleField="title"
                    urlField="url"
                    shouldTrackClickThrough={false}
                    resultView={CustomResultView}   // ⭐ MOSTRAR IMÁGENES
                    bodyHeader={
                      <>
                        {wasSearched && <PagingInfo />}
                        {wasSearched && <ResultsPerPage />}
                      </>
                    }
                    bodyFooter={<Paging />}
                  />
                }
              />
            </ErrorBoundary>
          </div>
        )}
      </WithSearch>
    </SearchProvider>
  );
}
