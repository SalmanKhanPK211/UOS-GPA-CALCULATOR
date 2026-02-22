// Initialize Supabase
const supabaseUrl = 'https://xkcgpgmoknvxrkvhzvau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY2dwZ21va252eHJrdmh6dmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDQ3MjQsImV4cCI6MjA3MjIyMDcyNH0.BB7tWBWJZPpjhN6g0nxw-toYYpVOQwPFAH-oY8RVyBY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Function to update auth UI based on login status
async function updateAuthUI() {
    const { data: { session } } = await supabase.auth.getSession();
    const authContainer = document.getElementById('auth-nav-container');
    const mobileAuthContainer = document.getElementById('mobile-auth-container');
    
    if (session && session.user) {
        // User is logged in - show logout and username
        authContainer.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="text-gray-700">Hello, ${session.user.email}</span>
                <button onclick="logout()" class="text-gray-600 hover:text-blue-600 bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition duration-200">
                    Logout
                </button>
            </div>
        `;
        
        mobileAuthContainer.innerHTML = `
            <div class="flex flex-col items-center space-y-4">
                <span class="text-gray-700">Hello, ${session.user.email}</span>
                <button onclick="logout()" class="text-gray-600 bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 transition duration-200">
                    Logout
                </button>
            </div>
        `;
    } else {
        // User is not logged in - show login link
        authContainer.innerHTML = '<a href="login.html" class="text-gray-600 hover:text-blue-600">Login</a>';
        mobileAuthContainer.innerHTML = '<a href="login.html" class="text-gray-600">Login</a>';
    }
}

// Logout function
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            alert('Error logging out. Please try again.');
        } else {
            // Update UI after logout
            updateAuthUI();
            // Redirect to home page or login page if desired
            // window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        updateAuthUI();
    }
});

// Initialize auth UI when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateAuthUI();
});