import React from "react";

import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

import {
  ErrorBoundary,
  Facet,
  SearchProvider,
  SearchBox,
  Results,
  PagingInfo,
  ResultsPerPage,
  Paging,
  Sorting,
  WithSearch
} from "@elastic/react-search-ui";
import { Layout } from "@elastic/react-search-ui-views";
import "@elastic/react-search-ui-views/lib/styles/styles.css";

import {
  buildAutocompleteQueryConfig,
  buildFacetConfigFromConfig,
  buildSearchOptionsFromConfig,
  buildSortOptionsFromConfig,
  getConfig,
  getFacetFields
} from "./config/config-helper";

const { hostIdentifier, searchKey, endpointBase, engineName } = getConfig();

const connector = new ElasticsearchAPIConnector({
  host: "http://localhost:9200",
  index: "pisos_index"
});

// const config = {
//   searchQuery: {
//     facets: buildFacetConfigFromConfig(),
//     ...buildSearchOptionsFromConfig()
//   },
//   autocompleteQuery: buildAutocompleteQueryConfig(),
//   apiConnector: connector,
//   alwaysSearchOnInitialLoad: true
// };

const config = {
  host: "http://localhost:9200", // your Elasticsearch URL
  index: "pisos_index",          // your index name
  searchOptions: {
    // Optional: fields to search in
    searchableFields: ["title", "neighborhood"],
    resultFields: {
      title: { snippet: { size: 100, fallback: true } },
      price_eur: { raw: {} },
      rooms: { raw: {} },
      neighborhood: { raw: {} },
      url: { raw: {} },
      images: { raw: {} },
    },
  },
  autocompleteQuery: {
    // Optional: fields to suggest autocomplete from
    suggestions: {
      types: ["documents"],
      fields: ["title"],
    },
  },
};


// export default function App() {
//   return (
//     <SearchProvider config={config}>
//       <WithSearch mapContextToProps={({ wasSearched }) => ({ wasSearched })}>
//         {({ wasSearched }) => {
//           return (
//             <div className="App">
//               <ErrorBoundary>
//                 <Layout
//                   header={<SearchBox autocompleteSuggestions={true} />}
//                   sideContent={
//                     <div>
//                       {wasSearched && (
//                         <Sorting
//                           label={"Sort by"}
//                           sortOptions={buildSortOptionsFromConfig()}
//                         />
//                       )}
//                       {getFacetFields().map(field => (
//                         <Facet key={field} field={field} label={field} />
//                       ))}
//                     </div>
//                   }
//                   bodyContent={
//                     <Results
//                       titleField={getConfig().titleField}
//                       urlField={getConfig().urlField}
//                       thumbnailField={getConfig().thumbnailField}
//                       shouldTrackClickThrough={true}
//                     />
//                   }
//                   bodyHeader={
//                     <React.Fragment>
//                       {wasSearched && <PagingInfo />}
//                       {wasSearched && <ResultsPerPage />}
//                     </React.Fragment>
//                   }
//                   bodyFooter={<Paging />}
//                 />
//               </ErrorBoundary>
//             </div>
//           );
//         }}
//       </WithSearch>
//     </SearchProvider>
//   );
// }

// import { SearchProvider, WithSearch, SearchBox, Results, Facet, Paging, PagingInfo, ResultsPerPage } from "@elastic/react-search-ui";

export default function App() {
  return (
    <SearchProvider config={config}>
      <WithSearch mapContextToProps={({ wasSearched }) => ({ wasSearched })}>
        {({ wasSearched }) => (
          <div className="App">
            <ErrorBoundary>
              <Layout
                header={<SearchBox autocompleteSuggestions={true} />}
                sideContent={
                  <div>
                    {wasSearched &&
                      getFacetFields().map(field => <Facet key={field} field={field} label={field} />)}
                  </div>
                }
                bodyContent={
                  <Results
                    titleField={getConfig().titleField}
                    urlField={getConfig().urlField}
                    thumbnailField={getConfig().thumbnailField}
                    shouldTrackClickThrough={true}
                    bodyHeader={
                      <React.Fragment>
                        {wasSearched && <PagingInfo />}
                        {wasSearched && <ResultsPerPage />}
                      </React.Fragment>
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

