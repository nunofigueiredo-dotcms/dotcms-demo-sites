// Seed copy for the publishing demo. Realistic for an Academic & Government
// marketing team, and fictional: no real people, studies, customers or figures.
// Numbers are illustrative and labelled as such in the proof points.
import { sb } from "../lib/api.mjs";
const { h, p, ul, quote, doc } = sb;

const OWNER = "eleanor.shaw@publishing-demo.example";
const SME = "priya.raman@publishing-demo.example";

// ---------------------------------------------------------------------------
// Messaging sources of truth
// ---------------------------------------------------------------------------
export const SOURCES = [
  {
    key: "research-integrity", urlTitle: "research-integrity", category: "pdResearchIntegrity", version: 3,
    title: "Research integrity: trust as a shared responsibility",
    owner: SME, approvedDate: "2026-09-14", reviewByDate: "2027-03-14", status: "current",
    keyMessages: doc([
      h(2, "Positioning"),
      p("Research integrity is a shared responsibility between authors, institutions, funders and publishers. We position ourselves as a partner that makes integrity checks routine, not as a gatekeeper."),
      h(3, "Key messages"),
      ul([
        "Integrity screening happens before peer review, so editors spend their time on science, not on detection.",
        "We publish what we check and how: transparency builds more trust than claims.",
        "Retractions are part of a healthy record. We make corrections faster and easier to find.",
      ]),
    ]),
    proofPoints: doc([
      ul([
        "**Illustrative:** every submission to participating journals is screened for image manipulation and paper-mill signals before review.",
        "**Illustrative:** median time from integrity concern raised to editorial decision reduced by a third across the pilot portfolio.",
        "The integrity policy and screening steps are published on every journal homepage.",
      ]),
    ]),
    doNotSay: "\"fraud-proof\" → \"screened for integrity issues before review\"\n\"we catch all paper mills\" → \"we screen for known paper-mill signals\"\n\"bad actors\" (about researchers) → \"integrity concerns\"",
  },
  {
    key: "open-access", urlTitle: "open-access-v1", category: "pdOpenAccess", version: 1,
    title: "Open access: choice for every author",
    owner: OWNER, approvedDate: "2025-11-03", reviewByDate: "2026-05-03", status: "superseded",
    keyMessages: doc([
      h(2, "Positioning"),
      p("Open access gives authors choice. We offer gold, hybrid and green routes so every researcher can meet their funder's requirements."),
      h(3, "Key messages"),
      ul([
        "Authors can publish open access in most of our journals.",
        "Transformative agreements cover article publishing charges for many institutions.",
        "Green open access is supported through accepted-manuscript sharing.",
      ]),
    ]),
    proofPoints: doc([ul(["**Illustrative:** over 2,000 journals offer an open access option (2024 figure)."])]),
    doNotSay: "\"free to publish\" → \"covered by your institution's agreement\"",
  },
  {
    key: "open-access", urlTitle: "open-access", category: "pdOpenAccess", version: 2,
    title: "Open access: equitable routes to publish and to read",
    owner: OWNER, approvedDate: "2026-10-01", reviewByDate: "2027-04-01", status: "current", supersedes: "open-access-v1",
    keyMessages: doc([
      h(2, "Positioning"),
      p("Open access is about equity on both sides: researchers who want to publish and readers who need access. We lead with outcomes for institutions and funders, not with the number of journals."),
      h(3, "Key messages"),
      ul([
        "Institutional agreements make open access the default for authors at participating institutions, with no invoices to chase.",
        "Waivers and discounts mean that cost is not a barrier for researchers in lower-income countries.",
        "Every open access article carries a clear licence and funder acknowledgement, so compliance reporting is simple.",
      ]),
      h(3, "What changed from version 1"),
      p("Version 1 led with journal counts and the word \"choice\". Funders and libraries told us they care about equity and reporting, so version 2 leads with those. The 2024 journal count is retired."),
    ]),
    proofPoints: doc([
      ul([
        "**Illustrative:** 6 in 10 articles from institutions with an agreement were published open access in 2025.",
        "**Illustrative:** automatic waivers are available in more than 100 countries.",
        "Licence and funder data are delivered to institutional repositories automatically.",
      ]),
    ]),
    doNotSay: "\"free to publish\" → \"covered by your institution's agreement\"\n\"2,000 journals\" (retired 2024 figure) → lead with equity and reporting outcomes\n\"we fund your open access\" → \"your institution's agreement covers the charge\"",
  },
  {
    key: "ai-in-research", urlTitle: "ai-in-research", category: "pdAiInResearch", version: 2,
    title: "AI in research: responsible, cited and checkable",
    owner: OWNER, approvedDate: "2026-08-20", reviewByDate: "2027-02-20", status: "current",
    keyMessages: doc([
      h(2, "Positioning"),
      p("AI helps researchers find, read and connect evidence faster. Our principle is that every AI-generated answer must be grounded in trusted, cited sources a researcher can check."),
      h(3, "Key messages"),
      ul([
        "Answers cite the peer-reviewed sources they draw on, so researchers can verify every claim.",
        "We don't train models on customer data without permission.",
        "Human judgement stays in charge: AI supports discovery and reading, not peer review decisions.",
      ]),
    ]),
    proofPoints: doc([
      ul([
        "Responsible AI principles are published and reviewed annually.",
        "**Illustrative:** in a pilot with 12 universities, researchers reported saving two to three hours a week on literature discovery.",
      ]),
    ]),
    doNotSay: "\"AI replaces the literature review\" → \"AI speeds up discovery; researchers still read and judge\"\n\"hallucination-free\" → \"grounded in cited sources you can check\"\n\"autonomous research\" → avoid",
  },
  {
    key: "research-funding-impact", urlTitle: "research-funding-impact", category: "pdResearchFundingImpact", version: 1,
    title: "Research funding impact: show what funding achieves",
    owner: OWNER, approvedDate: "2026-07-07", reviewByDate: "2027-01-07", status: "current",
    keyMessages: doc([
      h(2, "Positioning"),
      p("Funders and governments need to show what public research money achieves. We help them connect funding to outputs, collaboration and societal outcomes with evidence they can share."),
      h(3, "Key messages"),
      ul([
        "Link grants to publications, patents and policy citations in one view.",
        "Benchmark against comparable programmes and countries with transparent methods.",
        "Impact stories are evidence-based and reproducible, not anecdotes.",
      ]),
    ]),
    proofPoints: doc([
      ul([
        "**Illustrative:** policy citations tracked from more than 40 government and intergovernmental sources.",
        "Methodology notes are published alongside every benchmark.",
      ]),
    ]),
    doNotSay: "\"prove ROI\" → \"show evidence of outcomes\"\n\"rank your researchers\" → \"understand your portfolio\"",
  },
];

