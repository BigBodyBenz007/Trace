import { useId, useState } from "react";
import { normalizeProductIngredients } from "../services/productIngredients";
import "./BarcodeIngredients.css";

export default function BarcodeIngredients({ ingredients, attribution }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const data = normalizeProductIngredients(ingredients);
  const text = data?.text;

  return (
    <section className="trace-barcode-ingredients" aria-label="Product ingredients">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="trace-barcode-ingredients__toggle"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        Ingredients
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
        </svg>
      </button>
      <div id={contentId} hidden={!expanded} className="trace-barcode-ingredients__details">
        {expanded && <>
          {text ? (
            <div
              aria-label="Ingredient text"
              className="trace-barcode-ingredients__text"
              lang={data.language || undefined}
              role="region"
              tabIndex={0}
            >
              <p>{text}</p>
            </div>
          ) : <p className="trace-barcode-ingredients__unavailable">Ingredient information unavailable.</p>}
          {attribution && <p className="trace-barcode-ingredients__metadata">Source: {attribution}</p>}
          {data?.language && <p className="trace-barcode-ingredients__metadata">Language: {data.language}</p>}
        </>}
      </div>
    </section>
  );
}
