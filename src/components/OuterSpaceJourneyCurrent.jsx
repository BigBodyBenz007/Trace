import React from "react";
import {
  OUTER_SPACE_SCENERY_HEIGHT,
  OUTER_SPACE_SCENERY_WIDTH,
  getNearbyOuterSpaceSections,
  getOuterSpaceSection,
} from "../services/outerSpaceJourneyScenes";
import BakedJourneyCurrent from "./BakedJourneyCurrent";

function OuterSpaceJourneyCurrent(props) {
  return (
    <BakedJourneyCurrent
      {...props}
      catalog="approved-continuous-v1"
      classPrefix="outer-space"
      dataPrefix="outer-space"
      getNearbySections={getNearbyOuterSpaceSections}
      getSection={getOuterSpaceSection}
      openerRegion="star-gate-opener"
      rendererId="outer-space-journey"
      sceneryHeight={OUTER_SPACE_SCENERY_HEIGHT}
      sectionWidth={OUTER_SPACE_SCENERY_WIDTH}
    />
  );
}

export default React.memo(OuterSpaceJourneyCurrent);