// ---------------------------------------------------------------------------
// Localised messages (each walks to a different workflow state)
// ---------------------------------------------------------------------------
export const LOCALISED = [
  {
    key: "lm-dach-open-access", title: "DACH: Open Access – gerechte Wege zum Publizieren und Lesen",
    parent: "open-access", region: "dach", language: "de-de", targetChannel: "email", smeNeeded: "yes",
    body: doc([
      p("Open Access bedeutet Fairness auf beiden Seiten: für Forschende, die publizieren, und für alle, die Zugang zu Wissen brauchen."),
      ul([
        "Mit institutionellen Vereinbarungen ist Open Access für Autorinnen und Autoren an teilnehmenden Einrichtungen der Standard – ohne Rechnungen.",
        "Lizenz- und Förderangaben werden automatisch an Repositorien geliefert, damit das Reporting an DFG und FWF einfach bleibt.",
      ]),
      p("Hinweis für das SME-Review: Bitte die Formulierung zu DFG/FWF-Berichtspflichten prüfen."),
    ]),
    walk: ["Submit for SME Review"], // → SME Review
    comments: { "Submit for SME Review": "Please check the DFG/FWF reporting wording before it goes to Eleanor." },
  },
  {
    key: "lm-iberia-ai", title: "Iberia: IA en la investigación – responsable, citada y verificable",
    parent: "ai-in-research", region: "iberia", language: "es-es", targetChannel: "web", smeNeeded: "no",
    body: doc([
      p("La IA ayuda a los investigadores a encontrar, leer y conectar evidencias más rápido. Cada respuesta generada por IA se basa en fuentes revisadas por pares y citadas, que el investigador puede comprobar."),
      ul([
        "Las respuestas citan las fuentes revisadas por pares en las que se basan.",
        "No entrenamos modelos con datos de clientes sin permiso.",
        "El criterio humano sigue al mando: la IA apoya el descubrimiento, no las decisiones de revisión por pares.",
      ]),
    ]),
    walk: ["Submit for Approval", "Approve"], // → Approved
    comments: { "Submit for Approval": "Localised from AI in research v2 for the Iberia web pages.", Approve: "Approved. Matches v2 key messages." },
  },
  {
    key: "lm-apac-funding", title: "APAC: Showing what research funding achieves",
    parent: "research-funding-impact", region: "apac", language: "en-us", targetChannel: "paid-social", smeNeeded: "no",
    body: doc([
      p("Governments across APAC invest billions in research. Now you can show what that funding achieves: from publications to policy impact, in one evidence-based view."),
      p("Proven ROI for every research dollar. Rank your researchers against the region's best."),
    ]),
    walk: ["Submit for Approval", "Reject"], // → back to Draft with a comment
    comments: {
      "Submit for Approval": "Paid social copy for the APAC funders campaign.",
      Reject: "Two do-not-say phrases: \"proven ROI\" and \"rank your researchers\". Use \"show evidence of outcomes\" and \"understand your portfolio\" from the source of truth, then resubmit.",
    },
  },
];

