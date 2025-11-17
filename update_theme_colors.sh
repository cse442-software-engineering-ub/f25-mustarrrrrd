#!/bin/bash
# Automated theme variable replacement script
# This script updates hardcoded colors to use CSS theme variables

cd /opt/lampl/htdocs/f25-mustarrrrrd/frontend/src

# Function to replace colors in a file
update_colors() {
    local file=$1
    echo "Updating $file..."

    # Background colors
    sed -i 's/background: "#fff"/background: "var(--card-bg)"/g' "$file"
    sed -i 's/background: "#ffffff"/background: "var(--card-bg)"/g' "$file"
    sed -i 's/background: "white"/background: "var(--card-bg)"/g' "$file"
    sed -i 's/background: "#f9fafb"/background: "var(--bg-secondary)"/g' "$file"
    sed -i 's/background: "#f3f4f6"/background: "var(--bg-tertiary)"/g' "$file"
    sed -i 's/backgroundColor: "#f9fafb"/backgroundColor: "var(--bg-secondary)"/g' "$file"
    sed -i 's/backgroundColor: "white"/backgroundColor: "var(--card-bg)"/g' "$file"

    # Text colors
    sed -i 's/color: "#111"/color: "var(--text-primary)"/g' "$file"
    sed -i 's/color: "#111827"/color: "var(--text-primary)"/g' "$file"
    sed -i 's/color: "#6b7280"/color: "var(--text-secondary)"/g' "$file"
    sed -i 's/color: "#9ca3af"/color: "var(--text-secondary)"/g' "$file"
    sed -i 's/color: "#374151"/color: "var(--text-secondary)"/g' "$file"

    # Border colors
    sed -i 's/border: "1px solid #e5e7eb"/border: "1px solid var(--border-color)"/g' "$file"
    sed -i 's/borderBottom: "1px solid #e5e7eb"/borderBottom: "1px solid var(--border-color)"/g' "$file"

    echo "Completed $file"
}

# List of files to update
FILES=(
    "professorview.jsx"
    "TADashboard.jsx"
    "ProfilePage.jsx"
    "QueueDetails.jsx"
    "StudentSessions.jsx"
    "SessionQueue.jsx"
    "InstructorProfile.jsx"
    "ProfessorCourses.jsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        update_colors "$file"
    else
        echo "Warning: $file not found"
    fi
done

echo "Theme color update complete!"
