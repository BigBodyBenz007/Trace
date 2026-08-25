import React from "react";
import { GNOME_SECTIONS } from "../services/gnomeSections";
import RasterSceneCurrent from "./RasterSceneCurrent";

function GnomeCurrent(props) {
  return (
    <RasterSceneCurrent
      {...props}
      catalog="one-opener-ten-reusable"
      classPrefix="gnome"
      dataPrefix="gnome"
      rendererId="gnome-village"
      sections={GNOME_SECTIONS}
    />
  );
}

export default React.memo(GnomeCurrent);
