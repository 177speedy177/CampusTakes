const EDU_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.edu$/i;

const choices = {
  academicLevel: new Set(["First year", "Sophomore", "Junior", "Senior", "Graduate or professional student", "Other"]),
  gradMonth: new Set(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]),
  gradYear: new Set(["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035 or later"]),
  academicArea: new Set(["Business", "Communications or marketing", "Computer science or data", "Education", "Engineering", "Health or medicine", "Humanities or languages", "Law or public policy", "Natural sciences or mathematics", "Social or behavioral sciences", "Arts or design", "Trades or technical", "Undecided", "Other"]),
  livingSituation: new Set(["On-campus housing", "Off-campus apartment or house", "Fraternity or sorority house", "Commute from home", "Prefer not to say", "Other"]),
  greekLife: new Set(["Yes", "No", "Prefer not to say"]),
  studentAthlete: new Set(["NCAA or varsity athlete", "Club athlete", "No", "Prefer not to say"]),
  studentBackgrounds: new Set(["International student", "First-generation college student", "Transfer student", "Student parent", "Veteran or military-connected student", "None of these", "Prefer not to say"]),
  gender: new Set(["Man", "Woman", "Non-binary", "Another identity", "Prefer not to say"]),
  raceEthnicity: new Set(["American Indian or Alaska Native", "Asian", "Black or African American", "Hispanic or Latino", "Middle Eastern or North African", "Native Hawaiian or Pacific Islander", "White", "Another race or ethnicity", "Prefer not to say"]),
  employmentStatus: new Set(["Not currently employed", "Part-time", "Full-time", "Internship or co-op", "Self-employed or freelance", "Prefer not to say"]),
  devices: new Set(["iPhone", "Android phone", "Windows computer", "Mac", "Tablet", "Gaming console"]),
  productsActivities: new Set(["Banking or payment apps", "Food delivery", "Gaming", "Social media", "Streaming", "Fitness or wellness", "Shopping or retail", "Study or AI tools", "Rideshare", "Travel", "Dating apps"]),
  availability: new Set(["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends"]),
  recordingWillingness: new Set(["Yes, with video", "Yes, audio only", "No", "It depends on the study"]),
  paidResearchBefore: new Set(["Never", "Once or twice", "A few times", "Regularly"]),
  acquisitionChannel: new Set(["Friend or referral", "Student organization or club", "Flyer or QR code", "Social media", "Professor or researcher", "Other"]),
};

function cleanText(value, max = 160) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function normalizeEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

function isEduEmail(value) {
  return EDU_EMAIL.test(normalizeEmail(value));
}

