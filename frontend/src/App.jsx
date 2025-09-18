import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Profile from "./Profile";

function Home() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // later this can connect to backend PHP
    navigate("/profile");
  };

  return (
    <div>
      <h1>Welcome to CSE442 Project</h1>
      <button onClick={handleLogin}>Login</button>
    </div>
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
