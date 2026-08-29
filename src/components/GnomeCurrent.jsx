import React from "react";
import {
  GNOME_SCENERY_HEIGHT,
  GNOME_SCENERY_WIDTH,
  getGnomeSection,
  getGnomeSectionAtOffset,
  getNearbyGnomeSections,
} from "../services/gnomeSections";
import BakedJourneyCurrent from "./BakedJourneyCurrent";

function GnomeCurrent(props) {
  return (
    <BakedJourneyCurrent
      {...props}
      catalog="approved-golden-path-v1"
      classPrefix="gnome"
      dataPrefix="gnome"
      getNearbySections={getNearbyGnomeSections}
      getSection={getGnomeSection}
      getSectionAtOffset={getGnomeSectionAtOffset}
      openerRegion="gnome-king-opener"
      rendererId="gnome-village"
      sceneryHeight={GNOME_SCENERY_HEIGHT}
      sectionWidth={GNOME_SCENERY_WIDTH}
    />
  );
}

export default React.memo(GnomeCurrent);
