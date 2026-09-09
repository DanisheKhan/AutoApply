// Comprehensive automated verification test suite for AutoApply Pro engine
const { DEFAULT_PROFILE } = require('../default-profile.js');
const { FIELD_PATTERNS, isOpenEndedQuestion, resolveBooleanQuestion } = require('../content/heuristics.js');
const { generateInstantFallbackAnswer } = require('../background/gemini-client.js');
const { RESUME_DATA } = require('../assets/resume-data.js');
const { getFieldSuggestions } = require('../content/adapters.js');

async function runVerification() {
  console.log("==================================================");
  console.log("⚡ AutoApply Pro - Master Engine & Heuristics Verification");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Candidate Bio-Data Verification
  console.log("[1] Checking Candidate Master Bio-Data Profile:");
  assert(DEFAULT_PROFILE.personal.fullName.includes("Mohammad Danish Khan"), "Full name verified");
  assert(DEFAULT_PROFILE.personal.firstName === "Mohammad Danish Khan", "First name verified");
  assert(DEFAULT_PROFILE.personal.middleName === "Khan", "Middle name verified");
  assert(DEFAULT_PROFILE.personal.lastName === "Naeem Khan", "Last name verified");
  assert(DEFAULT_PROFILE.personal.gender === "Male", "Gender verified");
  assert(DEFAULT_PROFILE.personal.email === "danishkhan.jsx@gmail.com", "Email verified");
  assert(DEFAULT_PROFILE.personal.phonePlain === "9322990946", "Phone verified (9322990946)");
  assert(DEFAULT_PROFILE.academics.graduation.cgpa === "7.79", "B.Tech CGPA verified (7.79)");
  assert(DEFAULT_PROFILE.academics.graduation.branch === "Artificial Intelligence", "B.Tech branch verified");
  assert(DEFAULT_PROFILE.academics.graduation.activeBacklogs === "0", "Backlogs verified (0)");
  assert(DEFAULT_PROFILE.academics.tenth.percentage === "89.60", "10th SSC % verified (89.60%)");
  assert(DEFAULT_PROFILE.academics.twelfth.percentage === "70.50", "12th HSC % verified (70.50%)");
  assert(DEFAULT_PROFILE.identification.panNumber === "NNPPK5977P", "PAN Number verified");
  assert(DEFAULT_PROFILE.identification.aadhaarNumber === "270883622036", "Aadhaar verified");
  assert(DEFAULT_PROFILE.identification.passportNumber === "AH927400", "Passport verified");
  assert(DEFAULT_PROFILE.credentials.defaultPassword === "Danishe@1257", "Portal default password verified (Danishe@1257)");
  assert(DEFAULT_PROFILE.projects.length >= 5, "Featured projects loaded (5+ projects)");

  // 2. Resume PDF Asset Verification
  console.log("\n[2] Checking Bundled Resume Asset:");
  assert(RESUME_DATA && RESUME_DATA.filename === "DanishKhan_Resume.pdf", "Resume PDF asset filename verified");
  assert(RESUME_DATA.sizeBytes === 340082, "Resume byte size verified (340,082 bytes)");
  assert(typeof RESUME_DATA.base64 === 'string' && RESUME_DATA.base64.length > 10000, "Resume Base64 payload valid");

  // 3. Field Heuristics Pattern Matching Tests (Simulating diverse ATS & Form labels)
  console.log("\n[3] Testing Field Heuristic Pattern Matchers (50+ Real-World Edge Cases):");
  
  function matchLabel(labelText) {
    for (const pattern of FIELD_PATTERNS) {
      if (pattern.regex.test(labelText)) {
        if (pattern.exclude && pattern.exclude.test(labelText)) continue;
        try {
          const val = pattern.getValue(DEFAULT_PROFILE, {});
          if (val !== undefined && val !== null && val !== '') {
            return { key: pattern.key, value: val };
          }
        } catch (e) {}
      }
    }
    return null;
  }

  const testCases = [
    // Personal Identity
    { label: "Full Name *", expectedKey: "personal.fullName" },
    { label: "Candidate Name", expectedKey: "personal.fullName" },
    { label: "First Name", expectedKey: "personal.firstName" },
    { label: "Given Name / Forename", expectedKey: "personal.firstName" },
    { label: "Middle Name", expectedKey: "personal.middleName" },
    { label: "Last Name / Surname", expectedKey: "personal.lastName" },
    { label: "Family Name", expectedKey: "personal.lastName" },
    { label: "Primary Email Address", expectedKey: "personal.email" },
    { label: "Contact Number / Mobile", expectedKey: "personal.phone" },
    { label: "Date of Birth (DD/MM/YYYY)", expectedKey: "personal.dob" },
    { label: "Gender / Sex", expectedKey: "personal.gender" },
    { label: "Father's Name", expectedKey: "personal.fatherName" },
    { label: "Mother's Name", expectedKey: "personal.motherName" },
    { label: "Nationality / Citizenship", expectedKey: "personal.nationality" },
    { label: "Caste / Category", expectedKey: "personal.casteCategory" },

    // Government & Civil IDs
    { label: "PAN Card Number", expectedKey: "identification.panNumber" },
    { label: "Aadhaar Card (12 digits)", expectedKey: "identification.aadhaarNumber" },
    { label: "Passport Number", expectedKey: "identification.passportNumber" },
    { label: "Set Portal Password", expectedKey: "credentials.password" },
    { label: "Confirm Password", expectedKey: "credentials.confirmPassword" },

    // Address & Location
    { label: "Residential PIN Code / Postal Code", expectedKey: "address.pincode" },
    { label: "Current City", expectedKey: "address.city" },
    { label: "State / Province", expectedKey: "address.state" },
    { label: "Permanent Address", expectedKey: "address.fullAddress" },
    { label: "Country of Residence", expectedKey: "address.country" },

    // Academics (10th / 12th / B.Tech)
    { label: "10th Percentage (%)", expectedKey: "academics.tenth.percentage" },
    { label: "SSC Board Name", expectedKey: "academics.tenth.board" },
    { label: "10th Passing Year", expectedKey: "academics.tenth.passingYear" },
    { label: "12th Percentage (%)", expectedKey: "academics.twelfth.percentage" },
    { label: "HSC Junior College Name", expectedKey: "academics.twelfth.collegeName" },
    { label: "12th Passing Year", expectedKey: "academics.twelfth.passingYear" },
    { label: "Graduation Cumulative CGPA", expectedKey: "academics.graduation.cgpa" },
    { label: "College / University Name", expectedKey: "academics.graduation.collegeName" },
    { label: "Degree / Course Name", expectedKey: "academics.graduation.degree" },
    { label: "Specialization / Branch", expectedKey: "academics.graduation.branch" },
    { label: "Year of Graduation", expectedKey: "academics.graduation.passingYear" },
    { label: "Active Backlogs / Standing Arrears", expectedKey: "academics.graduation.backlogs" },
    { label: "PRN / Roll Number", expectedKey: "academics.graduation.prnNumber" },

    // Career, CTC & Notice
    { label: "Current Employer / Company", expectedKey: "career.currentCompany" },
    { label: "Current Designation / Role", expectedKey: "career.currentRole" },
    { label: "Total Years of Experience", expectedKey: "career.totalExperienceYears" },
    { label: "Current Annual CTC (in LPA)", expectedKey: "career.currentCtc" },
    { label: "Expected Salary (CTC)", expectedKey: "career.expectedCtc" },
    { label: "Notice Period / Availability", expectedKey: "career.noticePeriodDays" },
    { label: "Preferred Job Locations", expectedKey: "career.preferredLocations" },

    // Legal Compliance & Affirmations
    { label: "Are you legally authorized to work in India?", expectedKey: "career.workAuthIndia" },
    { label: "Will you require visa sponsorship in India?", expectedKey: "career.sponsorshipIndia" },
    { label: "Are you willing to relocate?", expectedKey: "career.relocate" },
    { label: "Are you open to working in rotational shifts / travel?", expectedKey: "career.shiftsTravel" },
    { label: "Do you have any criminal conviction?", expectedKey: "career.criminalConviction" },
    { label: "Do you hold a valid passport?", expectedKey: "career.validPassport" },
    { label: "Do you agree to the terms and privacy policy?", expectedKey: "career.termsConsent" },

    // EEO & Diversity
    { label: "Protected Veteran Status", expectedKey: "career.veteranStatus" },
    { label: "Disability / PwD Status", expectedKey: "career.disabilityStatus" },
    { label: "Race / Ethnicity", expectedKey: "career.raceEthnicity" },

    // Country Code & Residence Variations
    { label: "Country/Region Code:*", expectedKey: "personal.phoneCountryCode" },
    { label: "Phone Country Code", expectedKey: "personal.phoneCountryCode" },
    { label: "ISD / Dialing Code", expectedKey: "personal.phoneCountryCode" },
    { label: "Country/Region of Residence:*", expectedKey: "address.country" },
    { label: "Residential Country", expectedKey: "address.country" },
    { label: "Permanent Country", expectedKey: "address.country" },

    // Enterprise Portal Specific Fields (Screenshots Verification)
    { label: "Prefix (?)", expectedKey: "personal.salutation" },
    { label: "Address (Line 1) *", expectedKey: "address.streetAddress1" },
    { label: "Address (Line 2)", expectedKey: "address.streetAddress2" },
    { label: "Permanent Address-City *", expectedKey: "address.permanentCity" },
    { label: "Permanent Address-State *", expectedKey: "address.permanentState" },
    { label: "Current Location", expectedKey: "address.currentLocation" },
    { label: "Highest Education Degree *", expectedKey: "academics.graduation.degree" },
    { label: "Valid Passport *", expectedKey: "career.validPassport" },
    { label: "Passport Expiry Date", expectedKey: "identification.passportExpiryDate" },
    { label: "Immigration Status *", expectedKey: "career.immigrationStatus" },
    { label: "Have you been interviewed in last 6 months *", expectedKey: "career.interviewedBefore" },
    { label: "I confirm that the National ID card number entered by me is correct", expectedKey: "career.nationalIdConfirm" },
    { label: "I have read and understood the company privacy and recruitment policies", expectedKey: "career.readAndUnderstood" },

    // Google Forms Elevate Internship Program Questions
    { label: "Course Name *", expectedKey: "academics.graduation.courseName" },
    { label: "Please share some details on some significant projects/internships you have worked on", expectedKey: "profile.projectsDetails" },
    { label: "Year of Graduation *", expectedKey: "academics.graduation.passingYear" },
    { label: "Are you interested in a PPO (pre-placement offer) post the internship completion ? *", expectedKey: "career.interestedInPpo" },
    { label: "Have you gone through the program details? Are you clear about the stipend and the program structure? *", expectedKey: "career.programDetailsStipend" },
    { label: "How many months of work experience do you have ? *", expectedKey: "career.workExperienceMonths" },

    // Technology Skill Years Experience
    { label: "REACT.JS / FRONTEND", expectedKey: "skills.react" },
    { label: "NODE.JS / EXPRESS", expectedKey: "skills.node" },
    { label: "JAVA & DSA", expectedKey: "skills.java" },
    { label: "MONGODB / SUPABASE / SQL", expectedKey: "skills.sql_mongodb" }
  ];

  testCases.forEach(({ label, expectedKey }) => {
    const match = matchLabel(label);
    assert(match && match.key === expectedKey, `Label "${label}" matched to "${expectedKey}" [Got: ${match?.key || 'NONE'}]`);
  });

  // Verify Dynamic Aadhaar Slicing (Last 8 digits vs Last 4 digits vs Full 12 digits)
  console.log("\n[3.0] Testing Dynamic Aadhaar Slicing Logic:");
  const aadhaarPattern = FIELD_PATTERNS.find(p => p.key === "identification.aadhaarNumber");
  
  const mockAadhaarLast8 = { getAttribute: () => "Aadhaar Number(Last 8 digit) *" };
  const last8Val = aadhaarPattern.getValue(DEFAULT_PROFILE, mockAadhaarLast8);
  assert(last8Val === "83622036", `Aadhaar Last 8 digits -> "83622036" [Got: "${last8Val}"]`);

  const mockAadhaarLast4 = { getAttribute: () => "Aadhaar Number (Last 4 digit)" };
  const last4Val = aadhaarPattern.getValue(DEFAULT_PROFILE, mockAadhaarLast4);
  assert(last4Val === "2036", `Aadhaar Last 4 digits -> "2036" [Got: "${last4Val}"]`);

  const mockAadhaarFull = { getAttribute: () => "Aadhaar Number (12 digit)" };
  const fullVal = aadhaarPattern.getValue(DEFAULT_PROFILE, mockAadhaarFull);
  assert(fullVal === "270883622036", `Aadhaar Full 12 digits -> "270883622036" [Got: "${fullVal}"]`);

  // Verify Name Variations (2-field vs 3-field)
  console.log("\n[3.1] Testing 2-Field vs 3-Field Name Heuristic Logic:");
  const firstNamePattern = FIELD_PATTERNS.find(p => p.key === "personal.firstName");
  const middleNamePattern = FIELD_PATTERNS.find(p => p.key === "personal.middleName");
  const lastNamePattern = FIELD_PATTERNS.find(p => p.key === "personal.lastName");

  // 2-field simulation (no middle name field present in container)
  const twoFieldName = firstNamePattern.getValue(DEFAULT_PROFILE, {});
  const twoFieldLastName = lastNamePattern.getValue(DEFAULT_PROFILE, {});
  assert(twoFieldName === "Mohammad Danish Khan", `2-Field Form: First Name -> "Mohammad Danish Khan" [Got: "${twoFieldName}"]`);
  assert(twoFieldLastName === "Naeem Khan", `2-Field Form: Last Name -> "Naeem Khan" [Got: "${twoFieldLastName}"]`);

  // 3-field simulation (mock element inside container with middle name)
  const mockContainerWithMiddle = {
    querySelector: (sel) => sel.includes('middle') ? {} : null,
    querySelectorAll: () => []
  };
  const mockElement = {
    closest: () => mockContainerWithMiddle
  };
  const threeFieldName = firstNamePattern.getValue(DEFAULT_PROFILE, mockElement);
  const threeFieldMiddle = middleNamePattern.getValue(DEFAULT_PROFILE, mockElement);
  const threeFieldLastName = lastNamePattern.getValue(DEFAULT_PROFILE, mockElement);
  assert(threeFieldName === "Mohammad Danish", `3-Field Form: First Name -> "Mohammad Danish" [Got: "${threeFieldName}"]`);
  assert(threeFieldMiddle === "Khan", `3-Field Form: Middle Name -> "Khan" [Got: "${threeFieldMiddle}"]`);
  assert(threeFieldLastName === "Naeem Khan", `3-Field Form: Last Name -> "Naeem Khan" [Got: "${threeFieldLastName}"]`);

  // 4. Boolean Question Classifier Tests
  console.log("\n[4] Testing Smart Boolean (Yes/No) Classifier:");
  assert(resolveBooleanQuestion("Are you legally authorized to work in India?") === "Yes", "Work auth question -> Yes");
  assert(resolveBooleanQuestion("Will you now or in future require visa sponsorship in India?") === "No", "Visa sponsorship in India -> No");
  assert(resolveBooleanQuestion("Do you have any active backlogs or standing arrears?") === "No", "Backlogs -> No");
  assert(resolveBooleanQuestion("Have you ever been convicted of a criminal offense?") === "No", "Criminal conviction -> No");
  assert(resolveBooleanQuestion("Are you willing to relocate to Pune or Bengaluru?") === "Yes", "Relocation -> Yes");
  assert(resolveBooleanQuestion("Are you comfortable working in rotational shifts?") === "Yes", "Shift work -> Yes");
  assert(resolveBooleanQuestion("Do you agree to the terms and conditions?") === "Yes", "Consent -> Yes");
  assert(resolveBooleanQuestion("Are you interested in a PPO (pre-placement offer) post the internship completion ?") === "Yes", "PPO interest -> Yes");
  assert(resolveBooleanQuestion("Have you gone through the program details? Are you clear about the stipend and the program structure?") === "Yes", "Stipend & structure -> Yes");

  // 5. Open-Ended AI Question Detector & Instant Fallback Generator Tests
  console.log("\n[5] Testing AI Open-Ended Question Detector & Instant Fallbacks:");
  assert(isOpenEndedQuestion("Why do you want to join our engineering team?"), "Identified 'Why join' as open-ended question");
  assert(isOpenEndedQuestion("Describe your most challenging technical project and how you solved it."), "Identified 'Project challenge' as open-ended question");
  assert(isOpenEndedQuestion("What are your greatest technical strengths?"), "Identified 'Strengths' as open-ended question");
  assert(!isOpenEndedQuestion("Full Name"), "Full Name rejected from AI question classification");
  assert(!isOpenEndedQuestion("Phone Number"), "Phone rejected from AI question classification");

  const fallbackWhy = generateInstantFallbackAnswer("Why should we hire you?");
  assert(fallbackWhy.includes("full-stack") && fallbackWhy.includes("React"), "Instant fallback generated high-impact 'Why hire' answer");

  const fallbackProject = generateInstantFallbackAnswer("Tell us about a challenging project.");
  assert(fallbackProject.includes("CodeRace") || fallbackProject.includes("Madina Perfumes"), "Instant fallback references real projects (CodeRace / Madina)");

  // 6. Test AI Field Inference Fallback Engine
  console.log("\n[6] Testing Gemini AI Field Inference Engine:");
  const { inferFieldWithGemini } = require('../background/gemini-client.js');
  const inferredPrefix = await inferFieldWithGemini({ label: "Prefix (?)", tag: "select", options: ["No Selection", "Mr.", "Ms.", "Mrs."] }, DEFAULT_PROFILE);
  assert(inferredPrefix === "Mr.", `AI Inferred Prefix: "${inferredPrefix}" [Expected: "Mr."]`);

  const inferredPassport = await inferFieldWithGemini({ label: "Valid Passport *", tag: "select", options: ["No Selection", "Yes", "No"] }, DEFAULT_PROFILE);
  assert(inferredPassport === "Yes", `AI Inferred Passport: "${inferredPassport}" [Expected: "Yes"]`);

  const inferredImmigration = await inferFieldWithGemini({ label: "Immigration Status", tag: "select", options: ["No Selection", "Citizen", "Alien"] }, DEFAULT_PROFILE);
  assert(inferredImmigration === "Citizen", `AI Inferred Immigration: "${inferredImmigration}" [Expected: "Citizen"]`);

  const inferredPpo = await inferFieldWithGemini({ label: "Are you interested in a PPO (pre-placement offer) post the internship completion ?", tag: "select", options: ["Choose", "Yes", "NO"] }, DEFAULT_PROFILE);
  assert(inferredPpo === "Yes", `AI Inferred PPO dropdown: "${inferredPpo}" [Expected: "Yes"]`);

  const inferredPpoInput = await inferFieldWithGemini({ label: "Are you interested in a PPO (pre-placement offer) post the internship completion ?", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredPpoInput === "Yes", `AI Inferred PPO text input: "${inferredPpoInput}" [Expected: "Yes"]`);

  const inferredStipend = await inferFieldWithGemini({ label: "Have you gone through the program details? Are you clear about the stipend and the program structure?", tag: "select", options: ["Choose", "Yes", "NO"] }, DEFAULT_PROFILE);
  assert(inferredStipend === "Yes", `AI Inferred Stipend & structure dropdown: "${inferredStipend}" [Expected: "Yes"]`);

  const inferredStipendInput = await inferFieldWithGemini({ label: "Have you gone through the program details? Are you clear about the stipend and the program structure?", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredStipendInput === "Yes", `AI Inferred Stipend & structure text input: "${inferredStipendInput}" [Expected: "Yes"]`);

  const inferredExpDropdown = await inferFieldWithGemini({ label: "How many months of work experience do you have ?", tag: "select", options: ["0-6 months", "6-12 months", "1-2 years"] }, DEFAULT_PROFILE);
  assert(inferredExpDropdown === "6-12 months", `AI Inferred Experience dropdown: "${inferredExpDropdown}" [Expected: "6-12 months"]`);

  const inferredExpInput = await inferFieldWithGemini({ label: "How many months of work experience do you have ?", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredExpInput === "10", `AI Inferred Experience text input: "${inferredExpInput}" [Expected: "10"]`);

  // 7. Test Field-Level Quick Fill Suggestions Engine
  console.log("\n[7] Testing Field-Level Quick Fill Suggestions Engine:");
  const nameSugg = getFieldSuggestions(null, "Full Name *", DEFAULT_PROFILE);
  assert(nameSugg.primary && nameSugg.primary.value.includes("Mohammad Danish Khan"), `Full Name Suggestion -> "${nameSugg.primary?.value}"`);
  assert(nameSugg.alternatives.length > 0, `Full Name has alternative chips (${nameSugg.alternatives.length})`);

  const emailSugg = getFieldSuggestions(null, "Email Address *", DEFAULT_PROFILE);
  assert(emailSugg.primary && emailSugg.primary.value === "danishkhan.jsx@gmail.com", `Email Suggestion -> "${emailSugg.primary?.value}"`);

  const ppoSugg = getFieldSuggestions(null, "Are you interested in a PPO (pre-placement offer) post the internship completion ? *", DEFAULT_PROFILE);
  assert(ppoSugg.primary && ppoSugg.primary.value === "Yes", `PPO Suggestion -> "${ppoSugg.primary?.value}" [Expected: "Yes"]`);
  assert(ppoSugg.alternatives.some(a => a.value === "No"), "PPO has alternative chip 'No'");

  const stipendSugg = getFieldSuggestions(null, "Have you gone through the program details? Are you clear about the stipend and the program structure? *", DEFAULT_PROFILE);
  assert(stipendSugg.primary && stipendSugg.primary.value === "Yes", `Stipend Suggestion -> "${stipendSugg.primary?.value}" [Expected: "Yes"]`);

  const expSugg = getFieldSuggestions(null, "How many months of work experience do you have ? *", DEFAULT_PROFILE);
  assert(expSugg.primary && expSugg.primary.value === "10", `Work Experience Months Suggestion -> "${expSugg.primary?.value}" [Expected: "10"]`);
  assert(expSugg.alternatives.some(a => a.value.includes("6-12")), "Experience has range alternative '6-12 months'");

  const resumeSugg = getFieldSuggestions(null, "Upload Resume / CV *", DEFAULT_PROFILE);
  assert(resumeSugg.isResume === true, "Resume / File upload field detected correctly");

  const openEndedSugg = getFieldSuggestions(null, "Why do you want to join our company?", DEFAULT_PROFILE);
  assert(openEndedSugg.isOpenEnded === true, "Open-ended question detected for AI generation");

  console.log("\n==================================================");
  console.log(`Master Verification Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
