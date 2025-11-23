import React from "react";
import CustomFacetView from "./CustomFacetView";

export default function PriceFacetView(props) {
  return <CustomFacetView {...props} field="price_eur" />;
}