import api from "../api/axios";
import { logout } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Dashboard() {
  const [attendance, setAttendance] = useState<any>(null);
  const navigate = useNavigate();

  const punchIn = async () => {
    const res = await api.post("/attendance/login");
    setAttendance(res.data);
  };

  const punchOut = async () => {
    const res = await api.post("/attendance/logout");
    setAttendance(res.data);
  };

  const getToday = async () => {
    const res = await api.get("/attendance/today");
    setAttendance(res.data);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="space-x-4 mt-4">
        <button onClick={punchIn} className="bg-green-500 px-4 py-2 rounded text-white">Punch In</button>
        <button onClick={punchOut} className="bg-red-500 px-4 py-2 rounded text-white">Punch Out</button>
        <button onClick={getToday} className="bg-gray-600 px-4 py-2 rounded text-white">View Today</button>
        <button onClick={handleLogout} className="bg-black px-4 py-2 rounded text-white">Logout</button>
      </div>

      {attendance && (
        <pre className="mt-6 bg-gray-100 p-4 rounded">{JSON.stringify(attendance, null, 2)}</pre>
      )}
    </div>
  );
}
