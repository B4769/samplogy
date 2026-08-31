import { useNavigate } from "react-router-dom";

function LabRequestList() {
  const navigate = useNavigate();

  const savedRequest = localStorage.getItem(
    "laboratoryRequest"
  );

  const request = savedRequest
    ? JSON.parse(savedRequest)
    : null;

  const handleProcessRequest = () => {
    navigate("/laboratory-process-request");
  };

  return (
    <div>
      <h1>Laboratory Requests</h1>

      <p>
        View and process laboratory requests.
      </p>

      <hr />

      {!request ? (
        <div>
          <p>No laboratory requests available.</p>

          <button
            onClick={() => navigate("/laboratory")}
          >
            Back to Laboratory Dashboard
          </button>
        </div>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Health Facility</th>
              <th>Laboratory Tests</th>
              <th>Date</th>
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
                {request.patient.facility}
              </td>

              <td>
                {request.tests.map((test) => (
                  <div key={test}>
                    {test}
                  </div>
                ))}
              </td>

              <td>
                {request.requestDate}
              </td>

              <td>
                {request.status === "Pending"
                  ? "🟡 Pending"
                  : "🟢 Completed"}
              </td>

              <td>
                <button
                  onClick={handleProcessRequest}
                >
                  Process Request
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LabRequestList;