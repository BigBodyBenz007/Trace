import React from "react";
import { HAUNTED_FOREST_SECTIONS } from "../services/hauntedForestSections";
import RasterSceneCurrent from "./RasterSceneCurrent";

function HauntedForestCurrent(props) {
  return (
    <RasterSceneCurrent
      {...props}
      catalog="ten-section"
      classPrefix="forest"
      dataPrefix="forest"
      rendererId="forest-path"
      sections={HAUNTED_FOREST_SECTIONS}
    />
  );
}

export default React.memo(HauntedForestCurrent);
