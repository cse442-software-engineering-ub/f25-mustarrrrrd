import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export default function CustomAlert({ isOpen, onClose, title, message, type = 'success' }) {
    if (!isOpen) return null;

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'var(--bg-secondary)' : 'var(--bg-secondary)';
    const iconColor = isSuccess ? '#16a34a' : '#dc2626';
    const Icon = isSuccess ? CheckCircle : AlertCircle;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '1rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: bgColor,
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '1px solid var(--border-color)',
                    transform: 'scale(1)',
                    transition: 'transform 0.2s',
                    animation: 'fadeIn 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div
                        style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '50%',
                            backgroundColor: isSuccess ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem',
                        }}
                    >
                        <Icon size={24} color={iconColor} />
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        {title}
                    </h3>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: 'var(--button-bg)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
    );
}
