import { useLayoutEffect, useRef } from "react";

export const TRACE_LEGAL_EMAIL = "traceappsupporthelp@gmail.com";
export const TRACE_LEGAL_DATE = "September 5, 2026";

function ContactLink() {
  return <a href={`mailto:${TRACE_LEGAL_EMAIL}`}>{TRACE_LEGAL_EMAIL}</a>;
}

const privacySections = [
  {
    title: "1. Who we are",
    content: <p>Trace is a personal tracking application operated by Benjamin J. Martin. Questions or privacy requests may be sent to <ContactLink />.</p>,
  },
  {
    title: "2. Information you choose to store",
    content: <>
      <p>Trace lets you enter or create information that may include sensitive health and wellness information, including:</p>
      <ul>
        <li>memories, descriptions, dates, categories, Journal entries, unfinished Journal drafts, and Trophy Case entries;</li>
        <li>nutrition entries and goals, water intake, saved foods, barcode identifiers, and provider-sourced food details;</li>
        <li>Health measurements such as body weight and other measurements;</li>
        <li>medication and supplement entries, saved compounds, dose schedules and occurrence status, protocols and results, and injection-site records;</li>
        <li>workouts, exercise and set details, workout templates, planned workouts, active workout drafts, daily actions, readiness information, duration, calorie estimates, and saved exercises;</li>
        <li>photos you select for memories or workouts; and</li>
        <li>app settings, including units, theme, Home visibility, motion preference, and Journal Lock settings.</li>
      </ul>
      <p>You decide what to enter. Avoid entering information you do not want stored on the device or included in a backup.</p>
    </>,
  },
  {
    title: "3. Local-first storage",
    content: <>
      <p>Trace currently has no user accounts or cloud synchronization. Durable records and settings are stored in browser local storage on your device. Selected photo files are stored in the browser&apos;s IndexedDB database. A service worker may keep a rebuildable copy of the application shell and static files so Trace can open more reliably.</p>
      <p>Trace data normally remains in that browser profile unless you initiate a barcode lookup, open a third-party link, or export or share a backup. Clearing Trace&apos;s site data, clearing browser storage, removing the browser profile, or uninstalling the installed web app may permanently remove local information.</p>
    </>,
  },
  {
    title: "4. Journal Lock",
    content: <>
      <p>Journal Lock is optional and applies only to saved Journal entries and the unfinished Journal draft. When enabled, Trace encrypts that Journal content on the device using browser cryptography and protects access with the password and recovery credential you create. Journal content is decrypted in memory while the Journal is unlocked.</p>
      <p>Journal Lock does not encrypt the rest of Trace, device storage as a whole, screenshots, notifications, or copies you separately export. Trace cannot recover a lost Journal password or recovery phrase. If both are lost, the encrypted Journal cannot be recovered. An encrypted Journal remains encrypted inside a Trace backup, but the backup file contains the rest of the included Trace data in readable JSON and must be protected accordingly.</p>
    </>,
  },
  {
    title: "5. Photos and camera access",
    content: <>
      <p>Photos are added only when you use a photo picker and select them. Trace stores the selected photo bytes locally in IndexedDB, links them to the relevant memory or workout, removes associated photo records when the related photo or record is deleted where the app provides that control, and includes stored photos in a Trace backup.</p>
      <p>The barcode scanner requests camera permission only when camera scanning starts. Live frames are processed on the device to read a barcode. Trace does not save or upload those camera images or video frames, and it stops acquired camera tracks when scanning ends, the scanner closes, or the app is backgrounded. You may instead type the barcode manually.</p>
    </>,
  },
  {
    title: "6. Barcode lookup and information that leaves the device",
    content: <>
      <p>After you submit a valid UPC, EAN, or GTIN barcode that is not found in Trace&apos;s local or saved-food catalogs or local response cache, Trace sends only that barcode identifier to its same-origin <code>/api/nutrition/barcode</code> serverless endpoint. The endpoint searches USDA FoodData Central first and then Open Food Facts when necessary. It returns normalized product and nutrition details rather than the providers&apos; raw responses.</p>
      <p>The browser keeps successful or incomplete normalized remote results in a rebuildable local cache for up to 30 days, with a maximum of 500 records. This cache is not included in Trace backups. If you use a result or save a custom food, the selected provider details may become part of your locally stored nutrition or saved-food data and therefore a backup.</p>
      <p>Trace&apos;s hosting and infrastructure provider, currently Vercel, and the food-data providers may receive routine request information such as the barcode, IP address, date and time, and technical request metadata needed to deliver and secure their services. Their logging and retention practices are controlled by them and are not established by this repository.</p>
    </>,
  },
  {
    title: "7. How information is used",
    content: <p>Trace processes the information you provide to display, organize, edit, calculate, search, and back up your records; operate Journal Lock; load selected photos; generate local schedules and estimates; and perform barcode lookups you request. Trace does not currently use analytics, targeted advertising, advertising identifiers, cross-site tracking, cookies, crash-reporting services, user accounts, or cloud synchronization.</p>,
  },
  {
    title: "8. Backups and restore",
    content: <>
      <p>Backup creation is user-controlled. Trace creates one JSON file containing the durable local data domains and stored photos. Depending on browser support, Trace downloads the file or opens the operating system share sheet so you can choose a destination such as Files. Trace does not choose or control that destination.</p>
      <p>Backup files use schema validation and SHA-256 integrity digests to detect malformed or changed content; these digests are not encryption and do not make the backup confidential. Restore requires confirmation, validates the backup, and replaces—not merges—the current durable Trace data and photo database. Trace attempts to restore the previous local state if replacement fails. You are responsible for safeguarding, retaining, sharing, and deleting exported copies wherever you place them.</p>
    </>,
  },
  {
    title: "9. Retention and deletion",
    content: <>
      <p>Local records remain until you delete them with an available record-specific control, erase or disable Journal Lock as applicable, replace the local dataset through restore, or remove Trace&apos;s browser/site data. Trace does not currently provide a single in-app button that erases every data domain. Browser controls can clear all local storage, IndexedDB data, and cached app files; uninstall behavior varies by browser and operating system.</p>
      <p>Ending a schedule or marking an item complete does not necessarily delete its history. Exported backups remain wherever you saved or shared them until you delete those copies. Routine infrastructure or provider logs, if created, are retained under the relevant provider&apos;s practices.</p>
    </>,
  },
  {
    title: "10. Security and limitations",
    content: <p>Trace uses browser storage, bounded and validated network requests, backup validation and integrity checks, transactional recovery for selected sensitive updates, and optional Journal encryption. No storage, encryption, transmission, or software system is perfectly secure. Anyone with access to your unlocked device, browser profile, exported backup, or Journal credentials may be able to access information. Keep your device, browser profile, backups, password, and recovery phrase secure.</p>,
  },
  {
    title: "11. Your choices and permissions",
    content: <p>You may choose what to enter, decline or withdraw camera permission in browser or device settings, use manual barcode entry, remove selected photos or records using available controls, export a backup, and clear Trace site data. Photo-library and file permissions are controlled by your browser and operating system. Withdrawing a permission does not delete information already selected and stored.</p>,
  },
  {
    title: "12. Third-party services and links",
    content: <p>Barcode lookup uses <a href="https://fdc.nal.usda.gov/" rel="noreferrer noopener" target="_blank">USDA FoodData Central</a> and <a href="https://world.openfoodfacts.org/" rel="noreferrer noopener" target="_blank">Open Food Facts</a>. Open Food Facts content is contributed by its community and its database is offered under the Open Database License (ODbL); displayed records retain source attribution and links. Trace may also link to provider pages. Third-party sites and services have their own terms, privacy practices, accuracy, availability, and licensing.</p>,
  },
  {
    title: "13. Children",
    content: <p>Trace is not directed to children under 13, and children under 13 must not use it. If you believe a child under 13 has provided information in connection with Trace, contact <ContactLink />. Because Trace is local-first and has no accounts, the operator generally cannot inspect or remove information stored only on a user&apos;s device.</p>,
  },
  {
    title: "14. Privacy rights",
    content: <p>Privacy rights vary by location. Most Trace information is controlled directly through the browser and is not received by the operator. You may contact <ContactLink /> with a privacy question or request. We will respond as required by applicable law, but we may be unable to identify or access data that exists only on your device.</p>,
  },
  {
    title: "15. Changes to this Policy",
    content: <p>This Policy may change when Trace&apos;s features, practices, providers, or legal obligations change. The updated version will be posted at this public page with a revised effective or last-updated date. Review it periodically.</p>,
  },
  {
    title: "16. Contact",
    content: <p>For support or privacy questions, email Benjamin J. Martin at <ContactLink />.</p>,
  },
];

