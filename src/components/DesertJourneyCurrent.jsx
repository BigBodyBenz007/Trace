import React from "react";
import {
  DESERT_SCENERY_HEIGHT,
  DESERT_SCENERY_WIDTH,
  getDesertSection,
  getNearbyDesertSections,
} from "../services/desertJourneyScenes";
import BakedJourneyCurrent from "./BakedJourneyCurrent";

function DesertJourneyCurrent(props) {
  return (
    <BakedJourneyCurrent
      {...props}
      catalog="baked-continuous-v2"
      classPrefix="desert"
      dataPrefix="desert"
      getNearbySections={getNearbyDesertSections}
      getSection={getDesertSection}
      openerRegion="sphinx-opener"
      rendererId="desert-journey"
      sceneryHeight={DESERT_SCENERY_HEIGHT}
      sectionWidth={DESERT_SCENERY_WIDTH}
    />
  );
}

export default React.memo(DesertJourneyCurrent);
