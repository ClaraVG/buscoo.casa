// src/components/SurfaceFacetView.js
import React from "react";
import CustomFacetView from "./CustomFacetView";

export default function SurfaceFacetView(props) {
  return <CustomFacetView {...props} field="surface_m2" />;
}