const termsSections = [
  { title: "1. Acceptance of these Terms", content: <p>These Terms of Service govern your use of Trace. By accessing or using Trace, you agree to these Terms. If you do not agree, do not use Trace.</p> },
  { title: "2. Eligibility", content: <p>You must be at least 13 years old to use Trace. If you are under the age of legal majority where you live, you must have permission from a parent or legal guardian.</p> },
  { title: "3. Personal tracking tool", content: <p>Trace is a personal tracking and organizational tool for memories, Journal content, nutrition, water, Health measurements, medications and supplements, protocols, injections, workouts, schedules, and related information. You choose what to record and remain responsible for how you use it.</p> },
  { title: "4. Not medical care", content: <>
      <p><strong>Trace is not a medical device and does not diagnose, treat, cure, or prevent any disease or medical condition. Trace does not provide medical advice, diagnosis, emergency services, prescribing, or professional treatment.</strong></p>
      <p>Consult a qualified healthcare professional for medical advice, diagnosis, treatment, and decisions involving medication, supplements, exercise, nutrition, injections, or health. Medication and supplement schedules only record information entered by you; they are not prescriptions or dosage recommendations. Injection-site markers show record recency, not whether a location is medically safe.</p>
      <p><strong>If you think you may have a medical emergency, call emergency services immediately. Do not rely on Trace.</strong></p>
    </> },
  { title: "5. Estimates and third-party data", content: <p>Nutrition data, barcode-provider records, calorie-burn ranges, one-repetition estimates, workout estimates, reminders, schedules, calculations, and other outputs may be incomplete, delayed, unavailable, or inaccurate. Independently verify product labels, medication instructions, doses and schedules, measurements, entries, provider sources, and important calculations before acting. A Trace confirmation indicates that information was recorded; it does not verify that the information is safe or correct.</p> },
  { title: "6. Your content", content: <p>You retain ownership of content you enter or select. You give Trace permission to process that content locally on your device, and to process a submitted barcode through the described providers, only as reasonably necessary to provide the features you request. You represent that you have the rights needed to use any content you add.</p> },
  { title: "7. Devices, storage, photos, and backups", content: <p>You are responsible for securing and maintaining your device, browser profile, local browser storage, selected photos, Journal credentials, and exported backups. Clearing storage, uninstalling, device failure, forgotten credentials, software changes, or an unsuccessful migration may cause loss. Verify that backups were saved to your intended destination and protect or delete copies outside Trace. Restore replaces the current local dataset rather than merging it.</p> },
  { title: "8. Acceptable use", content: <>
      <p>You may not misuse Trace. In particular, you may not:</p>
      <ul>
        <li>use Trace unlawfully, to harm others, or to violate another person&apos;s privacy or intellectual-property rights;</li>
        <li>attempt to gain unauthorized access to the app, its hosting, serverless endpoint, provider credentials, or another system;</li>
        <li>interfere with operation, defeat security or request limits, introduce malicious code, or automate abusive barcode requests; or</li>
        <li>misrepresent Trace output as medical advice, a prescription, guaranteed fact, or professional service.</li>
      </ul>
    </> },
  { title: "9. Trace ownership and license", content: <p>Trace, including its software, design, branding, and original content, is owned by Benjamin J. Martin or licensed to him and is protected by applicable law. Subject to these Terms, you receive a limited, revocable, non-exclusive, non-transferable license to use Trace for personal, lawful purposes. No other rights are granted.</p> },
  { title: "10. Third-party information and services", content: <p>Trace may use or link to third-party services and data, including USDA FoodData Central, Open Food Facts, and hosting infrastructure. Third-party names and trademarks belong to their owners. Provider content remains subject to applicable provider terms and licenses, including Open Food Facts database attribution and ODbL requirements. Trace does not control and is not responsible for third-party content, terms, privacy practices, accuracy, availability, or changes.</p> },
  { title: "11. Changes and availability", content: <p>Trace and any feature may be modified, limited, interrupted, suspended, or discontinued at any time. Local browser capabilities, operating-system behavior, network access, provider availability, and hosting may affect operation. No particular feature, provider, compatibility, or period of availability is promised.</p> },
  { title: "12. WARRANTY DISCLAIMER", content: <p><strong>TO THE FULLEST EXTENT PERMITTED BY LAW, TRACE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, SECURITY, OR AVAILABILITY. SOME JURISDICTIONS DO NOT ALLOW CERTAIN DISCLAIMERS, SO SOME OF THESE TERMS MAY NOT APPLY TO YOU.</strong></p> },
  { title: "13. Limitation of liability", content: <p>To the fullest extent permitted by law, Benjamin J. Martin will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, or use, arising from or related to Trace. To the extent liability cannot be excluded, total liability for all claims relating to Trace will not exceed the greater of the amount you paid specifically for Trace during the twelve months before the claim or US $100. These limits do not exclude liability that cannot lawfully be limited.</p> },
  { title: "14. Indemnity", content: <p>To the extent permitted by law, you agree to defend, indemnify, and hold harmless Benjamin J. Martin from third-party claims, damages, and reasonable costs arising from your unlawful misuse of Trace, your violation of these Terms, or content you use without sufficient rights. This section does not require indemnity for the operator&apos;s own unlawful conduct and does not limit rights that cannot be waived.</p> },
  { title: "15. Governing law and courts", content: <p>These Terms are governed by the laws of Oklahoma, United States, without regard to conflict-of-law rules. Subject to applicable consumer-protection law, disputes may be brought in courts with jurisdiction in Oklahoma. These Terms do not require arbitration and do not waive any right to participate in a class action.</p> },
  { title: "16. General terms", content: <p>If a provision is unenforceable, it will be limited or removed only as necessary and the remainder will continue. Failure to enforce a provision is not a waiver. You may not assign these Terms without written consent; the operator may assign them in connection with a transfer of Trace, subject to applicable law. These Terms and the Trace Privacy Policy are the entire agreement about your use of Trace and replace prior agreements on that subject.</p> },
  { title: "17. Changes to these Terms", content: <p>These Terms may be updated when Trace or applicable requirements change. The updated Terms will be posted here with a revised effective or last-updated date. Continued use after an update means you accept the revised Terms to the extent permitted by law.</p> },
  { title: "18. Contact", content: <p>Trace is operated by Benjamin J. Martin. Questions about these Terms may be sent to <ContactLink />.</p> },
];

