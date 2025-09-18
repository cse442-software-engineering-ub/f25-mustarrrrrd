import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Profile from "./Profile";

function Home() {
  const navigate = useNavigate();
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <button onClick={() => navigate("/profile")}>Login</button>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