// ---------------------------------------------------------------------------
// Thought leadership articles
// ---------------------------------------------------------------------------
export const ARTICLES = [
  {
    urlTitle: "integrity-checks-before-peer-review", sot: "research-integrity", category: "pdResearchIntegrity",
    title: "Why integrity checks belong before peer review",
    h1: "Why integrity checks belong before peer review",
    standfirst: "Editors and reviewers are scarce. Screening every submission for integrity signals before review protects their time and the scholarly record.",
    author: "Dr. Helen Okafor", authorRole: "Director, Publishing Ethics (fictional)", lastReviewed: "2026-10-12",
    seoSummary: "Integrity checks before peer review screen every submission for image manipulation and paper-mill signals, so editors and reviewers spend their time on the science. Publishing the checks openly builds trust with researchers, institutions and funders.",
    faq: { "What is pre-review integrity screening?": "Automated and expert checks for image manipulation, paper-mill signals and undeclared conflicts, run before a manuscript reaches reviewers.", "Does screening replace peer review?": "No. It removes problem submissions early so that peer review can focus on scientific quality." },
    body: [
      p("Peer review was designed to judge the quality of science, not to detect fabrication at industrial scale. Yet that is the job many editors now find themselves doing."),
      h(2, "The cost of finding problems late"),
      p("When an integrity issue surfaces after publication, everyone pays: authors, the journal, the institution and the reader who relied on the result. Retractions take months, and the original article keeps being cited."),
      h(3, "What editors told us"),
      ul(["Too much reviewer time goes to submissions that should never have reached review.", "Signals are scattered across tools, so decisions are slow.", "Authors want to know what is checked and why."]),
      h(2, "Moving checks upstream"),
      p("Screening every submission before review changes the economics. Editors see one integrity summary per manuscript, and reviewers receive submissions that have already passed basic checks."),
      quote("Integrity is not a filter at the end of the process. It is a property of the whole process."),
      h(2, "Transparency is part of the check"),
      p("Publishing what we screen for, and how, matters as much as the screening itself. Researchers trust a process they can see."),
    ],
  },
  {
    urlTitle: "open-access-agreements-what-libraries-need", sot: "open-access", category: "pdOpenAccess",
    title: "Open access agreements: what libraries actually need",
    h1: "Open access agreements: what libraries actually need",
    standfirst: "Library leaders are clear: an agreement is only as good as the reporting behind it. Here is what they ask for, and how to deliver it.",
    author: "Tomás Herrera", authorRole: "Head of Library Partnerships, EMEA (fictional)", lastReviewed: "2026-10-20",
    seoSummary: "Libraries need open access agreements that make publishing the default for their authors and give them clear, automatic reporting on articles, licences and funders. Equity commitments such as waivers matter as much as price.",
    faq: { "What should an open access agreement include?": "Default open access for eligible authors, automatic eligibility checks, clear licences and complete reporting for the library and funders.", "How do libraries report on open access?": "Through article-level data on licence, funder and eligibility, delivered to repositories and dashboards automatically." },
    body: [
      p("Five years into the shift to transformative agreements, the conversation with libraries has changed. Price still matters, but the questions now start with reporting and equity."),
      h(2, "Default, not opt-in"),
      p("Authors should not have to know that an agreement exists. Eligibility is checked at acceptance, and open access is the default outcome."),
      h(3, "How your Organisation can prepare"),
      p("Map which departments publish most, agree who approves eligibility questions, and decide which reports your funders expect before the agreement starts."),
      h(2, "Reporting that answers the funder's question"),
      ul(["Article-level licence and funder data.", "Eligibility decisions with dates and reasons.", "Delivery to the institutional repository without manual uploads."]),
      h(2, "Equity is part of the agreement"),
      p("Waivers and discounts for researchers in lower-income countries are part of what libraries now expect a responsible publisher to offer."),
    ],
  },
  {
    urlTitle: "ai-answers-researchers-can-check", sot: "ai-in-research", category: "pdAiInResearch",
    title: "AI answers researchers can check",
    h1: "AI answers researchers can check",
    standfirst: "Researchers will use AI for discovery whether we design for it or not. The responsible answer is AI that cites its sources and leaves judgement with people.",
    author: "Dr. Anika Sørensen", authorRole: "VP Research Products (fictional)", lastReviewed: "2026-09-30",
    seoSummary: "Responsible AI for research grounds every answer in peer-reviewed, cited sources that researchers can open and verify. It speeds up discovery and reading while leaving scientific judgement and peer review decisions with people.",
    faq: { "Can researchers trust AI-generated answers?": "Only when the answer cites the sources it draws on and researchers can check them. Grounding in peer-reviewed literature is the baseline.", "Is customer data used to train models?": "Not without permission." },
    body: [
      p("Generative AI has made one thing obvious: fluent text is cheap. Trustworthy text is not."),
      h(2, "Grounded, cited, checkable"),
      p("An answer that a researcher cannot trace back to a source is a liability in a literature review. Every claim should link to the peer-reviewed passage it came from."),
      h(3, "Three tests for research AI"),
      ul(["Does every answer cite its sources?", "Can the researcher open the source in one click?", "Is it clear what the AI did not find?"]),
      h(2, "Judgement stays with people"),
      p("AI is good at finding and summarising. Deciding what the evidence means, and whether a paper should be published, remains a human responsibility."),
    ],
  },
];

