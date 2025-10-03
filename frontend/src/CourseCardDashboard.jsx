import { Star, Clock, MapPin, Users } from "lucide-react";

export function CourseCardDashboard({ course }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1rem',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
      {/* Course Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
        <div>
          <h3 style={{
            fontWeight: '500',
            color: '#111',
            margin: '0 0 0.25rem 0',
            fontSize: '1rem'
          }}>
            {course.code} - {course.name}
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            margin: 0
          }}>
            <Users size={12} />
            {course.professor}
          </p>
        </div>
        <button style={{
          padding: '0.25rem',
          background: 'transparent',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Star size={20} color="#eab308" fill="#eab308" />
        </button>
      </div>

      {/* Course Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: 0
        }}>
          <Clock size={16} />
          {course.time}
        </p>
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: 0
        }}>
          <MapPin size={16} />
          {course.location}
        </p>
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: 0
        }}>
          <Users size={16} />
          {course.studentsInQueue} students in queue
        </p>
      </div>

      {/* Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}>
        <button style={{
          padding: '0.5rem 1rem',
          background: '#111',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontWeight: '500'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#1f2937'}
        onMouseOut={(e) => e.currentTarget.style.background = '#111'}
        >
          Join Queue
        </button>
      </div>
    </div>
  );
}