// Single source of truth for the biodata form: the candidate form, the review screen,
// the admin view and the Excel export all read from this file.
// To add a question: add a column in supabase/schema.sql and a field here.

export type Values = Record<string, string>;

export type FieldType = "text" | "email" | "tel" | "date" | "number" | "select" | "textarea" | "yesno";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  /** Only show (and require) this field when the condition is true. */
  showIf?: (v: Values) => boolean;
  /** Extra format check; return an error message or null. */
  validate?: (value: string, v: Values) => string | null;
  wide?: boolean;
};

export type Section = { id: string; title: string; description?: string; fields: Field[] };

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const ngPhone = (value: string) =>
  /^(\+?234|0)?[789][01]\d{8}$/.test(value.replace(/[\s\-().]/g, ""))
    ? null
    : "Enter a valid Nigerian phone number, e.g. 0803 123 4567.";

const email = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Enter a valid email address.";

const wholeNumber = (min: number, max: number) => (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? null : `Enter a whole number between ${min} and ${max}.`;
};

const hasLicence = (v: Values) => v.has_drivers_licence === "yes";

export const SECTIONS: Section[] = [
  {
    id: "personal",
    title: "Personal details",
    description: "Use your names exactly as they appear on your NIN.",
    fields: [
      { name: "surname", label: "Surname", type: "text", required: true },
      { name: "first_name", label: "First name", type: "text", required: true },
      { name: "middle_name", label: "Middle name", type: "text" },
      {
        name: "date_of_birth", label: "Date of birth", type: "date", required: true,
        validate: (value) => {
          const dob = new Date(value);
          if (Number.isNaN(dob.getTime())) return "Enter a valid date.";
          const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
          if (age < 18) return "You must be at least 18 years old.";
          if (age > 80) return "Please check the year of birth.";
          return null;
        },
      },
      { name: "gender", label: "Gender", type: "select", required: true, options: ["Female", "Male"] },
      {
        name: "marital_status", label: "Marital status", type: "select", required: true,
        options: ["Single", "Married", "Divorced", "Separated", "Widowed"],
      },
      { name: "phone", label: "Phone number", type: "tel", required: true, validate: ngPhone, placeholder: "0803 123 4567" },
      { name: "alt_phone", label: "Alternative phone number", type: "tel", validate: ngPhone },
      { name: "email", label: "Email address", type: "email", validate: email },
      { name: "nin", label: "NIN (National Identification Number)", type: "text", required: true,
        help: "11 digits, from your NIN slip or ID card.",
        validate: (value) => (/^\d{11}$/.test(value.replace(/\s/g, "")) ? null : "Your NIN should be exactly 11 digits.") },
      { name: "residential_address", label: "Residential address", type: "textarea", required: true, wide: true },
      { name: "state_of_residence", label: "State of residence", type: "select", required: true, options: NIGERIAN_STATES },
      { name: "lga_of_residence", label: "LGA of residence", type: "text", required: true },
      { name: "state_of_origin", label: "State of origin", type: "select", required: true, options: NIGERIAN_STATES },
      { name: "lga_of_origin", label: "LGA of origin", type: "text", required: true },
      {
        name: "highest_education", label: "Highest level of education", type: "select", required: true,
        options: [
          "No formal education", "Primary school (FSLC)", "Secondary school (SSCE / WAEC / NECO)",
          "OND / NCE", "HND / Bachelor's degree", "Postgraduate",
        ],
      },
      { name: "occupation", label: "Current occupation", type: "text" },
    ],
  },
  {
    id: "next_of_kin",
    title: "Next of kin",
    description: "Someone we can contact in an emergency.",
    fields: [
      { name: "nok_full_name", label: "Full name", type: "text", required: true },
      {
        name: "nok_relationship", label: "Relationship to you", type: "select", required: true,
        options: ["Spouse", "Parent", "Sibling", "Child", "Other relative", "Friend"],
      },
      { name: "nok_phone", label: "Phone number", type: "tel", required: true, validate: ngPhone },
      { name: "nok_email", label: "Email address", type: "email", validate: email },
      { name: "nok_address", label: "Address", type: "textarea", required: true, wide: true },
    ],
  },
  {
    id: "driving",
    title: "Driving experience",
    description: "You don't need a licence to be shortlisted. Tell us where you are now.",
    fields: [
      { name: "has_drivers_licence", label: "Do you have a valid driver's licence?", type: "yesno", required: true, wide: true },
      { name: "licence_number", label: "Licence number", type: "text", required: true, showIf: hasLicence },
      {
        name: "licence_class", label: "Licence class", type: "select", required: true, showIf: hasLicence,
        options: ["Class B (car)", "Class C (light truck / bus)", "Class D / E (commercial)", "Other"],
      },
      { name: "licence_expiry", label: "Licence expiry date", type: "date", required: true, showIf: hasLicence },
      { name: "driving_experience_years", label: "Years of driving experience", type: "number", required: true,
        help: "Enter 0 if you are new to driving.", validate: wholeNumber(0, 60) },
      { name: "vehicle_types", label: "Vehicles you can drive", type: "text", placeholder: "e.g. car, bus, tricycle" },
    ],
  },
  {
    id: "guarantor",
    title: "Guarantor",
    description:
      "A responsible adult who knows you well and will vouch for you. They also sign the guarantor form you upload in the next step.",
    fields: [
      { name: "guarantor_full_name", label: "Full name", type: "text", required: true },
      { name: "guarantor_relationship", label: "Relationship to you", type: "text", required: true },
      { name: "guarantor_phone", label: "Phone number", type: "tel", required: true, validate: ngPhone },
      { name: "guarantor_email", label: "Email address", type: "email", validate: email },
      { name: "guarantor_occupation", label: "Occupation", type: "text", required: true },
      { name: "guarantor_years_known", label: "How many years have they known you?", type: "number", required: true,
        validate: wholeNumber(0, 80) },
      { name: "guarantor_address", label: "Address", type: "textarea", required: true, wide: true },
    ],
  },
  {
    id: "medical",
    title: "Health & fitness",
    description: "Used only to confirm you can train and drive safely. Kept confidential.",
    fields: [
      { name: "blood_group", label: "Blood group", type: "select",
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Not sure"] },
      { name: "genotype", label: "Genotype", type: "select", options: ["AA", "AS", "AC", "SS", "SC", "Not sure"] },
      { name: "wears_corrective_lenses", label: "Do you wear glasses or contact lenses?", type: "yesno", wide: true },
      { name: "has_medical_condition", label: "Do you have any medical condition that could affect driving?",
        type: "yesno", required: true, wide: true },
      { name: "medical_condition_details", label: "Please describe it", type: "textarea", required: true, wide: true,
        showIf: (v) => v.has_medical_condition === "yes" },
    ],
  },
];

export type DocSpec = {
  type: string;
  label: string;
  help?: string;
  required: (v: Values) => boolean;
  accept: string;
};

export const DOCUMENTS: DocSpec[] = [
  { type: "passport_photo", label: "Passport photograph", help: "Recent, clear photo on a plain white background.",
    required: () => true, accept: "image/jpeg,image/png" },
  { type: "nin_document", label: "NIN slip or National ID card", required: () => true,
    accept: "image/jpeg,image/png,application/pdf" },
  { type: "drivers_licence", label: "Driver's licence", help: "Front and back in one file if possible.",
    required: hasLicence, accept: "image/jpeg,image/png,application/pdf" },
  { type: "guarantor_form", label: "Signed guarantor form",
    help: "Download the form, have your guarantor fill and sign it, then upload a scan or clear photo.",
    required: () => true, accept: "image/jpeg,image/png,application/pdf" },
  { type: "medical_certificate", label: "Medical fitness certificate",
    help: "From a government or registered hospital, issued in the last 6 months.",
    required: () => true, accept: "image/jpeg,image/png,application/pdf" },
  { type: "education_certificate", label: "Highest education certificate", help: "Optional.",
    required: () => false, accept: "image/jpeg,image/png,application/pdf" },
];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALL_FIELDS: Field[] = SECTIONS.flatMap((s) => s.fields);
export const FIELD_NAMES = new Set(ALL_FIELDS.map((f) => f.name));

export const isVisible = (f: Field, v: Values) => !f.showIf || f.showIf(v);

/** Returns { fieldName: errorMessage } for the given fields. */
export function validateFields(fields: Field[], v: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (!isVisible(f, v)) continue;
    const value = (v[f.name] ?? "").trim();
    if (!value) {
      if (f.required) errors[f.name] = "This field is required.";
      continue;
    }
    if (f.type === "select" && f.options && !f.options.includes(value)) {
      errors[f.name] = "Choose one of the options.";
      continue;
    }
    if (f.type === "yesno" && value !== "yes" && value !== "no") {
      errors[f.name] = "Choose yes or no.";
      continue;
    }
    const msg = f.validate?.(value, v);
    if (msg) errors[f.name] = msg;
  }
  return errors;
}

