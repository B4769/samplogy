import { useLocation, useNavigate } from "react-router-dom";

function LaboratoryRequests() {
  const location = useLocation();
  const navigate = useNavigate();

  const request = location.state?.request;

  // Laboratory test names
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
        <h1>Laboratory Requests</h1>

        <p>No laboratory requests found.</p>

        <button onClick={() => navigate("/nurse")}>
          Back to Nurse Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Laboratory Requests</h1>

      <p>
        View and track laboratory requests.
      </p>

      <hr />

      {/* Request Summary */}

      <h2>Request Summary</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Patient Name</th>
            <th>Laboratory Tests</th>
            <th>Request Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              {request.patient.patientId}
            </td>

            <td>
              {request.patient.fullName}
            </td>

            <td>
              {request.tests.map((test) => (
                <div key={test}>
                  ✓ {testNames[test] || test}
                </div>
              ))}
            </td>

            <td>
              {request.requestDate}
            </td>

            <td>
              <strong>
                🟡 {request.status}
              </strong>
            </td>

            <td>
              <button
                onClick={() =>
                  navigate("/laboratory-request-details", {
                    state: {
                      request: request,
                    },
                  })
                }
              >
                View Request
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <br />

      <button onClick={() => navigate("/nurse")}>
        Back to Nurse Dashboard
      </button>
    </div>
  );
}

export default LaboratoryRequests;