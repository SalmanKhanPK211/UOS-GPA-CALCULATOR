// DEBUG: Check what's loaded
console.log('index.js starting...');
console.log('supabase exists?', typeof supabase !== 'undefined');
console.log('supabaseClient exists?', typeof supabaseClient !== 'undefined');

// Initialize Supabase ONLY if not already initialized
if (typeof supabaseClient === 'undefined') {
    console.log('Initializing Supabase client...');
    const supabaseUrl = 'https://xkcgpgmoknvxrkvhzvau.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY2dwZ21va252eHJrdmh6dmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDQ3MjQsImV4cCI6MjA3MjIyMDcyNH0.BB7tWBWJZPpjhN6g0nxw-toYYpVOQwPFAH-oY8RVyBY';
    
    // Use var instead of const to avoid duplicate declaration error
    var supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
} else {
    console.log('Supabase client already initialized');
}

// Function to update auth UI based on login status
async function updateAuthUI() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const authContainer = document.getElementById('auth-nav-container');
        const mobileAuthContainer = document.getElementById('mobile-auth-container');

        if (session && session.user) {
            // Get first name and last name from user metadata
            const firstName = session.user.user_metadata?.first_name || '';
            const lastName = session.user.user_metadata?.last_name || '';

            // Combine first and last name, or fallback to email username if names not available
            let userName = `${firstName} ${lastName}`.trim();

            if (!userName) {
                // Fallback to email username if no name is available
                userName = session.user.email ? session.user.email.split('@')[0] : 'User';
            }

            // Persist name locally for use in PDF headers on other pages
            if (firstName || lastName) {
                try {
                    localStorage.setItem('userFirstName', firstName);
                    localStorage.setItem('userLastName', lastName);
                } catch (e) {
                    console.warn('Could not persist user name to localStorage', e);
                }
            } else {
                try {
                    localStorage.removeItem('userFirstName');
                    localStorage.removeItem('userLastName');
                } catch (e) {
                    console.warn('Could not clear user name from localStorage', e);
                }
            }

            authContainer.innerHTML = `
        <div class="flex items-center space-x-4">
            <span class="text-gray-700">Hello, ${userName}</span>
            <button onclick="logout()" class="text-gray-600 hover:text-blue-600 bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition duration-200">
                Logout
            </button>
        </div>
    `;

            mobileAuthContainer.innerHTML = `
        <div class="flex flex-col items-center space-y-4">
            <span class="text-gray-700">Hello, ${userName}</span>
            <button onclick="logout()" class="text-gray-600 bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 transition duration-200">
                Logout
            </button>
        </div>
    `;
        } else {
            // User is not logged in - show login link
            authContainer.innerHTML = '<a href="login.html" class="text-gray-600 hover:text-blue-600">Login</a>';
            mobileAuthContainer.innerHTML = '<a href="login.html" class="text-gray-600">Login</a>';

            // Clear any persisted name
            try {
                localStorage.removeItem('userFirstName');
                localStorage.removeItem('userLastName');
            } catch (e) {
                console.warn('Could not clear user name from localStorage', e);
            }
        }
    } catch (error) {
        console.error('Error updating auth UI:', error);
    }
}

// Logout function
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            alert('Error logging out. Please try again.');
        } else {
            // Update UI after logout
            updateAuthUI();
            try {
                localStorage.removeItem('userFirstName');
                localStorage.removeItem('userLastName');
            } catch (e) {
                console.warn('Could not clear user name from localStorage', e);
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Listen for auth state changes
if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        updateAuthUI();
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== DOMContentLoaded ===');
    console.log('universityData exists?', typeof universityData !== 'undefined');
    
    if (typeof universityData !== 'undefined') {
        console.log('Available departments:', Object.keys(universityData));
    } else {
        console.error('ERROR: universityData is NOT loaded!');
        console.error('Check subjects.js is loading before index.js');
    }
    
    // Initialize auth UI
    updateAuthUI();

    // Mobile menu functionality
    document.getElementById('mobile-menu-button').addEventListener('click', function () {
        document.getElementById('mobile-menu').classList.remove('hidden');
    });

    document.getElementById('close-menu').addEventListener('click', function () {
        document.getElementById('mobile-menu').classList.add('hidden');
    });

    // Department and Semester selection functionality
    const departmentSelect = document.getElementById('department');
    const semesterSelect = document.getElementById('semester');
    const subjectSection = document.getElementById('subject-section');
    const nextButton = document.getElementById('next-button');
    
    // Function to update subject list based on department selection
    function updateSubjectList() {
        const department = departmentSelect.value;
        const semester = semesterSelect.value;

        const subjectList = document.querySelector('.subject-list');

        if (department && semester) {
            // Show subject section with animation
            subjectSection.classList.remove('hidden');
            setTimeout(() => {
                subjectSection.classList.add('fade-in');
            }, 10);

            // Get subjects from our data
            const subjects = universityData[department];

            if (subjects && subjects.length > 0) {
                // Clear previous content
                subjectList.innerHTML = '';

                // Add each subject as a checkbox
                subjects.forEach(subject => {
                    const subjectDiv = document.createElement('div');
                    subjectDiv.className = 'flex items-center mb-3';
                    subjectDiv.innerHTML = `
                        <input type="checkbox" id="subject-${subject.subjectName.replace(/\s+/g, '-').toLowerCase()}" 
                            name="subjects" value="${subject.subjectName}" 
                            data-credits="${subject.creditHours}" 
                            class="mr-3 h-5 w-5 rounded border-gray-300">
                        <label for="subject-${subject.subjectName.replace(/\s+/g, '-').toLowerCase()}" 
                            class="text-gray-700 flex-grow">
                            ${subject.subjectName} <span class="text-sm text-gray-500">(${subject.subjectName} credits)</span>
                        </label>
                    `;
                    subjectList.appendChild(subjectDiv);
                });
            } else {
                subjectList.innerHTML = '<p class="text-gray-500 text-center">No subjects found for this department</p>';
            }

            // Enable next button
            nextButton.disabled = false;
        } else {
            // Hide subject section if no department selected
            subjectSection.classList.add('hidden');

            // Disable next button
            nextButton.disabled = true;
        }
    }

    // Event listeners for department and semester changes
    departmentSelect.addEventListener('change', updateSubjectList);
    semesterSelect.addEventListener('change', updateSubjectList);

    // Initially disable next button
    nextButton.disabled = true;

    // Next button functionality
    nextButton.addEventListener('click', function () {
        const department = departmentSelect.value;
        const semester = semesterSelect.value;

        // Get selected subjects
        const selectedSubjects = [];
        const subjectCheckboxes = document.querySelectorAll('input[name="subjects"]:checked');

        subjectCheckboxes.forEach(checkbox => {
            selectedSubjects.push({
                name: checkbox.value,
                creditHours: parseInt(checkbox.dataset.credits)
            });
        });

        if (selectedSubjects.length === 0) {
            alert('Please select at least one subject to continue.');
            return;
        }

        // Store selections and move to next page
        localStorage.setItem('selectedDepartment', department);
        localStorage.setItem('selectedSemester', semester);
        localStorage.setItem('selectedSubjects', JSON.stringify(selectedSubjects));

        // Redirect to GPA calculator page (page 2)
        window.location.href = 'gpa-calculator.html';
    });
});