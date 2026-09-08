const { json, readBody, requirePost } = require("./_lib/http");
const { applicationExists, createApplication } = require("./_lib/airtable");
const { verifyVerification } = require("./_lib/verification-token");
const { validateApplication } = require("./_lib/validation");

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Send a valid application." });
  if (body.website) return json(res, 200, { submitted: true });

  const { errors, value } = validateApplication(body);
  if (Object.keys(errors).length) {
    return json(res, 400, { error: "Check the highlighted answers and try again.", fields: errors });
  }

  try {
    const emailVerified = verifyVerification(body.emailVerificationToken, "email", value.schoolEmail);
    const phoneVerified = verifyVerification(body.phoneVerificationToken, "sms", value.mobilePhone);
    if (!emailVerified || !phoneVerified) {
      return json(res, 400, {
        error: "Verify both your school email and phone number before applying.",
        fields: {
          ...(!emailVerified ? { schoolEmail: "Verify this school email again." } : {}),
          ...(!phoneVerified ? { mobilePhone: "Verify this phone number again." } : {}),
        },
      });
    }
    if (await applicationExists(value.schoolEmail)) {
      return json(res, 409, { error: "An application already exists for this school email. Email hello@campustakes.com if you need help." });
    }
    await createApplication(value);
    return json(res, 201, { submitted: true });
  } catch (error) {
    console.error("application submission failed", { status: error.status, details: error.details, name: error.name });
    return json(res, 503, { error: "Your application could not be saved right now. Your answers are still on this page—please try again shortly." });
  }
};