export function missingDocuments(v: Values, uploaded: string[]): DocSpec[] {
  return DOCUMENTS.filter((d) => d.required(v) && !uploaded.includes(d.type));
}

/** Form values (strings) → database row. Hidden fields are cleared. */
export function toDbRow(v: Values): Record<string, string | number | boolean | null> {
  const row: Record<string, string | number | boolean | null> = {};
  for (const f of ALL_FIELDS) {
    const raw = (v[f.name] ?? "").trim();
    if (!raw || !isVisible(f, v)) {
      row[f.name] = null;
    } else if (f.type === "yesno") {
      row[f.name] = raw === "yes";
    } else if (f.type === "number") {
      const n = Number(raw);
      row[f.name] = Number.isFinite(n) ? Math.trunc(n) : null;
    } else if (f.name === "nin") {
      row[f.name] = raw.replace(/\s/g, "");
    } else if (f.type === "email") {
      row[f.name] = raw.toLowerCase();
    } else {
      row[f.name] = raw;
    }
  }
  return row;
}

/** Database row → form values (strings). */
export function fromDbRow(row: Record<string, unknown> | null | undefined): Values {
  const v: Values = {};
  for (const f of ALL_FIELDS) {
    const raw = row?.[f.name];
    if (raw === null || raw === undefined) v[f.name] = "";
    else if (f.type === "yesno") v[f.name] = raw ? "yes" : "no";
    else v[f.name] = String(raw);
  }
  return v;
}

/** Human-readable value for summaries and exports. */
export function displayValue(f: Field, v: Values): string {
  const raw = v[f.name] ?? "";
  if (!raw) return "";
  if (f.type === "yesno") return raw === "yes" ? "Yes" : "No";
  if (f.type === "date") {
    const d = new Date(raw + "T00:00:00");
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  return raw;
}
