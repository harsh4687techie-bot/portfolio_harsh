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

    // ── Load Certificates Hardcoded ──
    loadCertificates();

    // ── Contact Form Submission (Formspree) ──
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            const msgDiv = document.getElementById('form-msg');
            
            const formData = new FormData(contactForm);

            btn.disabled = true;
            btn.textContent = 'Sending...';
            msgDiv.textContent = '';
            msgDiv.className = 'form-msg';

            try {
                // Formspree Integration
                // REPLACE 'YOUR_FORM_ID' with your actual Formspree ID
                const formId = 'YOUR_FORM_ID'; 
                const response = await fetch(`https://formspree.io/f/${formId}`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    msgDiv.textContent = 'Message sent successfully! I will get back to you soon.';
                    msgDiv.className = 'form-msg msg-success';
                    contactForm.reset();
                } else {
                    const error = await response.json();
                    throw new Error(error.errors ? error.errors.map(e => e.message).join(', ') : 'Failed to send');
                }
            } catch (error) {
                console.error(error);
                msgDiv.textContent = 'Failed to send message. Please try again later or email me directly.';
                msgDiv.className = 'form-msg msg-error';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Send Message';
            }
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

// ── Hardcoded Certificates ──
function loadCertificates() {
    const grid = document.getElementById('cert-grid');
    if (!grid) return;

    // Hardcoded list of local certificates
    const certs = [
        { file: 'cert1.jpg', title: 'Certificate 1' },
        { file: 'cert2.jpg', title: 'Certificate 2' },
        { file: 'cert3.jpg', title: 'Certificate 3' }
    ];

    if (certs.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Coming soon...</p>';
        return;
    }

    grid.innerHTML = certs.map(cert => `
        <div class="certificate-card glass-panel" onclick="openModal('images/certificates/${cert.file}')">
            <img src="images/certificates/${cert.file}" alt="${cert.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Certificate'">
            <div class="cert-overlay">
                <span class="btn btn-primary btn-small">View Full</span>
            </div>
        </div>
    `).join('');
}
