export type CaseStatus = "pending" | "verified" | "rejected" | "in_review";
export type Priority = "high" | "medium" | "low";

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  sourceLineId: string;
}

export interface Directive {
  id: string;
  text: string;
  deadline: string;
  daysRemaining: number;
  department: string;
  priority: Priority;
  sourceLineId: string;
}

export interface JudgmentLine {
  id: string;
  text: string;
  highlight?: boolean;
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  title: string;
  court: string;
  judge: string;
  orderDate: string;
  petitioner: string;
  respondent: string;
  department: string;
  status: CaseStatus;
  priority: Priority;
  appealDeadlineDays: number;
  directives: Directive[];
  fields: ExtractedField[];
  judgmentLines: JudgmentLine[];
  filedBy: string;
  reviewedBy?: string;
  uploadedAt: string;
}

const judgmentBody = (caseNo: string, dept: string): JudgmentLine[] => [
  { id: "L1", text: "IN THE HIGH COURT OF KARNATAKA AT BENGALURU" },
  { id: "L2", text: `(Before the Hon'ble Mr. Justice K. Somashekar)` },
  { id: "L3", text: `Writ Petition No. ${caseNo}` },
  { id: "L4", text: "Dated this the 14th day of March, 2025" },
  { id: "L5", text: "BETWEEN:" },
  { id: "L6", text: "Sri. Rajesh Kumar S/o Late Narayanappa, aged about 47 years, R/at No. 23, 4th Cross, Jayanagar, Bengaluru — 560011 ... PETITIONER" },
  { id: "L7", text: "AND:" },
  { id: "L8", text: `1. The State of Karnataka, represented by its Principal Secretary, ${dept}, Vidhana Soudha, Bengaluru — 560001` },
  { id: "L9", text: "2. The Deputy Commissioner, Bengaluru Urban District ... RESPONDENTS" },
  { id: "L10", text: "JUDGMENT" },
  { id: "L11", text: "1. The petitioner has approached this Court under Article 226 of the Constitution of India, aggrieved by the inaction of the respondent authorities in disposing of his representation dated 02.07.2024." },
  { id: "L12", text: "2. The brief facts giving rise to the present petition are that the petitioner is the recorded owner of land bearing Sy. No. 47/2 measuring 1 acre 12 guntas." },
  { id: "L13", text: "3. Heard the learned counsel for the petitioner and the learned Additional Government Advocate appearing for the respondents." },
  { id: "L14", text: "4. After perusal of records, this Court is of the considered opinion that the inaction on the part of the respondents is unsustainable in law.", highlight: true },
  { id: "L15", text: "5. Accordingly, the respondents are directed to dispose of the petitioner's representation dated 02.07.2024, by passing a speaking order, within a period of SIX (6) WEEKS from the date of receipt of a copy of this order.", highlight: true },
  { id: "L16", text: "6. The Principal Secretary of the said department shall ensure compliance and a compliance affidavit shall be filed before the Registrar (Judicial) within FOURTEEN (14) DAYS thereafter.", highlight: true },
  { id: "L17", text: "7. Liberty is reserved to the parties to seek appropriate remedy in case of any grievance arising out of the order to be passed." },
  { id: "L18", text: "8. The Writ Petition stands disposed of in the above terms. No order as to costs." },
  { id: "L19", text: "Sd/-" },
  { id: "L20", text: "JUDGE" },
];

export const departments = [
  "Revenue Department",
  "Urban Development",
  "Home Department",
  "Education Department",
  "Health & Family Welfare",
  "Forest, Ecology & Environment",
  "Public Works Department",
];

