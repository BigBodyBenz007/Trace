import React from "react";
import {
  TO_KINGDOMS_AHEAD_SCENERY_HEIGHT,
  TO_KINGDOMS_AHEAD_SCENERY_WIDTH,
  getNearbyToKingdomsAheadSections,
  getToKingdomsAheadSection,
  getToKingdomsAheadSectionAtOffset,
} from "../services/toKingdomsAheadScenes";
import BakedJourneyCurrent from "./BakedJourneyCurrent";

function ToKingdomsAheadCurrent(props) {
  return (
    <BakedJourneyCurrent
      {...props}
      catalog="manifest-v1"
      classPrefix="to-kingdoms-ahead"
      dataPrefix="to-kingdoms-ahead"
      getNearbySections={getNearbyToKingdomsAheadSections}
      getSection={getToKingdomsAheadSection}
      getSectionAtOffset={getToKingdomsAheadSectionAtOffset}
      openerRegion="00-royal-gate-opener"
      rendererId="to-kingdoms-ahead"
      sceneryHeight={TO_KINGDOMS_AHEAD_SCENERY_HEIGHT}
      sectionWidth={TO_KINGDOMS_AHEAD_SCENERY_WIDTH}
    />
  );
}

export default React.memo(ToKingdomsAheadCurrent);
