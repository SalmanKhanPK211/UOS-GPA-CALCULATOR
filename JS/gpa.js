

// Mobile menu functionality
document.getElementById('mobile-menu-button').addEventListener('click', function () {
    document.getElementById('mobile-menu').classList.remove('hidden');
});

document.getElementById('close-menu').addEventListener('click', function () {
    document.getElementById('mobile-menu').classList.add('hidden');
});

// Back button functionality
document.getElementById('back-button').addEventListener('click', function () {
    window.location.href = 'index.html';
});

// Get selected data from localStorage
const selectedDepartment = localStorage.getItem('selectedDepartment');
const selectedSemester = localStorage.getItem('selectedSemester');
const selectedSubjects = JSON.parse(localStorage.getItem('selectedSubjects') || '[]');

// Update selection info
document.getElementById('selection-info').textContent =
    `${selectedDepartment ? selectedDepartment.replace(/-/g, ' ').toUpperCase() : 'Department'} - Semester ${selectedSemester}`;

// Populate subjects form
const subjectsContainer = document.getElementById('subjects-container');

if (selectedSubjects.length > 0) {
    selectedSubjects.forEach((subject, index) => {
        const subjectDiv = document.createElement('div');
        subjectDiv.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200';
        subjectDiv.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex-grow">
                    <h3 class="font-medium text-gray-800">${subject.name}</h3>
                    <p class="text-sm text-gray-600">${subject.creditHours} credit hours</p>
                </div>
                <div class="flex items-center">
                    <label class="mr-2 text-sm font-medium text-gray-700">Marks:</label>
                    <input type="number" min="0" max="100" 
                        class="marks-input w-20 py-1 px-3 border border-gray-300 rounded-lg text-center" 
                        placeholder="0-100" 
                        data-subject="${subject.name}"
                        data-credits="${subject.creditHours}"
                        oninput="updateProgress()">
                </div>
            </div>
        `;
        subjectsContainer.appendChild(subjectDiv);
    });

    // Update progress bar initially
    updateProgress();
} else {
    subjectsContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-exclamation-circle text-3xl mb-3"></i>
            <p>No subjects selected. Please go back and select subjects.</p>
        </div>
    `;
    document.getElementById('calculate-button').disabled = true;
}

// Update progress bar function
function updateProgress() {
    const marksInputs = document.querySelectorAll('.marks-input');
    let filledInputs = 0;

    marksInputs.forEach(input => {
        if (input.value && input.value !== '') {
            filledInputs++;
        }
    });

    const progressPercentage = (filledInputs / marksInputs.length) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
    document.getElementById('progress-text').textContent = `${Math.round(progressPercentage)}% Complete`;

    // Enable calculate button only if all marks are filled
    document.getElementById('calculate-button').disabled = progressPercentage < 100;
}

// Calculate GPA function
document.getElementById('calculate-button').addEventListener('click', function () {
    calculateGPA();
});

// Reset button functionality
document.getElementById('reset-button').addEventListener('click', function () {
    const marksInputs = document.querySelectorAll('.marks-input');
    marksInputs.forEach(input => {
        input.value = '';
    });
    updateProgress();
    document.getElementById('results-section').classList.add('hidden');
});

// Calculate GPA function - CORRECTED VERSION
    function calculateGPA() {
        const marksInputs = document.querySelectorAll('.marks-input');
        let totalCreditHours = 0;
        let totalGradePoints = 0;
        let results = [];

        marksInputs.forEach(input => {
            const marks = parseInt(input.value);
            const creditHours = parseInt(input.dataset.credits);
            const subjectName = input.dataset.subject;

            // Calculate grade point based on marks - CORRECTED FORMULA
            let gradePoint = 0;
            if (marks < 50) {
                gradePoint = 0.00; // Fail
            } else if (marks >= 50 && marks < 90) {
                gradePoint = 2.00 + (marks - 50) * 0.05; // Increases by 0.05 per mark above 50
            } else {
                gradePoint = 4.00; // 90 marks and above
            }

            // Round to 2 decimal places
            gradePoint = Math.round(gradePoint * 100) / 100;

            const subjectGradePoints = gradePoint * creditHours;

            totalCreditHours += creditHours;
            totalGradePoints += subjectGradePoints;

            results.push({
                subjectName,
                creditHours,
                marks,
                gradePoint,
                subjectGradePoints
            });
        });

        // Calculate GPA
        const gpa = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0;
        const roundedGPA = Math.round(gpa * 100) / 100;

        // Display results
        document.getElementById('gpa-result').textContent = roundedGPA.toFixed(2);
        document.getElementById('total-subjects').textContent = marksInputs.length;
        document.getElementById('total-credits').textContent = totalCreditHours;
        document.getElementById('total-grade-points').textContent = totalGradePoints.toFixed(2);

        // Populate results table
        const resultsTableBody = document.getElementById('results-table-body');
        resultsTableBody.innerHTML = '';

        results.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${result.subjectName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${result.creditHours}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${result.marks}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${result.gradePoint === 0 ? 'text-red-600' : 'text-green-600'}">${result.gradePoint.toFixed(2)}</td>
`;
            resultsTableBody.appendChild(row);
        });

        // Show results section
        document.getElementById('results-section').classList.remove('hidden');

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    }

// Download PDF button functionality
document.getElementById('download-pdf').addEventListener('click', function() {
    generatePDF();
});

// Generate PDF function
function generatePDF() {
    // Show loading state
    const pdfButton = document.getElementById('download-pdf');
    const originalText = pdfButton.innerHTML;
    pdfButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating PDF...';
    pdfButton.disabled = true;
    
    // Get data for PDF
    const department = localStorage.getItem('selectedDepartment');
    const semester = localStorage.getItem('selectedSemester');
    const gpa = document.getElementById('gpa-result').textContent;
    const totalSubjects = document.getElementById('total-subjects').textContent;
    const totalCredits = document.getElementById('total-credits').textContent;
    
    // Get subject results
    const subjectResults = [];
    const marksInputs = document.querySelectorAll('.marks-input');
    
    marksInputs.forEach(input => {
        const marks = parseInt(input.value);
        const creditHours = parseInt(input.dataset.credits);
        const subjectName = input.dataset.subject;
        
        // Calculate grade point (same logic as calculateGPA)
        let gradePoint = 0;
        if (marks < 50) {
            gradePoint = 0.00;
        } else if (marks >= 50 && marks < 90) {
            gradePoint = 2.00 + (marks - 50) * 0.05;
        } else {
            gradePoint = 4.00;
        }
        gradePoint = Math.round(gradePoint * 100) / 100;
        
        subjectResults.push({
            subjectName,
            creditHours,
            marks,
            gradePoint: gradePoint.toFixed(2)
        });
    });
    
    // Create PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add university logo and header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('University of Swabi', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('GPA Calculator Results', 105, 25, { align: 'center' });
    
    // Add student info section
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 40, 190, 20, 'F');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    // Read optional logged-in user name from localStorage
    let studentName = '';
    try {
        const firstName = localStorage.getItem('userFirstName') || '';
        const lastName = localStorage.getItem('userLastName') || '';
        studentName = `${firstName} ${lastName}`.trim();
    } catch (e) {
        // ignore if blocked
    }

    doc.text(`Department: ${department ? department.replace(/-/g, ' ').toUpperCase() : 'N/A'}`, 15, 47);
    doc.text(`Semester: ${semester}`, 15, 54);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 47);
    if (studentName) {
        doc.text(`Name: ${studentName}`, 150, 54);
    }
    else {
        doc.text('Name: Please Login', 150, 54);
    }

    // Add GPA summary
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('GPA SUMMARY', 105, 70, { align: 'center' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 75, 200, 75);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Semester GPA: ${gpa}`, 20, 85);
    doc.text(`Total Subjects: ${totalSubjects}`, 20, 95);
    doc.text(`Total Credit Hours: ${totalCredits}`, 20, 105);
    
    // Add subject details table
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('SUBJECT DETAILS', 105, 120, { align: 'center' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 125, 200, 125);
    
    // Table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 130, 190, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Subject', 15, 137);
    doc.text('Credit Hours', 80, 137);
    doc.text('Marks', 120, 137);
    doc.text('Grade Point', 160, 137);
    
    // Table rows
    let yPosition = 145;
    subjectResults.forEach((subject, index) => {
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
            
            // Add table headers on new page
            doc.setFillColor(240, 240, 240);
            doc.rect(10, 15, 190, 10, 'F');
            doc.setFontSize(10);
            doc.text('Subject', 15, 22);
            doc.text('Credit Hours', 80, 22);
            doc.text('Marks', 120, 22);
            doc.text('Grade Point', 160, 22);
            yPosition = 25;
        }
        
        doc.text(subject.subjectName, 15, yPosition);
        doc.text(subject.creditHours.toString(), 80, yPosition);
        doc.text(subject.marks.toString(), 120, yPosition);
        
        // Color code grade points
        if (subject.gradePoint === '0.00') {
            doc.setTextColor(255, 0, 0); // Red for failed subjects
        } else {
            doc.setTextColor(0, 0, 0); // Black for passed subjects
        }
        doc.text(subject.gradePoint, 160, yPosition);
        doc.setTextColor(0, 0, 0); // Reset color
        
        yPosition += 7;
    });
    
    // Add footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by UOS GPA Calculator - University of Swabi', 105, 285, { align: 'center' });
    
    // Save PDF
    const departmentName = department ? department.replace(/-/g, '_') : 'results';
    doc.save(`UOS_GPA_Results_Semester_${semester}_${departmentName}.pdf`);
    
    // Restore button state
    pdfButton.innerHTML = originalText;
    pdfButton.disabled = false;
}

// Calculate CGPA button
document.getElementById('calculate-cgpa').addEventListener('click', function () {
    // Save current GPA result for CGPA calculation
    const currentGPA = parseFloat(document.getElementById('gpa-result').textContent);
    const currentCredits = parseInt(document.getElementById('total-credits').textContent);
    const currentSemester = parseInt(localStorage.getItem('selectedSemester'));

    localStorage.setItem('currentGPA', currentGPA);
    localStorage.setItem('currentCredits', currentCredits);
    localStorage.setItem('currentSemester', currentSemester);

    // Redirect to CGPA calculator
    window.location.href = 'cgpa-calculator.html';
});