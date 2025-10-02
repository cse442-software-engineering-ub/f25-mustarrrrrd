export default function MyCourses() {
  return (
    <div
      style={{
        color:"white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",   // centers horizontally
        textAlign: "center",
        paddingTop: "2rem",     // spacing from the very top
      }}
    >
      {/* Page Title */}
      <h1>My Courses</h1>

      {/* Search Bar */}
      <div style={{ marginTop: "1rem" }}>
        <input
          type="text"
          placeholder="Search by course code, name, or professor..."
        />
      </div>
    </div>
  );
}
