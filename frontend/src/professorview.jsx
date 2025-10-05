import React, { useState } from "react";

export default function ProfessorView() {
  const [activeCourse, setActiveCourse] = useState("CSE116");

  const courses = [
    { code: "CSE116", students: 187 },
    { code: "CSE250", students: 145 },
    { code: "CSE442", students: 98 },
  ];

  const courseNames = {
    CSE116: "Introduction to Computer Science II",
    CSE250: "Data Structures",
    CSE442: "Software Engineering",
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 1.5rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            margin: 0,
            color: '#111'
          }}>Instructor Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: '#555', margin: 0 }}>
            Professor Mikida • Computer Science & Engineering
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '70rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Course Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {courses.map(course => {
            const isActive = course.code === activeCourse;
            return (
              <button
                key={course.code}
                onClick={() => setActiveCourse(course.code)}
                style={{
                  background: isActive ? '#111' : '#fff',
                  color: isActive ? '#fff' : '#333',
                  border: isActive ? 'none' : '1px solid #ddd',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  flex: '0 0 8rem',
                  textAlign: 'center',
                  boxShadow: isActive
                    ? '0 2px 6px rgba(0,0,0,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
              >
                <p style={{ fontWeight: '600', margin: 0 }}>{course.code}</p>
                <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>
                  {course.students} students
                </p>
              </button>
            );
          })}
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {[
            { title: 'Active Sessions', value: '1' },
            { title: 'Students Waiting', value: '4 Waiting' },
            { title: 'Students Current', value: '0 Current' },
            { title: 'Available TAs', value: '1' }
          ].map((card, idx) => (
            <div key={idx} style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '1rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '0.9rem', color: '#555', margin: '0 0 0.5rem 0' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Active Course Section */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem'
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
              {activeCourse} - {courseNames[activeCourse]}
            </h2>
            <span style={{
              fontSize: '0.7rem',
              background: '#dcfce7',
              color: '#166534',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem'
            }}>Active Now</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
            Monday 2:00–4:00 PM • Davis Hall 338 • 4 students • TAs: Alex Rodriguez, Maya Patel
          </p>
          <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Students</h3>

          {["Brian", "Sarah", "Mike", "Em"].map((student, idx) => (
            <div key={idx} style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}>
                <p style={{ fontWeight: '600', margin: 0 }}>{student}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={btnSmall}>Present</button>
                  <button style={btnSmall}>Absent</button>
                  <button style={btnSmall}>Complete</button>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#444', margin: 0 }}>
                Example help request for {student}.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const btnSmall = {
  fontSize: '0.8rem',
  border: '1px solid #ddd',
  borderRadius: '0.25rem',
  padding: '0.25rem 0.5rem',
  cursor: 'pointer',
  background: 'white'
};
