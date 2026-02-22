// Mobile menu functionality
document.getElementById('mobile-menu-button').addEventListener('click', function () {
    document.getElementById('mobile-menu').classList.remove('hidden');
});

document.getElementById('close-menu').addEventListener('click', function () {
    document.getElementById('mobile-menu').classList.add('hidden');
});

// Back button functionality
document.getElementById('back-button').addEventListener('click', function () {
    window.location.href = 'gpa-calculator.html';
});

// Start over button functionality
document.getElementById('start-over').addEventListener('click', function () {
    window.location.href = 'index.html';
});

// Check if we have data from GPA calculator
const currentGPA = localStorage.getItem('currentGPA');
const currentCredits = localStorage.getItem('currentCredits');
const currentSemester = localStorage.getItem('currentSemester');

// If we have data from GPA calculator, pre-fill the form
if (currentGPA && currentCredits && currentSemester) {
    const gpaInput = document.querySelector(`.gpa-input[data-semester="${currentSemester}"]`);
    const creditInput = document.querySelector(`.credit-input[data-semester="${currentSemester}"]`);

    if (gpaInput && creditInput) {
        gpaInput.value = currentGPA;
        creditInput.value = currentCredits;

        // Clear the stored data
        localStorage.removeItem('currentGPA');
        localStorage.removeItem('currentCredits');
        localStorage.removeItem('currentSemester');

        // Update progress
        updateProgress();
    }
}

// Add semester functionality
let semesterCount = 1;
document.getElementById('add-semester').addEventListener('click', function () {
    semesterCount++;

    const semesterDiv = document.createElement('div');
    semesterDiv.className = 'semester-card bg-gray-50 p-4 rounded-lg border border-gray-200 fade-in';
    semesterDiv.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex-grow">
                <h3 class="font-medium text-gray-800">Semester ${semesterCount}</h3>
            </div>
            <div class="flex items-center space-x-3">
                <div>
                    <label class="mr-2 text-sm font-medium text-gray-700">GPA:</label>
                    <input type="number" min="0" max="4" step="0.01" 
                        class="gpa-input w-20 py-1 px-3 border border-gray-300 rounded-lg text-center" 
                        placeholder="0.00-4.00" 
                        data-semester="${semesterCount}"
                        oninput="updateProgress()">
                </div>
                <div>
                    <label class="mr-2 text-sm font-medium text-gray-700">Credits:</label>
                    <input type="number" min="0" max="30" 
                        class="credit-input w-20 py-1 px-3 border border-gray-300 rounded-lg text-center" 
                        placeholder="0-30" 
                        data-semester="${semesterCount}"
                        oninput="updateProgress()">
                </div>
                <button class="remove-semester text-red-600 hover:text-red-800">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    document.getElementById('semesters-container').appendChild(semesterDiv);

    // Add event listener to remove button
    const removeButton = semesterDiv.querySelector('.remove-semester');
    removeButton.addEventListener('click', function () {
        semesterDiv.remove();
        updateProgress();
    });

    // Update progress
    updateProgress();
});

// Add event listeners to existing remove buttons
document.querySelectorAll('.remove-semester').forEach(button => {
    button.addEventListener('click', function () {
        const semesterCard = this.closest('.semester-card');
        semesterCard.remove();
        updateProgress();
    });
});

// Update progress bar function
function updateProgress() {
    const gpaInputs = document.querySelectorAll('.gpa-input');
    const creditInputs = document.querySelectorAll('.credit-input');

    let filledInputs = 0;
    const totalInputs = gpaInputs.length * 2; // Each semester has 2 inputs

    gpaInputs.forEach(input => {
        if (input.value && input.value !== '') {
            filledInputs++;
        }
    });

    creditInputs.forEach(input => {
        if (input.value && input.value !== '') {
            filledInputs++;
        }
    });

    const progressPercentage = (filledInputs / totalInputs) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
    document.getElementById('progress-text').textContent = `${Math.round(progressPercentage)}% Complete`;

    // Enable calculate button only if all inputs are filled
    document.getElementById('calculate-button').disabled = progressPercentage < 100;
}