const mk = (
  i: number,
  status: CaseStatus,
  priority: Priority,
  days: number,
  dept: string,
): CaseRecord => {
  const caseNo = `${10234 + i}/2025`;
  return {
    id: `case-${i}`,
    caseNumber: `WP No. ${caseNo}`,
    title: `Rajesh Kumar v. State of Karnataka & Ors.`,
    court: "High Court of Karnataka, Bengaluru",
    judge: "Hon'ble Mr. Justice K. Somashekar",
    orderDate: "14 March 2025",
    petitioner: "Sri. Rajesh Kumar",
    respondent: `State of Karnataka (${dept})`,
    department: dept,
    status,
    priority,
    appealDeadlineDays: days,
    uploadedAt: "2025-04-28 10:14",
    filedBy: "Smt. Anitha R., Section Officer",
    reviewedBy: status === "verified" ? "Sri. Mahesh Gowda, Legal Officer" : undefined,
    fields: [
      { id: "F1", label: "Case Number", value: `WP No. ${caseNo}`, confidence: 0.99, sourceLineId: "L3" },
      { id: "F2", label: "Court", value: "High Court of Karnataka, Bengaluru", confidence: 0.98, sourceLineId: "L1" },
      { id: "F3", label: "Presiding Judge", value: "Hon'ble Mr. Justice K. Somashekar", confidence: 0.97, sourceLineId: "L2" },
      { id: "F4", label: "Order Date", value: "14 March 2025", confidence: 0.99, sourceLineId: "L4" },
      { id: "F5", label: "Petitioner", value: "Sri. Rajesh Kumar", confidence: 0.94, sourceLineId: "L6" },
      { id: "F6", label: "Respondent Department", value: dept, confidence: 0.91, sourceLineId: "L8" },
      { id: "F7", label: "Relief Granted", value: "Direction to dispose representation in 6 weeks", confidence: 0.88, sourceLineId: "L15" },
      { id: "F8", label: "Compliance Affidavit Window", value: "14 days after compliance", confidence: 0.86, sourceLineId: "L16" },
    ],
    directives: [
      {
        id: "D1",
        text: "Dispose petitioner's representation dated 02.07.2024 by speaking order.",
        deadline: "25 April 2025",
        daysRemaining: days,
        department: dept,
        priority,
        sourceLineId: "L15",
      },
      {
        id: "D2",
        text: "File compliance affidavit before Registrar (Judicial).",
        deadline: "09 May 2025",
        daysRemaining: days + 14,
        department: dept,
        priority: "medium",
        sourceLineId: "L16",
      },
    ],
    judgmentLines: judgmentBody(caseNo, dept),
  };
};

export const cases: CaseRecord[] = [
  mk(0, "pending", "high", 12, "Revenue Department"),
  mk(1, "in_review", "high", 7, "Urban Development"),
  mk(2, "verified", "medium", 24, "Public Works Department"),
  mk(3, "pending", "high", 4, "Home Department"),
  mk(4, "verified", "low", 38, "Education Department"),
  mk(5, "in_review", "medium", 19, "Health & Family Welfare"),
  mk(6, "rejected", "low", 45, "Forest, Ecology & Environment"),
  mk(7, "pending", "medium", 16, "Revenue Department"),
];

export const auditEvents = [
  { ts: "2025-04-28 10:14:22", actor: "Smt. Anitha R.", role: "Section Officer", action: "Uploaded judgment PDF", caseRef: "WP 10234/2025" },
  { ts: "2025-04-28 10:14:48", actor: "JusticeTrack AI", role: "System", action: "Extraction completed (avg confidence 94.2%)", caseRef: "WP 10234/2025" },
  { ts: "2025-04-28 11:02:11", actor: "Sri. Mahesh Gowda", role: "Legal Officer", action: "Opened verification workspace", caseRef: "WP 10234/2025" },
  { ts: "2025-04-28 11:18:55", actor: "Sri. Mahesh Gowda", role: "Legal Officer", action: "Approved 7 of 8 fields, edited 1", caseRef: "WP 10234/2025" },
  { ts: "2025-04-28 11:19:02", actor: "Sri. Mahesh Gowda", role: "Legal Officer", action: "Verified record published to dashboard", caseRef: "WP 10234/2025" },
  { ts: "2025-04-29 09:31:00", actor: "Dr. Lakshmi N.", role: "Department Admin", action: "Acknowledged compliance directive D1", caseRef: "WP 10235/2025" },
];
