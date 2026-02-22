// Initialize Supabase
        // Replace these with your actual Supabase project credentials
        const SUPABASE_URL = 'https://xkcgpgmoknvxrkvhzvau.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY2dwZ21va252eHJrdmh6dmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDQ3MjQsImV4cCI6MjA3MjIyMDcyNH0.BB7tWBWJZPpjhN6g0nxw-toYYpVOQwPFAH-oY8RVyBY';

        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Tab switching functionality
        document.addEventListener('DOMContentLoaded', function () {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tab = button.dataset.tab;

                    // Update active tab button
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Show active tab content
                    tabContents.forEach(content => content.classList.remove('active'));
                    document.getElementById(`${tab}-tab`).classList.add('active');

                    // Clear any messages
                    document.getElementById('login-message').textContent = '';
                    document.getElementById('signup-message').textContent = '';
                });
            });

            // Check if we're returning from email confirmation
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('confirmation') === 'success') {
                document.getElementById('login-message').textContent = 'Email confirmed successfully! Please log in.';
                document.getElementById('login-message').className = 'mt-4 text-sm text-center text-green-600';

                // Switch to login tab
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelector('[data-tab="login"]').classList.add('active');
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById('login-tab').classList.add('active');
            }

            // Login form submission
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const loginButton = document.getElementById('login-button');
                const messageElement = document.getElementById('login-message');

                // Show loading state
                loginButton.innerHTML = 'Logging in... <div class="loader"></div>';
                loginButton.disabled = true;
                messageElement.textContent = '';

                try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (error) throw error;

                    // Successfully logged in
                    // Successfully logged in
                    messageElement.textContent = 'Login successful! Redirecting...';
                    messageElement.className = 'mt-4 text-sm text-center text-green-600';

                    // Fetch the current logged-in user
                    const { data: { user } } = await supabase.auth.getUser();

                    if (user) {
                        // Insert or update profile in custom table
                        const { error: userError } = await supabase
                            .from('profiles')
                            .upsert({
                                id: user.id,
                                email: user.email,
                                first_name: user.user_metadata.first_name,
                                last_name: user.user_metadata.last_name,
                                contact: user.user_metadata.contact
                            });

                        if (userError) {
                            console.error("Profile insert error:", userError);
                        }
                    }

                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);

                } catch (error) {
                    messageElement.textContent = error.message;
                    messageElement.className = 'mt-4 text-sm text-center text-red-600';
                } finally {
                    // Reset button
                    loginButton.innerHTML = 'Login';
                    loginButton.disabled = false;
                }
            });

            // Signup form submission
            document.getElementById('signup-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const firstName = document.getElementById('signup-firstname').value;
                const lastName = document.getElementById('signup-lastname').value;
                const contact = document.getElementById('signup-contact').value;
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const signupButton = document.getElementById('signup-button');
                const messageElement = document.getElementById('signup-message');

                // Show loading state
                signupButton.innerHTML = 'Creating account... <div class="loader"></div>';
                signupButton.disabled = true;
                messageElement.textContent = '';

                try {
                    // Create user with Supabase Auth
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                first_name: firstName,
                                last_name: lastName,
                                contact: contact
                            },
                            emailRedirectTo: `${window.location.origin}${window.location.pathname}?confirmation=success`
                        }
                    });

                    if (authError) throw authError;

                    if (authData.user) {
                        // Insert additional user data into a custom table (if needed)
                        const { data: userData, error: userError } = await supabase
                            .from('profiles')
                            .insert([
                                {
                                    id: authData.user.id,
                                    email: email,
                                    first_name: firstName,
                                    last_name: lastName,
                                    contact: contact
                                }
                            ]);

                        if (userError) {
                            console.error('Error saving user data:', userError);
                            // Don't throw here as auth was successful
                        }

                        messageElement.textContent = 'Registration successful! Please check your email for confirmation.';
                        messageElement.className = 'mt-4 text-sm text-center text-green-600';

                        // Clear form
                        document.getElementById('signup-form').reset();
                    }

                } catch (error) {
                    messageElement.textContent = error.message;
                    messageElement.className = 'mt-4 text-sm text-center text-red-600';
                } finally {
                    // Reset button
                    signupButton.innerHTML = 'Sign Up';
                    signupButton.disabled = false;
                }
            });
        });