// Calculate CGPA function
document.getElementById('calculate-button').addEventListener('click', function () {
    calculateCGPA();
});

// Reset button functionality
document.getElementById('reset-button').addEventListener('click', function () {
    const gpaInputs = document.querySelectorAll('.gpa-input');
    const creditInputs = document.querySelectorAll('.credit-input');

    gpaInputs.forEach(input => {
        input.value = '';
    });

    creditInputs.forEach(input => {
        input.value = '';
    });

    updateProgress();
    document.getElementById('results-section').classList.add('hidden');
});

// Calculate CGPA function
function calculateCGPA() {
    const gpaInputs = document.querySelectorAll('.gpa-input');
    const creditInputs = document.querySelectorAll('.credit-input');

    let totalCreditHours = 0;
    let totalGradePoints = 0;
    let results = [];

    gpaInputs.forEach(input => {
        const semester = input.dataset.semester;
        const gpa = parseFloat(input.value);

        // Find corresponding credit input
        const creditInput = document.querySelector(`.credit-input[data-semester="${semester}"]`);
        const creditHours = parseInt(creditInput.value);

        const semesterGradePoints = gpa * creditHours;

        totalCreditHours += creditHours;
        totalGradePoints += semesterGradePoints;

        results.push({
            semester: `Semester ${semester}`,
            gpa,
            creditHours,
            semesterGradePoints
        });
    });

    // Calculate CGPA
    const cgpa = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0;
    const roundedCGPA = Math.round(cgpa * 100) / 100;

    // Display results
    document.getElementById('cgpa-result').textContent = roundedCGPA.toFixed(2);
    document.getElementById('total-semesters').textContent = results.length;
    document.getElementById('total-credits').textContent = totalCreditHours;
    document.getElementById('total-grade-points').textContent = totalGradePoints.toFixed(2);

    // Populate results table
    const resultsTableBody = document.getElementById('results-table-body');
    resultsTableBody.innerHTML = '';

    results.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${result.semester}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${result.gpa.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${result.creditHours}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">${result.semesterGradePoints.toFixed(2)}</td>
        `;
        resultsTableBody.appendChild(row);
    });

    // Show results section
    document.getElementById('results-section').classList.remove('hidden');

    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

// Download PDF button functionality
document.getElementById('download-pdf').addEventListener('click', function () {
    generateCGPAReport();
});

// Generate PDF function for CGPA report
// Download PDF button functionality
    document.getElementById('download-pdf').addEventListener('click', function () {
        generateCGPAReport();
    });

    // Generate PDF function for CGPA report
    function generateCGPAReport() {
        // Show loading state
        const pdfButton = document.getElementById('download-pdf');
        const originalText = pdfButton.innerHTML;
        pdfButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating PDF...';
        pdfButton.disabled = true;

        // Get data for PDF
        const cgpa = document.getElementById('cgpa-result').textContent;
        const totalSemesters = document.getElementById('total-semesters').textContent;
        const totalCredits = document.getElementById('total-credits').textContent;
        const totalGradePoints = document.getElementById('total-grade-points').textContent;

        // Get semester results
        const semesterResults = [];
        const gpaInputs = document.querySelectorAll('.gpa-input');
        const creditInputs = document.querySelectorAll('.credit-input');

        gpaInputs.forEach((input, index) => {
            const semester = input.dataset.semester;
            const gpa = parseFloat(input.value);
            const creditHours = parseInt(creditInputs[index].value);
            const semesterGradePoints = gpa * creditHours;

            semesterResults.push({
                semester: `Semester ${semester}`,
                gpa: gpa.toFixed(2),
                creditHours,
                semesterGradePoints: semesterGradePoints.toFixed(2)
            });
        });

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Set default font
        doc.setFont("helvetica");

        // Add university header with improved design
        doc.setFillColor(59, 130, 246); // Nice blue color
        doc.rect(0, 0, 210, 40, 'F');

        // University name
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('University of Swabi', 105, 20, { align: 'center' });

        // Report title
        doc.setFontSize(16);
        doc.text('CGPA Calculation Report', 105, 30, { align: 'center' });

        // Student info section with improved design
        doc.setFillColor(249, 250, 251); // Light gray
        doc.rect(10, 50, 190, 25, 'F');
        doc.setDrawColor(209, 213, 219); // Border color
        doc.rect(10, 50, 190, 25, 'S'); // Add border

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 60);
        doc.text(`Total Semesters: ${totalSemesters}`, 105, 60);
        doc.text(`Calculated CGPA: ${cgpa}`, 150, 60);

        // Optional logged-in student name from localStorage
        let studentName = '';
        try {
            const firstName = localStorage.getItem('userFirstName') || '';
            const lastName = localStorage.getItem('userLastName') || '';
            studentName = `${firstName} ${lastName}`.trim();
        } catch (e) {
            // ignore if blocked
        }
        if (studentName) {
            doc.text(`Student: ${studentName}`, 15, 68);
        }

        // CGPA summary with improved design
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, 'bold');
        doc.text('ACADEMIC SUMMARY', 105, 85, { align: 'center' });

        // Summary boxes
        const summaryBoxes = [
            { label: 'Cumulative GPA', value: cgpa, width: 40, x: 25 },
            { label: 'Total Semesters', value: totalSemesters, width: 40, x: 85 },
            { label: 'Credit Hours', value: totalCredits, width: 40, x: 145 }
        ];

        let summaryY = 95;
        summaryBoxes.forEach(box => {
            doc.setFillColor(59, 130, 246);
            doc.roundedRect(box.x, summaryY, box.width, 20, 3, 3, 'F');

            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.text(box.label, box.x + box.width / 2, summaryY + 7, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(box.value, box.x + box.width / 2, summaryY + 15, { align: 'center' });
        });

        // Semester details table with improved design
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.text('SEMESTER DETAILS', 105, 125, { align: 'center' });

        // Table headers
        doc.setFillColor(59, 130, 246);
        doc.rect(10, 130, 190, 10, 'F');

        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('Semester', 25, 137);
        doc.text('GPA', 80, 137);
        doc.text('Credit Hours', 120, 137);
        doc.text('Grade Points', 160, 137);

        // Table rows
        let yPosition = 145;
        semesterResults.forEach((result, index) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;

                // Add table headers on new page
                doc.setFillColor(59, 130, 246);
                doc.rect(10, 15, 190, 10, 'F');

                doc.setFontSize(11);
                doc.setTextColor(255, 255, 255);
                doc.setFont(undefined, 'bold');
                doc.text('Semester', 25, 22);
                doc.text('GPA', 80, 22);
                doc.text('Credit Hours', 120, 22);
                doc.text('Grade Points', 160, 22);

                yPosition = 25;
            }

            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251); // Light gray
                doc.rect(10, yPosition - 5, 190, 7, 'F');
            }

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.text(result.semester, 25, yPosition);
            doc.text(result.gpa, 80, yPosition);
            doc.text(result.creditHours.toString(), 120, yPosition);
            doc.text(result.semesterGradePoints, 160, yPosition);

            yPosition += 7;
        });

        // Add formula explanation with improved design
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99);
        doc.setFont(undefined, 'italic');
        doc.text('CGPA Formula: Σ(GPA × Credit Hours) / Σ(Credit Hours)', 15, yPosition + 15);

        // Add footer with improved design
        doc.setDrawColor(209, 213, 219);
        doc.line(10, 275, 200, 275);

        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.setFont(undefined, 'normal');
        doc.text('Generated by UOS CGPA Calculator - University of Swabi', 105, 282, { align: 'center' });
        // doc.text('Official Document - For Academic Purposes', 105, 288, { align: 'center' });

        // Save PDF
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        doc.save(`UOS_CGPA_Report_${timestamp}.pdf`);

        // Restore button state
        pdfButton.innerHTML = '<i class="fas fa-file-pdf mr-2"></i> Download PDF Report';
        pdfButton.disabled = false;
    }

// Initialize progress bar
updateProgress();