import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const regions = [
  "Addis Ababa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "Southwest Ethiopia",
  "Tigray",
  "Dire Dawa",
];

function RegisterPatient() {
  const navigate = useNavigate();

  const [patient, setPatient] = useState({
    fullName: "",
    dateOfBirth: "",
    sex: "",
    phone: "",
    region: "",
    city: "",
    facility: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setPatient((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setErrorMessage("");

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    const fullName = patient.fullName.trim();
    const phone = patient.phone.trim();
    const region = patient.region.trim();
    const city = patient.city.trim();
    const facility = patient.facility.trim();

    if (!fullName) {
      setErrorMessage(
        "Please enter the patient's full name."
      );
      return;
    }

    if (!patient.dateOfBirth) {
      setErrorMessage(
        "Please enter the patient's date of birth."
      );
      return;
    }

    if (!patient.sex) {
      setErrorMessage(
        "Please select the patient's sex."
      );
      return;
    }

    if (!region) {
      setErrorMessage(
        "Please select the patient's region."
      );
      return;
    }

    if (!city) {
      setErrorMessage(
        "Please enter the patient's city or town."
      );
      return;
    }

    if (!facility) {
      setErrorMessage(
        "Please enter the health facility."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // =================================================
      // CURRENT USER
      // =================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "GET USER ERROR:",
          userError
        );

        throw new Error(
          "Unable to verify the logged-in user."
        );
      }

      if (!user) {
        throw new Error(
          "You are not logged in. Please log in again."
        );
      }

      // =================================================
      // ADDRESS
      //
      // Keep this for compatibility with existing data.
      // But Region, City and Facility are ALSO saved
      // separately below.
      // =================================================

      const address = [
        facility,
        city,
        region,
      ]
        .filter(Boolean)
        .join(", ");

      // =================================================
      // INSERT PATIENT
      // =================================================

      const { data: newPatient, error: insertError } =
        await supabase
          .from("patients")
          .insert({
            full_name: fullName,

            date_of_birth:
              patient.dateOfBirth,

            gender:
              patient.sex,

            phone:
              phone || null,

            // -----------------------------------------
            // IMPORTANT
            // -----------------------------------------

            region:
              region,

            city:
              city,

            facility:
              facility,

            // Keep address for compatibility
            address:
              address || null,

            registered_by:
              user.id,
          })
          .select()
          .single();

      if (insertError) {
        console.error(
          "REGISTER PATIENT ERROR:",
          insertError
        );

        throw new Error(
          insertError.message ||
            "Unable to save the patient."
        );
      }

      if (!newPatient) {
        throw new Error(
          "Patient was not returned after saving."
        );
      }

      // =================================================
      // DEBUG
      // =================================================

      console.log(
        "PATIENT SUCCESSFULLY SAVED:",
        newPatient
      );

      console.log(
        "PATIENT ID:",
        newPatient.patient_id
      );

      console.log(
        "REGION:",
        newPatient.region
      );

      console.log(
        "CITY:",
        newPatient.city
      );

      console.log(
        "FACILITY:",
        newPatient.facility
      );

      // =================================================
      // CREATE FRONTEND PATIENT OBJECT
      // =================================================

      const patientForRequest = {
        // Database primary key
        id:
          newPatient.id,

        // Human-readable ID
        patientId:
          newPatient.patient_id,

        patient_id:
          newPatient.patient_id,

        // Name
        fullName:
          newPatient.full_name,

        full_name:
          newPatient.full_name,

        // Date
        dateOfBirth:
          newPatient.date_of_birth,

        date_of_birth:
          newPatient.date_of_birth,

        // Sex
        sex:
          newPatient.gender,

        gender:
          newPatient.gender,

        // Contact
        phone:
          newPatient.phone,

        // LOCATION
        region:
          newPatient.region,

        city:
          newPatient.city,

        facility:
          newPatient.facility,

        // Compatibility
        address:
          newPatient.address,
      };

      // =================================================
      // GO TO LABORATORY REQUEST
      // =================================================

      navigate(
        "/laboratory-request",
        {
          state: {
            patient:
              patientForRequest,
          },
        }
      );

    } catch (error) {
      console.error(
        "REGISTER PATIENT ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Something went wrong while registering the patient."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="samplogy-page">

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;
          background: #f6f9fb;
          color: #172033;
        }

        button,
        input,
        select {
          font-family: inherit;
        }

        .samplogy-page {
          min-height: 100vh;
          background: #f6f9fb;
        }

        /* =========================================
           TOP BAR
        ========================================= */

        .topbar {
          min-height: 74px;
          width: 100%;
          background: #ffffff;
          border-bottom: 1px solid #e6ebef;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 42px;
          gap: 20px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
        }

        .logo {
          width: 145px;
          height: auto;
          max-height: 55px;
          object-fit: contain;
          display: block;
        }

        .brand-divider {
          width: 1px;
          height: 28px;
          background: #e3e8ec;
        }

        .portal-text {
          color: #667085;
          font-size: 11px;
          font-weight: 550;
          white-space: nowrap;
        }

        .back-button {
          flex-shrink: 0;
          border: 1px solid #dfe6eb;
          background: #ffffff;
          color: #536173;
          border-radius: 8px;
          padding: 9px 14px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 650;
        }

        .back-button:hover {
          background: #f7fafb;
          border-color: #c7d2da;
        }

        /* =========================================
           CONTENT
        ========================================= */

        .content {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 34px 30px 45px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: #98a2b3;
          font-size: 10px;
          margin-bottom: 11px;
        }

        .breadcrumb-current {
          color: #087f8c;
          font-weight: 650;
        }

        .heading {
          margin-bottom: 25px;
        }

        .heading h1 {
          margin: 0;
          color: #172033;
          font-size: 27px;
          line-height: 1.2;
          font-weight: 750;
          letter-spacing: -0.6px;
        }

        .heading p {
          max-width: 650px;
          margin: 7px 0 0;
          color: #7c8796;
          font-size: 12px;
          line-height: 1.6;
        }

        /* =========================================
           ERROR
        ========================================= */

        .error-message {
          width: 100%;
          margin-bottom: 18px;
          padding: 13px 16px;
          border: 1px solid #f3c4c4;
          background: #fff5f5;
          color: #b42318;
          border-radius: 9px;
          font-size: 11px;
          line-height: 1.5;
        }

        /* =========================================
           INFO
        ========================================= */

        .patient-id-info {
          margin-top: 8px;
          padding: 9px 11px;
          border-radius: 7px;
          background: #edf8f8;
          color: #087f8c;
          font-size: 9px;
          line-height: 1.5;
        }

        /* =========================================
           PROGRESS
        ========================================= */

        .progress-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e5ebef;
          border-radius: 12px;
          padding: 17px 21px;
          margin-bottom: 20px;
          overflow-x: auto;
        }

        .progress {
          min-width: 520px;
          display: flex;
          align-items: center;
        }

        .step {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .step:last-child {
          flex: 0 0 auto;
        }

        .step-circle {
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 750;
        }

        .step-circle.active {
          background: #087f8c;
          color: #ffffff;
          box-shadow:
            0 0 0 4px #e4f5f5;
        }

        .step-circle.inactive {
          background: #f1f4f6;
          color: #98a2b3;
        }

        .step-label {
          margin-left: 8px;
          color: #344054;
          font-size: 10px;
          font-weight: 650;
          white-space: nowrap;
        }

        .step-label.inactive {
          color: #98a2b3;
        }

        .step-line {
          height: 1px;
          background: #dfe6eb;
          flex: 1;
          min-width: 35px;
          margin: 0 15px;
        }

        /* =========================================
           LAYOUT
        ========================================= */

        .form-layout {
          display: grid;
          grid-template-columns:
            280px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        /* =========================================
           INFO CARD
        ========================================= */

        .info-card {
          position: sticky;
          top: 20px;
          overflow: hidden;
          background:
            linear-gradient(
              145deg,
              #07547d 0%,
              #087f8c 62%,
              #0aa399 100%
            );
          color: #ffffff;
          border-radius: 14px;
          padding: 25px 22px;
        }

        .info-card::after {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
          right: -100px;
          bottom: -95px;
          border: 35px solid
            rgba(255,255,255,0.06);
          border-radius: 50%;
          pointer-events: none;
        }

        .info-icon {
          width: 44px;
          height: 44px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            rgba(255,255,255,0.12);
          border:
            1px solid rgba(255,255,255,0.14);
          font-size: 19px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .info-card h2 {
          position: relative;
          z-index: 1;
          margin: 0 0 8px;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 700;
        }

        .info-card-description {
          position: relative;
          z-index: 1;
          margin: 0;
          color:
            rgba(255,255,255,0.77);
          font-size: 10px;
          line-height: 1.65;
        }

        .info-divider {
          height: 1px;
          background:
            rgba(255,255,255,0.15);
          margin: 21px 0;
        }

        .info-list {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .info-check {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 50%;
          background:
            rgba(255,255,255,0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        .info-item-text {
          color:
            rgba(255,255,255,0.82);
          font-size: 10px;
          line-height: 1.45;
        }

        /* =========================================
           FORM CARD
        ========================================= */

        .form-card {
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e5ebef;
          border-radius: 14px;
          overflow: hidden;
        }

        .form-header {
          padding: 21px 25px;
          border-bottom:
            1px solid #edf1f4;
        }

        .form-header h2 {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 700;
        }

        .form-header p {
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 10px;
        }

        .form-body {
          padding: 25px;
        }

        /* =========================================
           SECTIONS
        ========================================= */

        .form-section {
          margin-bottom: 27px;
        }

        .form-section:last-child {
          margin-bottom: 0;
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 16px;
        }

        .section-number {
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          border-radius: 7px;
          background: #e9f7f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 750;
        }

        .section-heading h3 {
          margin: 0;
          color: #344054;
          font-size: 12px;
          font-weight: 700;
        }

        .section-heading p {
          margin: 0 0 0 auto;
          color: #a1aab6;
          font-size: 9px;
        }

        /* =========================================
           FIELDS
        ========================================= */

        .fields {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          margin-bottom: 7px;
          color: #475467;
          font-size: 10px;
          font-weight: 650;
        }

        .required {
          color: #e05252;
          margin-left: 2px;
        }

        .input,
        .select {
          width: 100%;
          height: 43px;
          border: 1px solid #dfe5ea;
          border-radius: 8px;
          background: #fbfcfd;
          color: #344054;
          outline: none;
          padding: 0 12px;
          font-size: 11px;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input::placeholder {
          color: #a7b0bb;
        }

        .input:hover,
        .select:hover {
          border-color: #cbd5dc;
        }

        .input:focus,
        .select:focus {
          border-color: #0a9097;
          background: #ffffff;
          box-shadow:
            0 0 0 3px
            rgba(8,127,140,0.08);
        }

        .field-help {
          margin: 5px 0 0;
          color: #a0a9b5;
          font-size: 9px;
          line-height: 1.4;
        }

        /* =========================================
           FOOTER
        ========================================= */

        .form-footer {
          min-height: 70px;
          border-top:
            1px solid #edf1f4;
          background: #fcfdfd;
          padding: 15px 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .required-note {
          color: #98a2b3;
          font-size: 9px;
        }

        .footer-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .cancel-button,
        .submit-button {
          min-height: 38px;
          border-radius: 8px;
          padding: 0 16px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 650;
          transition: 0.2s ease;
        }

        .cancel-button {
          border:
            1px solid #dfe5ea;
          background: #ffffff;
          color: #667085;
        }

        .cancel-button:hover {
          background: #f7f9fa;
        }

        .submit-button {
          border: none;
          background:
            linear-gradient(
              100deg,
              #075d87,
              #087f8c
            );
          color: #ffffff;
          box-shadow:
            0 5px 12px
            rgba(8,127,140,0.14);
        }

        .submit-button:hover {
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.65;
          cursor: wait;
          transform: none;
        }

        /* =========================================
           PAGE FOOTER
        ========================================= */

        .page-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 2px 0;
          color: #a0a9b5;
          font-size: 9px;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */

        @media (max-width: 1000px) {

          .topbar {
            padding: 12px 25px;
          }

          .content {
            padding: 30px 22px 40px;
          }

          .form-layout {
            grid-template-columns:
              230px minmax(0, 1fr);
          }

        }

        @media (max-width: 820px) {

          .form-layout {
            grid-template-columns: 1fr;
          }

          .info-card {
            position: static;
          }

          .info-list {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 13px;
          }

        }

        @media (max-width: 620px) {

          .topbar {
            min-height: 68px;
            padding: 10px 15px;
          }

          .logo {
            width: 125px;
          }

          .brand-divider,
          .portal-text {
            display: none;
          }

          .content {
            padding: 23px 13px 32px;
          }

          .heading h1 {
            font-size: 23px;
          }

          .progress-card {
            padding: 15px;
          }

          .progress {
            min-width: 470px;
          }

          .info-list {
            grid-template-columns: 1fr;
          }

          .form-header {
            padding: 18px;
          }

          .form-body {
            padding: 20px 18px;
          }

          .fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .field.full {
            grid-column: auto;
          }

          .section-heading p {
            display: none;
          }

          .form-footer {
            padding: 14px 18px;
            align-items: stretch;
            flex-direction: column;
          }

          .required-note {
            order: 2;
          }

          .footer-actions {
            width: 100%;
          }

          .cancel-button,
          .submit-button {
            flex: 1;
          }

          .page-footer {
            flex-direction: column;
            gap: 5px;
          }

        }

        @media (max-width: 380px) {

          .content {
            padding-left: 10px;
            padding-right: 10px;
          }

          .form-header,
          .form-body,
          .form-footer {
            padding-left: 15px;
            padding-right: 15px;
          }

          .footer-actions {
            flex-direction: column;
          }

          .cancel-button,
          .submit-button {
            width: 100%;
          }

        }

      `}</style>

      {/* ==================================================
          TOP BAR
      ================================================== */}

      <header className="topbar">

        <div className="brand-area">

          <img
            src="/samplogy-logo.png"
            alt="Samplogy Sample Delivery"
            className="logo"
          />

          <div className="brand-divider" />

          <span className="portal-text">
            Nurse Portal
          </span>

        </div>

        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate("/nurse-dashboard")
          }
        >
          ← Dashboard
        </button>

      </header>

      {/* ==================================================
          CONTENT
      ================================================== */}

      <main className="content">

        <div className="breadcrumb">
          <span>Samplogy</span>
          <span>/</span>
          <span>Nurse Portal</span>
          <span>/</span>
          <span className="breadcrumb-current">
            Register Patient
          </span>
        </div>

        <div className="heading">

          <h1>
            Register New Patient
          </h1>

          <p>
            Add patient information to begin a new
            Samplogy sample delivery request.
          </p>

        </div>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        {/* ==================================================
            PROGRESS
        ================================================== */}

        <div className="progress-card">

          <div className="progress">

            <div className="step">

              <div className="step-circle active">
                1
              </div>

              <span className="step-label">
                Patient Information
              </span>

            </div>

            <div className="step-line" />

            <div className="step">

              <div className="step-circle inactive">
                2
              </div>

              <span className="step-label inactive">
                Sample Request
              </span>

            </div>

            <div className="step-line" />

            <div className="step">

              <div className="step-circle inactive">
                3
              </div>

              <span className="step-label inactive">
                Delivery
              </span>

            </div>

          </div>

        </div>

        {/* ==================================================
            FORM
        ================================================== */}

        <div className="form-layout">

          {/* INFO */}

          <aside className="info-card">

            <div className="info-icon">
              +
            </div>

            <h2>
              Patient Registration
            </h2>

            <p className="info-card-description">
              Enter accurate patient information before
              moving to the sample request step.
            </p>

            <div className="info-divider" />

            <div className="info-list">

              <div className="info-item">
                <span className="info-check">
                  ✓
                </span>

                <span className="info-item-text">
                  Verify the patient's identification
                  information.
                </span>
              </div>

              <div className="info-item">
                <span className="info-check">
                  ✓
                </span>

                <span className="info-item-text">
                  Enter an accurate phone number
                  when available.
                </span>
              </div>

              <div className="info-item">
                <span className="info-check">
                  ✓
                </span>

                <span className="info-item-text">
                  Enter the patient's city or town.
                </span>
              </div>

              <div className="info-item">
                <span className="info-check">
                  ✓
                </span>

                <span className="info-item-text">
                  Enter the health facility.
                </span>
              </div>

            </div>

          </aside>

          {/* FORM CARD */}

          <form
            className="form-card"
            onSubmit={handleSubmit}
          >

            <div className="form-header">

              <h2>
                Patient Information
              </h2>

              <p>
                Complete all required fields to continue.
              </p>

              <div className="patient-id-info">
                Patient ID will be generated automatically
                after registration, for example:
                <strong> P000001</strong>.
              </div>

            </div>

            <div className="form-body">

              {/* BASIC INFORMATION */}

              <section className="form-section">

                <div className="section-heading">

                  <div className="section-number">
                    01
                  </div>

                  <h3>
                    Basic Information
                  </h3>

                  <p>
                    Patient identity
                  </p>

                </div>

                <div className="fields">

                  <div className="field full">

                    <label>
                      Full Name
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="input"
                      type="text"
                      name="fullName"
                      value={patient.fullName}
                      onChange={handleChange}
                      placeholder="Enter patient's full name"
                      required
                    />

                  </div>

                  <div className="field">

                    <label>
                      Date of Birth
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="input"
                      type="date"
                      name="dateOfBirth"
                      value={patient.dateOfBirth}
                      onChange={handleChange}
                      required
                    />

                  </div>

                  <div className="field">

                    <label>
                      Sex
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      className="select"
                      name="sex"
                      value={patient.sex}
                      onChange={handleChange}
                      required
                    >

                      <option value="">
                        Select sex
                      </option>

                      <option value="female">
                        Female
                      </option>

                      <option value="male">
                        Male
                      </option>

                    </select>

                  </div>

                  <div className="field full">

                    <label>
                      Phone Number
                    </label>

                    <input
                      className="input"
                      type="tel"
                      name="phone"
                      value={patient.phone}
                      onChange={handleChange}
                      placeholder="+251 9XX XXX XXX"
                    />

                    <p className="field-help">
                      Optional. Used for patient
                      communication when needed.
                    </p>

                  </div>

                </div>

              </section>

              {/* LOCATION */}

              <section className="form-section">

                <div className="section-heading">

                  <div className="section-number">
                    02
                  </div>

                  <h3>
                    Location & Facility
                  </h3>

                  <p>
                    Patient location
                  </p>

                </div>

                <div className="fields">

                  {/* REGION */}

                  <div className="field">

                    <label>
                      Region
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      className="select"
                      name="region"
                      value={patient.region}
                      onChange={handleChange}
                      required
                    >

                      <option value="">
                        Select region
                      </option>

                      {regions.map((region) => (
                        <option
                          key={region}
                          value={region}
                        >
                          {region}
                        </option>
                      ))}

                    </select>

                  </div>

                  {/* CITY */}

                  <div className="field">

                    <label>
                      City / Town
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="input"
                      type="text"
                      name="city"
                      value={patient.city}
                      onChange={handleChange}
                      placeholder="Enter city or town"
                      required
                    />

                  </div>

                  {/* FACILITY */}

                  <div className="field full">

                    <label>
                      Health Facility
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="input"
                      type="text"
                      name="facility"
                      value={patient.facility}
                      onChange={handleChange}
                      placeholder="Enter health facility name"
                      required
                    />

                    <p className="field-help">
                      Region, city and facility are saved
                      separately so the laboratory can
                      identify the request location correctly.
                    </p>

                  </div>

                </div>

              </section>

            </div>

            {/* FORM FOOTER */}

            <div className="form-footer">

              <span className="required-note">
                * Required fields
              </span>

              <div className="footer-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    navigate("/nurse-dashboard")
                  }
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving Patient..."
                    : "Continue to Sample Request →"}
                </button>

              </div>

            </div>

          </form>

        </div>

        <footer className="page-footer">

          <span>
            © 2026 Samplogy
          </span>

          <span>
            Secure Sample Delivery Platform
          </span>

        </footer>

      </main>

    </div>
  );
}

export default RegisterPatient;