// ---------------------------------------------------------------------------
// Newsletter and asset pack
// ---------------------------------------------------------------------------
export const NEWSLETTER = {
  title: "Research Leaders Briefing — November 2026", channel: "linkedin", issueDate: "2026-11-18",
  intro: "This month: why integrity checks belong before peer review, and what libraries need from open access agreements.",
  articles: ["integrity-checks-before-peer-review", "open-access-agreements-what-libraries-need"],
  walk: ["Submit for Approval", "Approve", "Ready for External Channel"],
  comments: { "Submit for Approval": "November LinkedIn newsletter, two articles.", Approve: "Approved for LinkedIn.", "Ready for External Channel": "Scheduled in Sprinklr for 18 Nov, 09:00 CET." },
};

export const ASSET_PACK = {
  title: "Open Access Week 2026 partner pack",
  description: "One-page briefing for library partners on open access agreements, based on the current Open access source of truth (v2).",
  distributionPartner: "Regional library consortia (fictional)", event: "Open Access Week 2026",
  related: ["open-access", "research-integrity"],
  pdfName: "open-access-week-2026-partner-pack.pdf",
};

// The banner on the Insights home page, placed in the page's container.
export const HOME_BANNER = {
  title: "Insights home banner",
  eyebrow: "Insights for research leaders",
  headline: "Trusted evidence. Clear decisions.",
  intro: "Perspectives for university leaders, librarians, funders and governments on research integrity, open access, responsible AI and the impact of research funding.",
};
