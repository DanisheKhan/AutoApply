// Comprehensive automated verification test suite for AutoApply Pro engine
const { DEFAULT_PROFILE } = require('../default-profile.js');
const { FIELD_PATTERNS, isOpenEndedQuestion, resolveBooleanQuestion, JobDetector, formatCandidateDate, formatAadhaarNumber } = require('../content/heuristics.js');
const { generateInstantFallbackAnswer } = require('../background/gemini-client.js');
const { RESUME_DATA } = require('../assets/resume-data.js');
const { getFieldSuggestions } = require('../content/adapters.js');
const { isCoverLetterTarget } = require('../content/resume-uploader.js');

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
  assert(DEFAULT_PROFILE.personal.fatherName === "Naeem Khan Ishaque Khan", "Father's Full Name verified (Naeem Khan Ishaque Khan)");
  assert(DEFAULT_PROFILE.personal.fatherFirstName === "Naeem", "Father's First Name verified (Naeem)");
  assert(DEFAULT_PROFILE.personal.fatherMiddleName === "Khan", "Father's Middle Name verified (Khan)");
  assert(DEFAULT_PROFILE.personal.fatherLastName === "Ishaque Khan", "Father's Last Name verified (Ishaque Khan)");
  assert(DEFAULT_PROFILE.personal.motherName === "Yasmeen Bano", "Mother's Name verified (Yasmeen Bano)");
  assert(DEFAULT_PROFILE.personal.motherFirstName === "Yasmeen", "Mother's First Name verified (Yasmeen)");
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

  // 2. Resume PDF Asset & Cover Letter Isolation Verification
  console.log("\n[2] Checking Bundled Resume Asset & Cover Letter Isolation:");
  assert(RESUME_DATA && RESUME_DATA.filename === "DanishKhan_Resume.pdf", "Resume PDF asset filename verified");
  assert(RESUME_DATA.sizeBytes === 340082, "Resume byte size verified (340,082 bytes)");
  assert(typeof RESUME_DATA.base64 === 'string' && RESUME_DATA.base64.length > 10000, "Resume Base64 payload valid");
  assert(isCoverLetterTarget({ id: "cover-letter-upload", name: "cover_letter" }) === true, "Cover Letter input identified and isolated");
  assert(isCoverLetterTarget({ id: "resume-file-input", name: "resume" }) === false, "Resume input correctly not marked as Cover Letter");
  assert(isCoverLetterTarget({ placeholder: "Upload your cover letter or motivation statement" }) === true, "Motivation statement identified as Cover Letter");

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
    { label: "COMPLETED NAME *", expectedKey: "personal.fullName" },
    { label: "COMPLETE NAME", expectedKey: "personal.fullName" },
    { label: "Candidate Name", expectedKey: "personal.fullName" },
    { label: "Candidate's Name", expectedKey: "personal.fullName" },
    { label: "Name of Candidate", expectedKey: "personal.fullName" },
    { label: "Name of the Applicant", expectedKey: "personal.fullName" },
    { label: "Student Name", expectedKey: "personal.fullName" },
    { label: "Enter Your Name", expectedKey: "personal.fullName" },
    { label: "Legal Name", expectedKey: "personal.fullName" },
    { label: "Name *", expectedKey: "personal.fullName" },
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
    { label: "Father's Name First Name", expectedKey: "personal.fatherFirstName" },
    { label: "Father's Name Middle Name", expectedKey: "personal.fatherMiddleName" },
    { label: "Father's Name Last Name", expectedKey: "personal.fatherLastName" },
    { label: "Father First Name", expectedKey: "personal.fatherFirstName" },
    { label: "Father Middle Name", expectedKey: "personal.fatherMiddleName" },
    { label: "Father Last Name", expectedKey: "personal.fatherLastName" },
    { label: "Mother's Name", expectedKey: "personal.motherName" },
    { label: "Mother's Name First Name", expectedKey: "personal.motherFirstName" },
    { label: "Mother's Name Last Name", expectedKey: "personal.motherLastName" },
    { label: "Nationality / Citizenship", expectedKey: "personal.nationality" },
    { label: "Caste / Category", expectedKey: "personal.casteCategory" },

    // Government & Civil IDs
    { label: "PAN Card Number", expectedKey: "identification.panNumber" },
    { label: "Aadhaar Card (12 digits)", expectedKey: "identification.aadhaarNumber" },
    { label: "Passport Number", expectedKey: "identification.passportNumber" },
    { label: "Set Portal Password", expectedKey: "credentials.password" },
    { label: "Confirm Password", expectedKey: "credentials.confirmPassword" },

    // Address & Location
    { label: "House No./Apartment Name/Block No.*", expectedKey: "address.streetAddress1" },
    { label: "Building Name", expectedKey: "address.streetAddress1" },
    { label: "Apartment Name", expectedKey: "address.streetAddress1" },
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
    { label: "12th Stream / Discipline", expectedKey: "academics.twelfth.stream" },
    { label: "12th Major Subjects", expectedKey: "academics.twelfth.subjects" },
    { label: "12th Specialization", expectedKey: "academics.twelfth.specialization" },
    { label: "Graduation Cumulative CGPA", expectedKey: "academics.graduation.cgpa" },
    { label: "College / University Name", expectedKey: "academics.graduation.collegeName" },
    { label: "Degree / Course Name", expectedKey: "academics.graduation.degree" },
    { label: "Specialization / Branch", expectedKey: "academics.graduation.branch" },
    { label: "Year of Graduation", expectedKey: "academics.graduation.passingYear" },
    { label: "Course Duration Start Date*", expectedKey: "academics.graduation.startDate" },
    { label: "Course Duration End Date*", expectedKey: "academics.graduation.endDate" },
    { label: "Start Date*", expectedKey: "academics.graduation.startDate" },
    { label: "End Date*", expectedKey: "academics.graduation.endDate" },
    { label: "Course Duration", expectedKey: "academics.graduation.courseDuration" },
    { label: "Course Start Date", expectedKey: "academics.graduation.startDate" },
    { label: "Course End Date", expectedKey: "academics.graduation.endDate" },
    { label: "Active Backlogs / Standing Arrears", expectedKey: "academics.graduation.backlogs" },
    { label: "PRN / Roll Number", expectedKey: "academics.graduation.prnNumber" },

    // Career, CTC & Notice
    { label: "Current Employer / Company", expectedKey: "career.currentCompany" },
    { label: "Current Designation / Role", expectedKey: "career.currentRole" },
    { label: "Total Years of Experience", expectedKey: "career.totalExperienceYears" },
    { label: "Current Annual CTC (in LPA)", expectedKey: "career.currentCtc" },
    { label: "Annual Current Salary (INR) ((Put 0 if you're applying for internship role) *", expectedKey: "career.currentCtc" },
    { label: "Expected Salary (CTC)", expectedKey: "career.expectedCtc" },
    { label: "Annual Expected Salary (INR) *", expectedKey: "career.expectedCtc" },
    { label: "Your relevant experience (in months) *", expectedKey: "career.totalExperienceMonths" },
    { label: "How soon can you start? (in days) *", expectedKey: "career.noticePeriodDays" },
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
    { label: "How many months of work experience do you have ? *", expectedKey: "career.totalExperienceMonths" },

    // Technology Skill Years Experience
    { label: "REACT.JS / FRONTEND", expectedKey: "skills.react" },
    { label: "NODE.JS / EXPRESS", expectedKey: "skills.node" },
    { label: "JAVA & DSA", expectedKey: "skills.java" },
    { label: "MONGODB / SUPABASE / SQL", expectedKey: "skills.sql_mongodb" },

    // Primary Skills, Education Details & Total Experience (egainz & enterprise forms)
    { label: "Primary Skills:", expectedKey: "skills.primary" },
    { label: "Technical Skills", expectedKey: "skills.primary" },
    { label: "Key Skills", expectedKey: "skills.primary" },
    { label: "Education Details", expectedKey: "academics.educationDetails" },
    { label: "Educational Qualification", expectedKey: "academics.educationDetails" },
    { label: "Education Summary", expectedKey: "academics.educationDetails" },
    { label: "Total years of Experience:", expectedKey: "career.totalExperienceYears" },

    // TCS NextStep & Indian Enterprise Scoped Academic Sections
    { label: "XII Grade Institute/University*", expectedKey: "academics.twelfth.collegeName" },
    { label: "XII Grade Board of Education*", expectedKey: "academics.twelfth.board" },
    { label: "XII Grade Specialization*", expectedKey: "academics.twelfth.specialization" },
    { label: "XII Grade Year of Passing", expectedKey: "academics.twelfth.passingYear" },
    { label: "XII Grade Percentage", expectedKey: "academics.twelfth.percentage" },
    { label: "X Grade Institute/University*", expectedKey: "academics.tenth.schoolName" },
    { label: "X Grade Board of Education*", expectedKey: "academics.tenth.board" },
    { label: "X Grade Year of Passing", expectedKey: "academics.tenth.passingYear" },
    { label: "X Grade Percentage", expectedKey: "academics.tenth.percentage" },
    { label: "Graduation Institute/University*", expectedKey: "academics.graduation.collegeName" },
    { label: "Graduation Specialization*", expectedKey: "academics.graduation.branch" },
    { label: "12th Standard College Name", expectedKey: "academics.twelfth.collegeName" },
    { label: "10th Standard School Name", expectedKey: "academics.tenth.schoolName" },
    { label: "Junior College Name", expectedKey: "academics.twelfth.collegeName" },
    { label: "12th Stream (PCMCS)", expectedKey: "academics.twelfth.stream" },
    { label: "12th Major Subjects", expectedKey: "academics.twelfth.subjects" }
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

  const mockAadhaarFull = { getAttribute: () => "Aadhaar Number *" };
  const fullVal = aadhaarPattern.getValue(DEFAULT_PROFILE, mockAadhaarFull);
  assert(fullVal === "270883622036", `Aadhaar Full 12 digits -> "270883622036" [Got: "${fullVal}"]`);

  // Verify 2-Field vs 3-Field Name Heuristics
  console.log("\n[3.1] Testing 2-Field vs 3-Field Name Heuristic Logic:");
  const firstNamePattern = FIELD_PATTERNS.find(p => p.key === "personal.firstName");
  const middleNamePattern = FIELD_PATTERNS.find(p => p.key === "personal.middleName");
  const lastNamePattern = FIELD_PATTERNS.find(p => p.key === "personal.lastName");

  // Mock a 2-field form (form with first + last name, no middle name)
  const mockForm2Field = {
    form: {
      querySelectorAll: (sel) => {
        if (sel.includes('input')) return [{ name: 'firstName' }, { name: 'lastName' }];
        return [];
      }
    }
  };

  // Mock a 3-field form (form with first + middle + last name)
  const mockForm3Field = {
    form: {
      querySelectorAll: (sel) => {
        if (sel.includes('input')) return [{ name: 'firstName' }, { name: 'middleName' }, { name: 'lastName' }];
        return [];
      }
    }
  };

  const fName2 = firstNamePattern.getValue(DEFAULT_PROFILE, mockForm2Field);
  assert(fName2 === "Mohammad Danish Khan", `2-Field Form: First Name -> "Mohammad Danish Khan" [Got: "${fName2}"]`);

  const lName2 = lastNamePattern.getValue(DEFAULT_PROFILE, mockForm2Field);
  assert(lName2 === "Naeem Khan", `2-Field Form: Last Name -> "Naeem Khan" [Got: "${lName2}"]`);

  const fName3 = firstNamePattern.getValue(DEFAULT_PROFILE, mockForm3Field);
  assert(fName3 === "Mohammad Danish", `3-Field Form: First Name -> "Mohammad Danish" [Got: "${fName3}"]`);

  const mName3 = middleNamePattern.getValue(DEFAULT_PROFILE, mockForm3Field);
  assert(mName3 === "Khan", `3-Field Form: Middle Name -> "Khan" [Got: "${mName3}"]`);

  const lName3 = lastNamePattern.getValue(DEFAULT_PROFILE, mockForm3Field);
  assert(lName3 === "Naeem Khan", `3-Field Form: Last Name -> "Naeem Khan" [Got: "${lName3}"]`);

  // Verify HTML Attribute Signal Scrubbing & Robust Matching
  console.log("\n[3.2] Testing HTML Attribute Signal Scrubbing & Robust Matching:");
  const { buildCombinedSignal } = require('../content/heuristics.js');
  const signalSkillsWithName = buildCombinedSignal({ label: "Primary Skills:", fieldName: "name" });
  const matchSkillsWithName = matchLabel(signalSkillsWithName);
  assert(matchSkillsWithName && matchSkillsWithName.key === "skills.primary", `Signal "Primary Skills:" with name="name" -> skills.primary [Got: ${matchSkillsWithName?.key || 'NONE'}]`);

  const signalEduWithName = buildCombinedSignal({ label: "Education Details", fieldName: "name" });
  const matchEduWithName = matchLabel(signalEduWithName);
  assert(matchEduWithName && matchEduWithName.key === "academics.educationDetails", `Signal "Education Details" with name="name" -> academics.educationDetails [Got: ${matchEduWithName?.key || 'NONE'}]`);

  // [3.3] TCS NextStep & Enterprise Section Scoping (XII Grade, X Grade, Graduation)
  console.log("\n[3.3] Testing TCS NextStep Section Scoping (XII Grade vs X Grade vs Graduation):");
  
  // XII Grade: Institute/University* -> Shri D. L. Hindi Junior College
  const sigXiiInst = buildCombinedSignal({ label: "Institute/University*", sectionHeading: "XII Grade" });
  const matchXiiInst = matchLabel(sigXiiInst);
  assert(matchXiiInst && matchXiiInst.key === "academics.twelfth.collegeName", `XII Grade "Institute/University*" -> academics.twelfth.collegeName [Got: ${matchXiiInst?.key || 'NONE'}]`);
  assert(matchXiiInst && matchXiiInst.value.includes("Shri D. L. Hindi"), `XII Grade Institute Value -> "Shri D. L. Hindi Junior College, Bhusawal" [Got: "${matchXiiInst?.value}"]`);

  // XII Grade: Specialization* -> Computer Science (PCM + CS)
  const sigXiiSpec = buildCombinedSignal({ label: "Specialization*", sectionHeading: "XII Grade" });
  const matchXiiSpec = matchLabel(sigXiiSpec);
  assert(matchXiiSpec && matchXiiSpec.key === "academics.twelfth.specialization", `XII Grade "Specialization*" -> academics.twelfth.specialization [Got: ${matchXiiSpec?.key || 'NONE'}]`);
  assert(matchXiiSpec && matchXiiSpec.value.includes("Computer Science"), `XII Grade Specialization Value -> "Computer Science (PCM + CS)" [Got: "${matchXiiSpec?.value}"]`);

  // XII Grade: Board of Education* -> Maharashtra State Board
  const sigXiiBoard = buildCombinedSignal({ label: "Board of Education*", sectionHeading: "XII Grade" });
  const matchXiiBoard = matchLabel(sigXiiBoard);
  assert(matchXiiBoard && matchXiiBoard.key === "academics.twelfth.board", `XII Grade "Board of Education*" -> academics.twelfth.board [Got: ${matchXiiBoard?.key || 'NONE'}]`);

  // X Grade: Institute/University* -> B.Z. Urdu High School
  const sigXInst = buildCombinedSignal({ label: "Institute/University*", sectionHeading: "X Grade" });
  const matchXInst = matchLabel(sigXInst);
  assert(matchXInst && matchXInst.key === "academics.tenth.schoolName", `X Grade "Institute/University*" -> academics.tenth.schoolName [Got: ${matchXInst?.key || 'NONE'}]`);
  assert(matchXInst && matchXInst.value.includes("B.Z. Urdu High School"), `X Grade School Value -> "B.Z. Urdu High School & Jr. College..." [Got: "${matchXInst?.value}"]`);

  // Graduation: Institute/University* -> G H Raisoni College
  const sigGradInst = buildCombinedSignal({ label: "Institute/University*", sectionHeading: "Graduation Details" });
  const matchGradInst = matchLabel(sigGradInst);
  assert(matchGradInst && matchGradInst.key === "academics.graduation.collegeName", `Graduation "Institute/University*" -> academics.graduation.collegeName [Got: ${matchGradInst?.key || 'NONE'}]`);
  assert(matchGradInst && matchGradInst.value.includes("G H Raisoni"), `Graduation College Value -> "G H Raisoni College..." [Got: "${matchGradInst?.value}"]`);

  // [3.4] TCS NextStep 12th & 10th Marks & Radio Group Immunity Tests
  console.log("\n[3.4] Testing 12th & 10th Marks Scoping & Subject-Wise Breakdown:");

  // TCS NextStep Signal with Grading System Radio text included
  const sigXiiMarksObt = buildCombinedSignal({ label: "Total Marks Obtained*", sectionHeading: "XII Grade / Equivalent Diploma", placeholder: "Marks CGPA" });
  const matchXiiMarksObt = matchLabel(sigXiiMarksObt);
  assert(matchXiiMarksObt && matchXiiMarksObt.key === "academics.twelfth.marksObtained", `XII Grade "Total Marks Obtained*" -> academics.twelfth.marksObtained [Got: ${matchXiiMarksObt?.key || 'NONE'}]`);
  assert(matchXiiMarksObt && matchXiiMarksObt.value === "423", `XII Grade Marks Obtained Value -> "423" [Got: "${matchXiiMarksObt?.value}"]`);

  const sigXiiMaxMarks = buildCombinedSignal({ label: "Total Maximum Marks*", sectionHeading: "XII Grade / Equivalent Diploma", placeholder: "Marks CGPA" });
  const matchXiiMaxMarks = matchLabel(sigXiiMaxMarks);
  assert(matchXiiMaxMarks && matchXiiMaxMarks.key === "academics.twelfth.totalMarks", `XII Grade "Total Maximum Marks*" -> academics.twelfth.totalMarks [Got: ${matchXiiMaxMarks?.key || 'NONE'}]`);
  assert(matchXiiMaxMarks && matchXiiMaxMarks.value === "600", `XII Grade Maximum Marks Value -> "600" [Got: "${matchXiiMaxMarks?.value}"]`);

  // 10th Marks
  const sigXMarksObt = buildCombinedSignal({ label: "Total Marks Obtained*", sectionHeading: "X Grade", placeholder: "Marks CGPA" });
  const matchXMarksObt = matchLabel(sigXMarksObt);
  assert(matchXMarksObt && matchXMarksObt.key === "academics.tenth.marksObtained", `X Grade "Total Marks Obtained*" -> academics.tenth.marksObtained [Got: ${matchXMarksObt?.key || 'NONE'}]`);
  assert(matchXMarksObt && matchXMarksObt.value === "448", `X Grade Marks Obtained Value -> "448" [Got: "${matchXMarksObt?.value}"]`);

  const sigXMaxMarks = buildCombinedSignal({ label: "Total Maximum Marks*", sectionHeading: "X Grade", placeholder: "Marks CGPA" });
  const matchXMaxMarks = matchLabel(sigXMaxMarks);
  assert(matchXMaxMarks && matchXMaxMarks.key === "academics.tenth.totalMarks", `X Grade "Total Maximum Marks*" -> academics.tenth.totalMarks [Got: ${matchXMaxMarks?.key || 'NONE'}]`);
  assert(matchXMaxMarks && matchXMaxMarks.value === "500", `X Grade Maximum Marks Value -> "500" [Got: "${matchXMaxMarks?.value}"]`);

  // 12th Individual Subject Marks
  const matchMaths = matchLabel("12th Mathematics Marks");
  assert(matchMaths && matchMaths.value === "85", `12th Maths Marks -> "85" [Got: "${matchMaths?.value}"]`);

  const matchPhysics = matchLabel("12th Physics Marks");
  assert(matchPhysics && matchPhysics.value === "70", `12th Physics Marks -> "70" [Got: "${matchPhysics?.value}"]`);

  const matchChem = matchLabel("12th Chemistry Marks");
  assert(matchChem && matchChem.value === "79", `12th Chemistry Marks -> "79" [Got: "${matchChem?.value}"]`);

  const matchCS = matchLabel("12th Computer Science Marks");
  assert(matchCS && matchCS.value === "138", `12th Computer Science Marks -> "138" [Got: "${matchCS?.value}"]`);

  const matchEng = matchLabel("12th English Marks");
  assert(matchEng && matchEng.value === "51", `12th English Marks -> "51" [Got: "${matchEng?.value}"]`);

  // 4. Test Smart Boolean Classifier
  console.log("\n[4] Testing Smart Boolean (Yes/No) Classifier:");
  assert(resolveBooleanQuestion("Are you legally authorized to work in India?") === "Yes", "Work auth question -> Yes");
  assert(resolveBooleanQuestion("Will you require visa sponsorship in India?") === "No", "Visa sponsorship in India -> No");
  assert(resolveBooleanQuestion("Do you have any active backlogs or standing arrears?") === "No", "Backlogs -> No");
  assert(resolveBooleanQuestion("Have you ever been convicted of any criminal offense?") === "No", "Criminal conviction -> No");
  assert(resolveBooleanQuestion("Are you willing to relocate to Pune or Bengaluru?") === "Yes", "Relocation -> Yes");
  assert(resolveBooleanQuestion("Are you comfortable working in rotational shifts?") === "Yes", "Shift work -> Yes");
  assert(resolveBooleanQuestion("Do you agree to company terms and data processing consent?") === "Yes", "Consent -> Yes");
  assert(resolveBooleanQuestion("Are you interested in a PPO (pre-placement offer) post the internship completion ? *") === "Yes", "PPO interest -> Yes");
  assert(resolveBooleanQuestion("Have you gone through the program details? Are you clear about the stipend and the program structure? *") === "Yes", "Stipend & structure -> Yes");

  // 5. Test AI Open-Ended Question Detector
  console.log("\n[5] Testing AI Open-Ended Question Detector & Instant Fallbacks:");
  assert(isOpenEndedQuestion("Why do you want to join our engineering team?"), "Identified 'Why join' as open-ended question");
  assert(isOpenEndedQuestion("Describe your most challenging technical project and how you solved it."), "Identified 'Project challenge' as open-ended question");
  assert(isOpenEndedQuestion("What are your greatest technical strengths?"), "Identified 'Strengths' as open-ended question");
  assert(!isOpenEndedQuestion("Full Name"), "Full Name rejected from AI question classification");
  assert(!isOpenEndedQuestion("Phone Number"), "Phone rejected from AI question classification");
  assert(!isOpenEndedQuestion("Annual Expected Salary (INR) *"), "Expected Salary rejected from AI question classification");
  assert(!isOpenEndedQuestion("Annual Current Salary (INR) ((Put 0 if you're applying for internship role) *"), "Current Salary rejected from AI question classification");
  assert(!isOpenEndedQuestion("Your relevant experience (in months) *"), "Relevant experience rejected from AI question classification");
  assert(!isOpenEndedQuestion("How soon can you start? (in days) *"), "How soon can you start rejected from AI question classification");

  assert(isOpenEndedQuestion("What three words or phrases best describe our company? *"), "Identified 'What three words describe company' as open-ended");
  assert(resolveBooleanQuestion("What three words or phrases best describe our company? *") === null, "'What three words' rejected from boolean question resolution");
  assert(isOpenEndedQuestion("How would you handle a situation where another team member was critical of your work?"), "Identified 'How would you handle critical team member' as open-ended");
  assert(resolveBooleanQuestion("How would you handle a situation where another team member was critical of your work?") === null, "'Critical feedback' rejected from boolean question resolution");

  const instant3Words = generateInstantFallbackAnswer("What three words or phrases best describe our company? *", DEFAULT_PROFILE);
  assert(instant3Words.includes("Innovative"), "Instant fallback generates rich 3-word company description");

  const instantCriticism = generateInstantFallbackAnswer("How would you handle a situation where another team member was critical of your work?", DEFAULT_PROFILE);
  assert(instantCriticism.includes("critical feedback") || instantCriticism.includes("continuous improvement"), "Instant fallback generates constructive answer for critical feedback");

  const instantCoverLetter = generateInstantFallbackAnswer("Please write a cover letter for this position", DEFAULT_PROFILE);
  assert(instantCoverLetter.includes("CodeRace") && instantCoverLetter.includes("Madina"), "Instant fallback generates tailored Cover Letter referencing candidate projects");

  // Role fit / Message tests matching user request
  assert(isOpenEndedQuestion("How do you fit in this role/Any additional information"), "Identified 'How do you fit in this role' as open-ended");
  assert(isOpenEndedQuestion("Message"), "Identified 'Message' as open-ended question");

  const instantRoleFit = generateInstantFallbackAnswer("How do you fit in this role/Any additional information", DEFAULT_PROFILE, 300);
  assert(instantRoleFit.includes("strong fit for this role") && instantRoleFit.includes("React.js") && instantRoleFit.includes("MongoDB"), "Instant fallback generates confident, natural role fit pitch");
  assert(instantRoleFit.length <= 300, `Role fit answer length (${instantRoleFit.length}) respects 300 character limit`);

  const instantMessage = generateInstantFallbackAnswer("Message", DEFAULT_PROFILE, 300);
  assert(instantMessage.includes("strong fit for this role"), "Message field generates confident role fit pitch");
  assert(instantMessage.length <= 300, `Message answer length (${instantMessage.length}) respects 300 character limit`);

  // 6. Test Gemini AI Field Inference Engine
  console.log("\n[6] Testing Gemini AI Field Inference Engine:");
  const { inferFieldWithGemini } = require('../background/gemini-client.js');
  const inferredPrefix = await inferFieldWithGemini({ label: "Prefix (?)", tag: "select", options: ["Mr.", "Ms.", "Mrs.", "Dr."] }, DEFAULT_PROFILE);
  assert(inferredPrefix === "Mr.", `AI Inferred Prefix: "${inferredPrefix}" [Expected: "Mr."]`);

  const inferredPassport = await inferFieldWithGemini({ label: "Do you hold a valid passport?", tag: "select", options: ["Yes", "No"] }, DEFAULT_PROFILE);
  assert(inferredPassport === "Yes", `AI Inferred Passport: "${inferredPassport}" [Expected: "Yes"]`);

  const inferredImmigration = await inferFieldWithGemini({ label: "Immigration Status *", tag: "select", options: ["Citizen", "Permanent Resident", "Work Visa", "Other"] }, DEFAULT_PROFILE);
  assert(inferredImmigration === "Citizen", `AI Inferred Immigration: "${inferredImmigration}" [Expected: "Citizen"]`);

  const inferredPpoDropdown = await inferFieldWithGemini({ label: "Are you interested in a PPO (pre-placement offer) post the internship completion ?", tag: "select", options: ["Yes", "No", "Maybe"] }, DEFAULT_PROFILE);
  assert(inferredPpoDropdown === "Yes", `AI Inferred PPO dropdown: "${inferredPpoDropdown}" [Expected: "Yes"]`);

  const inferredPpoInput = await inferFieldWithGemini({ label: "Are you interested in a PPO (pre-placement offer) post the internship completion ?", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredPpoInput === "Yes", `AI Inferred PPO text input: "${inferredPpoInput}" [Expected: "Yes"]`);

  const inferredStipend = await inferFieldWithGemini({ label: "Have you gone through the program details? Are you clear about the stipend and the program structure?", tag: "select", options: ["Yes", "No"] }, DEFAULT_PROFILE);
  assert(inferredStipend === "Yes", `AI Inferred Stipend & structure dropdown: "${inferredStipend}" [Expected: "Yes"]`);

  const inferredStipendInput = await inferFieldWithGemini({ label: "Have you gone through the program details? Are you clear about the stipend and the program structure?", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredStipendInput === "Yes", `AI Inferred Stipend & structure text input: "${inferredStipendInput}" [Expected: "Yes"]`);

  const inferredExpDropdown = await inferFieldWithGemini({ label: "How many months of work experience do you have ?", tag: "select", options: ["0-6 months", "6-12 months", "1-2 years"] }, DEFAULT_PROFILE);
  assert(inferredExpDropdown === "6-12 months", `AI Inferred Experience dropdown: "${inferredExpDropdown}" [Expected: "6-12 months"]`);

  const inferredExpInput = await inferFieldWithGemini({ label: "Your relevant experience (in months) *", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredExpInput === "12", `AI Inferred Experience text input: "${inferredExpInput}" [Expected: "12"]`);

  const inferredExpSalary = await inferFieldWithGemini({ label: "Annual Expected Salary (INR) *", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredExpSalary === "500000", `AI Inferred Expected Salary text input: "${inferredExpSalary}" [Expected: "500000"]`);

  const inferredCurSalary = await inferFieldWithGemini({ label: "Annual Current Salary (INR) ((Put 0 if you're applying for internship role) *", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredCurSalary === "0", `AI Inferred Current Salary text input: "${inferredCurSalary}" [Expected: "0"]`);

  const inferredSkills = await inferFieldWithGemini({ label: "Primary Skills:", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredSkills.includes("React") && inferredSkills.includes("Node"), `AI Inferred Primary Skills: contains React/Node`);

  const inferredEducation = await inferFieldWithGemini({ label: "Education Details", tag: "input" }, DEFAULT_PROFILE);
  assert(inferredEducation.includes("B.Tech") && inferredEducation.includes("Artificial Intelligence"), `AI Inferred Education Details: contains B.Tech AI`);

  const inferredExpYearsDropdown = await inferFieldWithGemini({ label: "Total years of Experience:", tag: "select", options: ["Select...", "0-1 Years", "1-2 Years", "2-3 Years", "3+ Years"] }, DEFAULT_PROFILE);
  assert(inferredExpYearsDropdown === "1-2 Years" || inferredExpYearsDropdown === "0-1 Years", `AI Inferred Experience dropdown: "${inferredExpYearsDropdown}"`);

  // 7. Test Field-Level Quick Fill Suggestions Engine
  console.log("\n[7] Testing Field-Level Quick Fill Suggestions Engine:");
  const nameSugg = getFieldSuggestions(null, "Full Name *", DEFAULT_PROFILE);
  assert(nameSugg.primary && nameSugg.primary.value.includes("Mohammad Danish Khan"), `Full Name Suggestion -> "${nameSugg.primary?.value}"`);
  assert(nameSugg.alternatives.length > 0, `Full Name has alternative chips (${nameSugg.alternatives.length})`);

  const completedNameSugg = getFieldSuggestions(null, "COMPLETED NAME *", DEFAULT_PROFILE);
  assert(completedNameSugg.primary && completedNameSugg.primary.value.includes("Mohammad Danish Khan"), `COMPLETED NAME * Suggestion -> "${completedNameSugg.primary?.value}"`);

  const emailSugg = getFieldSuggestions(null, "Email Address *", DEFAULT_PROFILE);
  assert(emailSugg.primary && emailSugg.primary.value === "danishkhan.jsx@gmail.com", `Email Suggestion -> "${emailSugg.primary?.value}"`);

  const skillsSugg = getFieldSuggestions(null, "Primary Skills:", DEFAULT_PROFILE);
  assert(skillsSugg.primary && skillsSugg.primary.value.includes("React"), `Primary Skills Suggestion -> "${skillsSugg.primary?.value?.slice(0, 35)}..."`);

  const eduSugg = getFieldSuggestions(null, "Education Details", DEFAULT_PROFILE);
  assert(eduSugg.primary && eduSugg.primary.value.includes("B.Tech"), `Education Details Suggestion -> "${eduSugg.primary?.value}"`);

  const expYearsSugg = getFieldSuggestions(null, "Total years of Experience:", DEFAULT_PROFILE);
  assert(expYearsSugg.primary && expYearsSugg.primary.value === "1", `Total Experience Years Suggestion -> "${expYearsSugg.primary?.value}"`);

  const ppoSugg = getFieldSuggestions(null, "Are you interested in a PPO (pre-placement offer) post the internship completion ? *", DEFAULT_PROFILE);
  assert(ppoSugg.primary && ppoSugg.primary.value === "Yes", `PPO Suggestion -> "${ppoSugg.primary?.value}" [Expected: "Yes"]`);
  assert(ppoSugg.alternatives.some(a => a.value === "No"), "PPO has alternative chip 'No'");

  const stipendSugg = getFieldSuggestions(null, "Have you gone through the program details? Are you clear about the stipend and the program structure? *", DEFAULT_PROFILE);
  assert(stipendSugg.primary && stipendSugg.primary.value === "Yes", `Stipend Suggestion -> "${stipendSugg.primary?.value}" [Expected: "Yes"]`);

  const expSugg = getFieldSuggestions(null, "Your relevant experience (in months) *", DEFAULT_PROFILE);
  assert(expSugg.primary && expSugg.primary.value === "12", `Work Experience Months Suggestion -> "${expSugg.primary?.value}" [Expected: "12"]`);
  assert(expSugg.alternatives.some(a => a.value.includes("6-12")), "Experience has range alternative '6-12 months'");

  const expSalarySugg = getFieldSuggestions(null, "Annual Expected Salary (INR) *", DEFAULT_PROFILE);
  assert(expSalarySugg.primary && expSalarySugg.primary.value === "500000", `Expected Salary Suggestion -> "${expSalarySugg.primary?.value}" [Expected: "500000"]`);

  const curSalarySugg = getFieldSuggestions(null, "Annual Current Salary (INR) ((Put 0 if you're applying for internship role) *", DEFAULT_PROFILE);
  assert(curSalarySugg.primary && curSalarySugg.primary.value === "0", `Current Salary Suggestion -> "${curSalarySugg.primary?.value}" [Expected: "0"]`);

  const startDaysSugg = getFieldSuggestions(null, "How soon can you start? (in days) *", DEFAULT_PROFILE);
  assert(startDaysSugg.primary && startDaysSugg.primary.value === "0", `Start Days Suggestion -> "${startDaysSugg.primary?.value}" [Expected: "0"]`);

  const resumeSugg = getFieldSuggestions(null, "Upload Resume / CV *", DEFAULT_PROFILE);
  assert(resumeSugg.isResume === true, "Resume / File upload field detected correctly");

  const openEndedSugg = getFieldSuggestions(null, "Why do you want to join our company?", DEFAULT_PROFILE);
  assert(openEndedSugg.isOpenEnded === true, "Open-ended question detected for AI generation");

  // 8. Test Smart Job Form Identification Engine
  console.log("\n[8] Testing Smart Job Form Identification & Context Engine:");
  
  // Mock mock DOM container
  const createMockDoc = (htmlText = '', isPortal = false) => {
    const makeElement = (tag = 'div', text = '') => ({
      tagName: tag,
      innerText: text || htmlText,
      textContent: text || htmlText,
      name: (text || htmlText).includes('resume') ? 'resume' : '',
      placeholder: (text || htmlText).includes('ctc') ? 'Expected CTC' : '',
      getAttribute: () => '',
      querySelectorAll: (sel) => {
        if (sel.includes('input') || sel.includes('textarea')) {
          if ((text || htmlText).includes('resume') || (text || htmlText).includes('experience') || (text || htmlText).includes('ctc')) {
            return [
              { name: 'resume', type: 'file', placeholder: 'Upload Resume', getAttribute: () => '' },
              { name: 'expectedCtc', type: 'text', placeholder: 'Expected CTC', getAttribute: () => '' },
              { name: 'experience', type: 'text', placeholder: 'Experience', getAttribute: () => '' }
            ];
          }
        }
        return [];
      }
    });

    return {
      body: makeElement('body', htmlText),
      querySelectorAll: (sel) => {
        if (isPortal) return [makeElement('input'), makeElement('input'), makeElement('input'), makeElement('input')];
        if (sel.includes('form') || sel.includes('main') || sel.includes('body')) {
          return [makeElement('form', htmlText)];
        }
        if (sel.includes('input')) {
          return (htmlText.includes('resume') || htmlText.includes('experience') || htmlText.includes('ctc'))
            ? [makeElement('input'), makeElement('input'), makeElement('input')]
            : [];
        }
        return [];
      },
      querySelector: () => null,
      getElementById: () => null
    };
  };

  // Job portal checks
  const linkedinCheck = JobDetector.analyzePage(createMockDoc('LinkedIn Easy Apply Form', true), { hostname: 'www.linkedin.com', pathname: '/jobs/view/12345' });
  assert(linkedinCheck.isJobForm === true && linkedinCheck.platform === 'LinkedIn Easy Apply', "LinkedIn Easy Apply detected as active Job Form");

  const greenhouseCheck = JobDetector.analyzePage(createMockDoc('Greenhouse Application', true), { hostname: 'boards.greenhouse.io', pathname: '/stripe/jobs/123' });
  assert(greenhouseCheck.isJobForm === true && greenhouseCheck.platform === 'Greenhouse', "Greenhouse portal detected as active Job Form");

  const leverCheck = JobDetector.analyzePage(createMockDoc('Lever Application', true), { hostname: 'jobs.lever.co', pathname: '/openai/abc' });
  assert(leverCheck.isJobForm === true && leverCheck.platform === 'Lever', "Lever portal detected as active Job Form");

  const workdayCheck = JobDetector.analyzePage(createMockDoc('Workday Application', true), { hostname: 'adobe.myworkdayjobs.com', pathname: '/careers' });
  assert(workdayCheck.isJobForm === true && workdayCheck.platform === 'Workday', "Workday portal detected as active Job Form");

  const gfJobCheck = JobDetector.analyzePage(createMockDoc('Software Engineer Job Application - Upload your resume, enter CTC, experience in years, and degree.', true), { hostname: 'docs.google.com', pathname: '/forms/d/e/1FAIpQLSc.../viewform' });
  assert(gfJobCheck.isJobForm === true && gfJobCheck.platform.includes('Google Forms'), "Google Forms Job Application questionnaire identified");

  const customFormCheck = JobDetector.analyzePage(createMockDoc('Company Careers Portal: Please upload your resume, enter your b.tech college name, cgpa, and expected ctc.'), { hostname: 'careers.startup.io', pathname: '/apply' });
  assert(customFormCheck.isJobForm === true, "Generic domain with career keywords identified as Job Application Form");

  // Negative checks (Non-job pages must be classified as Standby / Non-Job Page)
  const youtubeCheck = JobDetector.analyzePage(createMockDoc('Search YouTube. Post a comment. Subscribe to channel.'), { hostname: 'www.youtube.com', pathname: '/watch' });
  assert(youtubeCheck.isJobForm === false && youtubeCheck.platform === 'Non-Job Page', "YouTube video page rejected from Job Form classification");

  const wikipediaCheck = JobDetector.analyzePage(createMockDoc('Wikipedia, the free encyclopedia. Search Wikipedia for articles and references.'), { hostname: 'en.wikipedia.org', pathname: '/wiki/JavaScript' });
  assert(wikipediaCheck.isJobForm === false && wikipediaCheck.platform === 'Non-Job Page', "Wikipedia search page rejected from Job Form classification");

  const checkoutCheck = JobDetector.analyzePage(createMockDoc('Shopping Cart - Checkout. Enter billing address, credit card number, and cvv.'), { hostname: 'www.amazon.in', pathname: '/checkout' });
  assert(checkoutCheck.isJobForm === false && checkoutCheck.platform === 'Non-Job Page', "eCommerce checkout page rejected from Job Form classification");

  // 9. Universal Date & Aadhaar Slicing Formatters
  console.log("\n[9] Testing Universal Date Formatter & Aadhaar Digit Slicer Edge Cases:");
  assert(formatCandidateDate("2005-06-01", "YYYY-MM-DD") === "2005-06-01", 'Date format YYYY-MM-DD -> "2005-06-01"');
  assert(formatCandidateDate("2005-06-01", "DD/MM/YYYY") === "01/06/2005", 'Date format DD/MM/YYYY -> "01/06/2005"');
  assert(formatCandidateDate("2005-06-01", "MM/DD/YYYY") === "06/01/2005", 'Date format MM/DD/YYYY -> "06/01/2005"');
  assert(formatCandidateDate("2005-06-01", "DD-MM-YYYY") === "01-06-2005", 'Date format DD-MM-YYYY -> "01-06-2005"');

  assert(formatAadhaarNumber("270883622036", "12") === "270883622036", 'Aadhaar 12-digit -> "270883622036"');
  assert(formatAadhaarNumber("270883622036", "8") === "83622036", 'Aadhaar 8-digit -> "83622036"');
  // 10. Gemini 2.5 Flash Model Support & Direct Form Field Values
  console.log("\n[10] Testing Gemini 2.5 Flash Support & Form Field Invariants:");
  const { testGeminiApiKey } = require('../background/gemini-client.js');
  assert(typeof testGeminiApiKey === 'function', "testGeminiApiKey function exported");

  const expFieldMatch = matchLabel("Annual Expected Salary (INR) *");
  assert(expFieldMatch && expFieldMatch.key === "career.expectedCtc", "Annual Expected Salary (INR) * matches career.expectedCtc");
  assert(expFieldMatch && expFieldMatch.value === "500000", `Annual Expected Salary (INR) * returns "500000" [Got: "${expFieldMatch?.value}"]`);

  const curFieldMatch = matchLabel("Annual Current Salary (INR) ((Put 0 if you're applying for internship role) *");
  assert(curFieldMatch && curFieldMatch.key === "career.currentCtc", "Annual Current Salary (INR) matches career.currentCtc");
  assert(curFieldMatch && curFieldMatch.value === "0", `Annual Current Salary (INR) returns "0" [Got: "${curFieldMatch?.value}"]`);

  const expMonthsMatch = matchLabel("Your relevant experience (in months) *");
  assert(expMonthsMatch && expMonthsMatch.key === "career.totalExperienceMonths", "Your relevant experience (in months) matches career.totalExperienceMonths");
  assert(expMonthsMatch && expMonthsMatch.value === "12", `Your relevant experience (in months) returns "12" [Got: "${expMonthsMatch?.value}"]`);

  const startDaysMatch = matchLabel("How soon can you start? (in days) *");
  assert(startDaysMatch && startDaysMatch.key === "career.noticePeriodDays", "How soon can you start? (in days) matches career.noticePeriodDays");
  assert(startDaysMatch && startDaysMatch.value === "0", `How soon can you start? (in days) returns "0" [Got: "${startDaysMatch?.value}"]`);

  // Ensure isOpenEndedQuestion rejects numeric/days/salary
  assert(!isOpenEndedQuestion("How soon can you start? (in days) *"), "How soon can you start? (in days) rejected from AI essay question classification");
  assert(!isOpenEndedQuestion("Annual Expected Salary (INR) *"), "Annual Expected Salary (INR) rejected from AI essay question classification");
  assert(!isOpenEndedQuestion("Annual Current Salary (INR) ((Put 0 if you're applying for internship role) *"), "Annual Current Salary rejected from AI essay question classification");
  // 11. Testing setNativeValue and Dynamic Skills Insertion
  console.log("\n[11] Testing setNativeValue & In-Field Insertion Engine:");
  const { setNativeValue } = require('../content/adapters.js');
  
  // Mock DOM input element
  const mockInput = {
    tagName: 'INPUT',
    type: 'text',
    value: '',
    attributes: {},
    eventsDispatched: [],
    placeholder: 'Skills',
    focus() {},
    setAttribute(name, val) { this.attributes[name] = val; },
    getAttribute(name) { return this.attributes[name] || null; },
    dispatchEvent(event) {
      this.eventsDispatched.push(event.type);
      return true;
    }
  };

  const skillsSuggObj = getFieldSuggestions(mockInput, '', DEFAULT_PROFILE);
  assert(skillsSuggObj && skillsSuggObj.primary && skillsSuggObj.primary.value.includes("React"), "Skills placeholder generates primary suggestion with React");

  const inserted = setNativeValue(mockInput, skillsSuggObj.primary.value);
  assert(inserted === true, "setNativeValue returns true for text input");
  assert(mockInput.value.includes("React.js"), "mockInput value populated correctly");
  assert(mockInput.attributes['value'] && mockInput.attributes['value'].includes("React.js"), "mockInput HTML attribute value synced");
  assert(mockInput.eventsDispatched.includes('input'), "Input event dispatched");
  assert(mockInput.eventsDispatched.includes('change'), "Change event dispatched");
  assert(!mockInput.eventsDispatched.includes('blur'), "Synthetic blur event omitted to protect framework reactivity");

  console.log("\n==================================================");
  console.log(`Master Verification Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();

