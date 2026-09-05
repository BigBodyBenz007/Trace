import LegalDocumentPage from "./LegalDocumentPage";

export default function TermsOfServicePage({ onBackToSettings }) {
  return <LegalDocumentPage documentId="terms" onBackToSettings={onBackToSettings} />;
}