const DOCUMENTS = {
  privacy: {
    title: "Trace Privacy Policy",
    kicker: "Legal & Privacy",
    lede: "How Trace handles information in the app as it exists today.",
    sections: privacySections,
  },
  terms: {
    title: "Trace Terms of Service",
    kicker: "Legal & Privacy",
    lede: "The terms that govern use of Trace.",
    sections: termsSections,
  },
};

export default function LegalDocumentPage({ documentId, onBackToSettings }) {
  const headingRef = useRef(null);
  const document = DOCUMENTS[documentId];

  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, [documentId]);

  if (!document) return null;

  return (
    <main className="trace-feature-page trace-feature-page--legal" data-testid={`${documentId}-page`}>
      <nav aria-label={`${document.title} navigation`} className="trace-legal-navigation">
        <button className="trace-action trace-action--secondary" onClick={onBackToSettings} type="button">Back to Settings</button>
      </nav>
      <article aria-labelledby={`${documentId}-title`} className="trace-feature-surface trace-legal-document">
        <header className="trace-feature-page__identity trace-legal-document__identity">
          <p className="trace-feature-page__kicker">{document.kicker}</p>
          <h1 id={`${documentId}-title`} ref={headingRef} tabIndex="-1">{document.title}</h1>
          <p className="trace-feature-page__lede">{document.lede}</p>
          <dl className="trace-legal-dates">
            <div><dt>Effective date</dt><dd>{TRACE_LEGAL_DATE}</dd></div>
            <div><dt>Last updated</dt><dd>{TRACE_LEGAL_DATE}</dd></div>
          </dl>
        </header>
        <div className="trace-legal-document__body">
          {document.sections.map((section) => (
            <section aria-labelledby={`${documentId}-${section.title.split(".")[0]}`} key={section.title}>
              <h2 id={`${documentId}-${section.title.split(".")[0]}`}>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </div>
      </article>
      <nav aria-label={`${document.title} footer navigation`} className="trace-legal-navigation trace-legal-navigation--footer">
        <button className="trace-action trace-action--secondary" onClick={onBackToSettings} type="button">Back to Settings</button>
      </nav>
    </main>
  );
}
