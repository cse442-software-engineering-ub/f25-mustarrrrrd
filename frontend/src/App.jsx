export default function App() {
  const handleClick = () => {
    // For now just log something or redirect
    console.log("Login button clicked");
    // Example redirect (later this could go to profile page or backend)
    window.location.href = "/CSE442/2025-Fall/cse-442ai/app/profile";
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <button onClick={handleClick}>Login</button>
    </main>
  );
}
