import { Star } from "lucide-react";
import { CourseCardDashboard } from "./CourseCardDashboard";

export function Dashboard() {

  const courses = [
    {
      id: "1",
      code: "CSE116",
      name: "Intro to Computer Science II",
      professor: "Professor Dickson",
      time: "Mon, Wed, Fri 2:00-4:00 PM",
      location: "Davis Hall 338",
      studentsInQueue: 0,
    },
    {
      id: "2",
      code: "CSE250",
      name: "Data Structures",
      professor: "Professor Mikida",
      time: "Tue, Thu 1:00-3:00 PM",
      location: "Davis Hall 101",
      studentsInQueue: 0,
    }
  ];

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            margin: 0,
            color: '#111'
          }}>Office Hours</h1>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '64rem',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* Favorites Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          <Star size={20} color="#eab308" fill="#eab308" />
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            margin: 0,
            color: '#111'
          }}>Favorites</h2>
        </div>

        {/* Course Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {courses.map((course) => (
            <CourseCardDashboard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </div>
  );
}