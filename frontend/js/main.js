document.addEventListener('DOMContentLoaded', () => {
    // ── Mobile Navigation ──
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Close nav when clicking a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // ── Typewriter Effect ──
    const typewriterElement = document.getElementById('typewriter');
    if (typewriterElement) {
        const text = "Full-Stack Developer";
        let i = 0;
        typewriterElement.textContent = "";
        
        function type() {
            if (i < text.length) {
                typewriterElement.textContent += text.charAt(i);
                i++;
                setTimeout(type, 100);
            }
        }
        type();
    }

    // ── Scroll Animation (Intersection Observer) ──
    const fadeElements = document.querySelectorAll('.fade-up');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => fadeObserver.observe(el));

    // ── Active Nav Link on Scroll ──
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links a');

    const activeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href') === `#${id}`) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(section => activeObserver.observe(section));

    // ── Load Certificates Dynamically ──
    loadCertificates();

    // ── Contact Form Submission ──
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            const msgDiv = document.getElementById('form-msg');
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };

            btn.disabled = true;
            btn.textContent = 'Sending...';
            msgDiv.textContent = '';
            msgDiv.className = 'form-msg';

            try {
                // Using relative path for production readiness
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    msgDiv.textContent = 'Message sent successfully!';
                    msgDiv.className = 'form-msg msg-success';
                    contactForm.reset();
                } else {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to send');
                }
            } catch (error) {
                console.error(error);
                msgDiv.textContent = error.message.includes("Rate limit") 
                    ? 'Too many messages. Please try again in a minute.' 
                    : 'Failed to send message. Please try again.';
                msgDiv.className = 'form-msg msg-error';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Send Message';
            }
        });
    }

    // ── Admin Panel Logic ──
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const savedToken = sessionStorage.getItem('adminToken');
        if (savedToken) {
            showDashboard(savedToken);
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tokenInput = document.getElementById('admin-token').value;
            const msgDiv = document.getElementById('login-msg');
            msgDiv.textContent = '';

            try {
                const response = await fetch('/api/admin/messages', {
                    headers: {
                        'Authorization': `Bearer ${tokenInput}`
                    }
                });

                if (response.ok) {
                    sessionStorage.setItem('adminToken', tokenInput);
                    showDashboard(tokenInput);
                } else {
                    msgDiv.textContent = 'Invalid token. Access denied.';
                    msgDiv.className = 'form-msg msg-error';
                }
            } catch (error) {
                msgDiv.textContent = 'Error connecting to server.';
                msgDiv.className = 'form-msg msg-error';
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminToken');
            document.getElementById('dashboard-container').classList.add('hidden');
            document.getElementById('login-container').classList.remove('hidden');
            document.getElementById('login-form').reset();
        });
    }
});

// ── Image Modal Functions ──
function openModal(imgSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    if (modal && modalImg) {
        modal.classList.add('active');
        modalImg.src = imgSrc;
    }
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ── Dynamic Certificates ──
async function loadCertificates() {
    const grid = document.getElementById('cert-grid');
    if (!grid) return;

    try {
        const response = await fetch('/api/certificates');
        const certs = await response.json();

        if (certs.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Coming soon...</p>';
            return;
        }

        grid.innerHTML = certs.map(file => `
            <div class="certificate-card glass-panel" onclick="openModal('images/certificates/${file}')">
                <img src="images/certificates/${file}" alt="Certificate" loading="lazy">
                <div class="cert-overlay">
                    <span class="btn btn-primary btn-small">View Full</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Failed to load certificates:", error);
    }
}

async function showDashboard(token) {
    const loginCont = document.getElementById('login-container');
    const dashCont = document.getElementById('dashboard-container');
    if (!dashCont || !loginCont) return;

    loginCont.classList.add('hidden');
    dashCont.classList.remove('hidden');

    const tbody = document.getElementById('messages-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const response = await fetch('/api/admin/messages', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No messages found.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.reverse().forEach(msg => {
                const date = new Date(msg.timestamp).toLocaleString();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${msg.id}</td>
                    <td>${msg.name}</td>
                    <td><a href="mailto:${msg.email}" style="color:var(--accent-color)">${msg.email}</a></td>
                    <td>${msg.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                    <td>${date}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-error);">Error loading messages.</td></tr>';
    }
}
