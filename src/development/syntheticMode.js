export function shouldLoadSyntheticLife(environment, search) {
  return (
    environment === "development" &&
    new URLSearchParams(search).get("syntheticLife") === "1"
  );
}
