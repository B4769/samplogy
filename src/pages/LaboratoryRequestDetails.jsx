import { useLocation, useNavigate } from "react-router-dom";

function LaboratoryRequestDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const request = location.state?.request;

  const testNames = {
    cbc: "Complete Blood Count (CBC)",
    "blood-group": "Blood Group",
    "blood-glucose": "Blood Glucose",
    "liver-function": "Liver Function Test",
    "kidney-function": "Kidney Function Test",
    "lipid-profile": "Lipid Profile",
    urinalysis: "Urinalysis",
    "stool-test": "Stool Examination",
    malaria: "Malaria Test",
    hiv: "HIV Test",
    pregnancy: "Pregnancy Test",
  };

  if (!request) {
    return (
      <div>
        <h1>Laboratory Request Details</h1>

        <p>No request information was found.</p>

        <button onClick={() => navigate("/laboratory-requests")}>
          Back to Requests
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Laboratory Request Details</h1>

      <hr />

      <h2>Request Information</h2>

      <p>
        <strong>Request Date:</strong>{" "}
        {request.requestDate}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        🟡 {request.status}
      </p>

      <hr />

      <h2>Patient Information</h2>

      <p>
        <strong>Patient ID:</strong>{" "}
        {request.patient.patientId}
      </p>

      <p>
        <strong>Full Name:</strong>{" "}
        {request.patient.fullName}
      </p>

      <p>
        <strong>Date of Birth:</strong>{" "}
        {request.patient.dateOfBirth}
      </p>

      <p>
        <strong>Sex:</strong>{" "}
        {request.patient.sex}
      </p>

      <p>
        <strong>Phone Number:</strong>{" "}
        {request.patient.phone}
      </p>

      <p>
        <strong>Region:</strong>{" "}
        {request.patient.region}
      </p>

      <p>
        <strong>City / Town:</strong>{" "}
        {request.patient.city}
      </p>

      <p>
        <strong>Health Facility:</strong>{" "}
        {request.patient.facility}
      </p>

      <hr />

      <h2>Requested Laboratory Tests</h2>

      {request.tests.map((test) => (
        <p key={test}>
          ✓ {testNames[test] || test}
        </p>
      ))}

      <hr />

      <h2>Request Notes</h2>

      <p>
        {request.notes
          ? request.notes
          : "No additional notes."}
      </p>

      <br />

      <button
        onClick={() =>
          navigate("/laboratory-requests")
        }
      >
        Back to Requests
      </button>
    </div>
  );
}

export default LaboratoryRequestDetails;