function normalizePhone(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed.replace(/[\s().-]/g, ""))) {
    return trimmed.replace(/[\s().-]/g, "");
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

function validChoice(name, value) {
  return choices[name]?.has(value);
}

function validArray(name, value, max = 20) {
  return Array.isArray(value) && value.length > 0 && value.length <= max && value.every((item) => choices[name].has(item));
}

function validateApplication(input) {
  const errors = {};
  const firstName = cleanText(input.firstName, 80);
  const lastName = cleanText(input.lastName, 80);
  const schoolEmail = normalizeEmail(input.schoolEmail);
  const mobilePhone = normalizePhone(input.mobilePhone);
  const university = cleanText(input.university, 160);
  const otherInstitution = cleanText(input.otherInstitution, 160);
  const campusCity = cleanText(input.campusCity, 120);
  const major = cleanText(input.major, 120);
  const acquisitionDetail = cleanText(input.acquisitionDetail, 160);
  const birthYear = Number(input.birthYear);
  const oldestYear = 1900;
  const youngestYear = new Date().getUTCFullYear() - 18;

  if (!firstName) errors.firstName = "Enter your first name.";
  if (!lastName) errors.lastName = "Enter your last name.";
  if (!isEduEmail(schoolEmail)) errors.schoolEmail = "Enter a valid U.S. college or university email ending in .edu.";
  if (!mobilePhone) errors.mobilePhone = "Enter a valid phone number, including the country code if it is outside the U.S.";
  if (!university) errors.university = "Select your college or university.";
  if (university === "Other US college or university" && !otherInstitution) errors.otherInstitution = "Enter your college or university.";
  if (!campusCity) errors.campusCity = "Enter your campus or city.";
  if (!validChoice("academicLevel", input.academicLevel)) errors.academicLevel = "Select your academic level.";
  if (!validChoice("gradMonth", input.gradMonth)) errors.gradMonth = "Select your graduation month.";
  if (!validChoice("gradYear", input.gradYear)) errors.gradYear = "Select your graduation year.";
  if (!validChoice("academicArea", input.academicArea)) errors.academicArea = "Select your academic area.";
  if (!major) errors.major = "Enter your major or field of study.";
  if (!Number.isInteger(birthYear) || birthYear < oldestYear || birthYear > youngestYear) errors.birthYear = "Enter a valid birth year. You must be at least 18.";
  if (!validChoice("livingSituation", input.livingSituation)) errors.livingSituation = "Select your living situation.";
  if (!validChoice("greekLife", input.greekLife)) errors.greekLife = "Select an answer.";
  if (!validChoice("studentAthlete", input.studentAthlete)) errors.studentAthlete = "Select an answer.";
  if (!validArray("studentBackgrounds", input.studentBackgrounds)) errors.studentBackgrounds = "Select at least one answer.";
  if (!validChoice("gender", input.gender)) errors.gender = "Select an answer.";
  if (!validArray("raceEthnicity", input.raceEthnicity)) errors.raceEthnicity = "Select at least one answer.";
  if (!validChoice("employmentStatus", input.employmentStatus)) errors.employmentStatus = "Select an answer.";
  if (!validArray("devices", input.devices)) errors.devices = "Select at least one device.";
  if (!validArray("productsActivities", input.productsActivities)) errors.productsActivities = "Select at least one answer.";
  if (!validArray("availability", input.availability, 4)) errors.availability = "Select at least one time.";
  if (!validChoice("recordingWillingness", input.recordingWillingness)) errors.recordingWillingness = "Select an answer.";
  if (!validChoice("paidResearchBefore", input.paidResearchBefore)) errors.paidResearchBefore = "Select an answer.";
  if (!validChoice("acquisitionChannel", input.acquisitionChannel)) errors.acquisitionChannel = "Select how you heard about Campus Takes.";
  if (["Student organization or club", "Professor or researcher", "Social media", "Other"].includes(input.acquisitionChannel) && !acquisitionDetail) {
    errors.acquisitionDetail = "Tell us which organization, professor, platform, or source.";
  }
  if (input.confirmAgeEnrollment !== true) errors.confirmAgeEnrollment = "Confirm that you are 18 or older and currently enrolled.";
  if (input.confirmAccuracy !== true) errors.confirmAccuracy = "Confirm that your answers are accurate.";
  if (input.emailConsent !== true) errors.emailConsent = "Agree to application and study emails to join.";

  return {
    errors,
    value: {
      firstName,
      lastName,
      schoolEmail,
      mobilePhone,
      university,
      otherInstitution,
      campusCity,
      academicLevel: input.academicLevel,
      gradMonth: input.gradMonth,
      gradYear: input.gradYear,
      academicArea: input.academicArea,
      major,
      birthYear,
      livingSituation: input.livingSituation,
      greekLife: input.greekLife,
      studentAthlete: input.studentAthlete,
      studentBackgrounds: input.studentBackgrounds,
      gender: input.gender,
      raceEthnicity: input.raceEthnicity,
      employmentStatus: input.employmentStatus,
      devices: input.devices,
      productsActivities: input.productsActivities,
      availability: input.availability,
      recordingWillingness: input.recordingWillingness,
      paidResearchBefore: input.paidResearchBefore,
      acquisitionChannel: input.acquisitionChannel,
      acquisitionDetail,
      smsConsent: input.smsConsent === true,
      sourceCode: cleanText(input.sourceCode, 100),
      applicationUrl: cleanText(input.applicationUrl, 500),
    },
  };
}

module.exports = { choices, isEduEmail, normalizeEmail, normalizePhone, validateApplication };
