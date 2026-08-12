# Synthetic Life development mode

Run the normal development server, then open the localhost URL with the
syntheticLife=1 query parameter.

This loads a deterministic, read-only fictional history for Mara Ellison. It
does not enter normal App startup, read normal Trace storage, or persist
synthetic records. Use Exit synthetic mode to remove the query flag and reload
normal Trace. The separate ground-truth biography lives in
src/development/syntheticLifeGroundTruth.js and is never passed into Trace.
