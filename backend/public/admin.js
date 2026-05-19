class AdminDashboard {
    constructor() {
        this.ADMIN_SECRET = window.location.pathname.split('/')[1];
        this.sections = {
            verifications: document.getElementById('verifications-grid'),
            users: document.getElementById('users-table'),
            crushes: document.getElementById('crushes-table'),
            matches: document.getElementById('matches-table'),
            confessions: document.getElementById('confessions-table'),
        };

        this.initialize();
    }

    initialize() {
        this.setupTabs();
        this.setupGlobalEvents();
        this.loadSection('verifications');
    }

    // =========================
    // API Helper
    // =========================
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            this.showToast('Something went wrong!', 'error');
            return null;
        }
    }

    // =========================
    // Tabs
    // =========================
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const target = button.dataset.target;

                document
                    .querySelectorAll('.tab-btn')
                    .forEach((btn) => btn.classList.remove('active'));

                button.classList.add('active');

                document
                    .querySelectorAll('.section')
                    .forEach((section) =>
                        section.classList.remove('active')
                    );

                document
                    .getElementById(target)
                    .classList.add('active');

                this.loadSection(target);
            });
        });
    }

    async loadSection(section) {
        const actions = {
            verifications: () => this.fetchVerifications(),
            users: () => this.fetchUsers(),
            crushes: () => this.fetchCrushes(),
            matches: () => this.fetchMatches(),
            confessions: () => this.fetchConfessions(),
        };

        if (actions[section]) {
            await actions[section]();
        }
    }

    // =========================
    // Verifications
    // =========================
    async fetchVerifications() {
        const data = await this.request(
            `/api/${this.ADMIN_SECRET}/pending`
        );

        if (!data || !data.requests ? .length) {
            this.sections.verifications.innerHTML = `
                <div class="empty-state">
                    🎉 No pending verifications
                </div>
            `;
            return;
        }

        this.sections.verifications.innerHTML = data.requests
            .map(
                (req) => `
            <div class="card">
                <div class="id-image-container" data-url="${req.student_id_url}">
                    <img src="${req.student_id_url}" class="id-image" alt="Student ID">

                    <span class="verification-badge">
                        ${req.verification_type}
                    </span>
                </div>

                <div class="card-content">
                    <h3>${req.display_name}</h3>

                    <p class="username">
                        @${req.username}
                    </p>

                    <p class="meta">
                        ${req.college_name || req.social_link || 'N/A'}
                    </p>

                    <div class="actions">
                        <button 
                            class="btn btn-approve action-btn"
                            data-action="approve"
                            data-id="${req.id}"
                        >
                            Approve
                        </button>

                        <button 
                            class="btn btn-reject action-btn"
                            data-action="reject"
                            data-id="${req.id}"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        `
            )
            .join('');
    }

    // =========================
    // Users
    // =========================
    async fetchUsers() {
        const data = await this.request(
            `/api/${this.ADMIN_SECRET}/users`
        );

        if (!data) return;

        this.sections.users.innerHTML = data.users
            .map(
                (user) => `
            <tr>
                <td>
                    <strong>${user.display_name}</strong>
                    <div class="sub-text">@${user.username}</div>
                </td>

                <td>${user.email}</td>

                <td>
                    <span class="${user.role === 'admin' ? 'admin-role' : ''}">
                        ${user.role}
                    </span>
                </td>

                <td>
                    ${
                        user.is_identity_verified
                            ? '✅ Verified'
                            : '❌ Unverified'
                    }
                </td>

                <td>
                    ${new Date(user.created_at).toLocaleDateString()}
                </td>

                <td>
                    <button 
                        class="btn btn-delete action-btn"
                        data-action="delete-user"
                        data-id="${user.id}"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `
            )
            .join('');
    }

    // =========================
    // Crushes
    // =========================
    async fetchCrushes() {
        const data = await this.request(
            `/api/${this.ADMIN_SECRET}/crushes`
        );

        if (!data) return;

        this.sections.crushes.innerHTML = data.crushes
            .map(
                (crush) => `
            <tr>
                <td>@${crush.sender}</td>
                <td>@${crush.target}</td>
                <td>${crush.confidence_level}%</td>
                <td>
                    ${
                        crush.is_anonymous
                            ? '🕵️ Anonymous'
                            : '📢 Public'
                    }
                </td>
                <td>
                    ${new Date(crush.declared_at).toLocaleDateString()}
                </td>
                <td>
                    <button
                        class="btn btn-delete action-btn"
                        data-action="delete-crush"
                        data-id="${crush.id}"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `
            )
            .join('');
    }

    // =========================
    // Matches
    // =========================
    async fetchMatches() {
        const data = await this.request(
            `/api/${this.ADMIN_SECRET}/matches`
        );

        if (!data) return;

        this.sections.matches.innerHTML = data.matches
            .map(
                (match) => `
            <tr>
                <td>@${match.user1}</td>
                <td>@${match.user2}</td>
                <td>
                    <span class="match-status">
                        ${match.match_status}
                    </span>
                </td>
                <td>
                    ${
                        match.mutual_at
                            ? new Date(match.mutual_at).toLocaleDateString()
                            : 'N/A'
                    }
                </td>
            </tr>
        `
            )
            .join('');
    }

    // =========================
    // Confessions
    // =========================
    async fetchConfessions() {
            const data = await this.request(
                `/api/${this.ADMIN_SECRET}/confessions`
            );

            if (!data ? .confessions ? .length) {
                this.sections.confessions.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        No confessions found
                    </td>
                </tr>
            `;
                return;
            }

            this.sections.confessions.innerHTML = data.confessions
                .map(
                    (confession) => `
            <tr>
                <td>
                    <strong>${confession.title}</strong>
                </td>

                <td class="truncate">
                    ${confession.content.slice(0, 100)}...
                </td>

                <td>
                    ${
                        confession.is_anonymous
                            ? '🕵️ Anonymous'
                            : confession.display_name
                    }
                </td>

                <td>
                    <span class="status ${confession.status}">
                        ${confession.status}
                    </span>
                </td>

                <td>
                    ${new Date(confession.created_at).toLocaleDateString()}
                </td>

                <td>
                    ${
                        confession.status === 'pending'
                            ? `
                        <button 
                            class="btn btn-approve action-btn"
                            data-action="approve-confession"
                            data-id="${confession.id}"
                        >
                            Approve
                        </button>

                        <button 
                            class="btn btn-reject action-btn"
                            data-action="reject-confession"
                            data-id="${confession.id}"
                        >
                            Reject
                        </button>
                    `
                            : `<span>Processed</span>`
                    }
                </td>
            </tr>
        `
            )
            .join('');
    }

    // =========================
    // Events
    // =========================
    setupGlobalEvents() {
        document.addEventListener('click', async (event) => {
            const button = event.target.closest('.action-btn');

            if (!button) {
                const imageContainer =
                    event.target.closest('.id-image-container');

                if (imageContainer) {
                    this.showModal(imageContainer.dataset.url);
                }

                return;
            }

            const action = button.dataset.action;
            const id = button.dataset.id;

            await this.handleAction(action, id);
        });
    }

    async handleAction(action, id) {
        const actions = {
            approve: {
                method: 'POST',
                endpoint: `approve/${id}`,
                reload: 'verifications',
                confirm: 'Approve this verification?',
            },

            reject: {
                method: 'POST',
                endpoint: `reject/${id}`,
                reload: 'verifications',
                confirm: 'Reject this verification?',
            },

            'delete-user': {
                method: 'DELETE',
                endpoint: `users/${id}`,
                reload: 'users',
                confirm: 'Delete this user permanently?',
            },

            'delete-crush': {
                method: 'DELETE',
                endpoint: `crushes/${id}`,
                reload: 'crushes',
                confirm: 'Delete this crush declaration?',
            },

            'approve-confession': {
                method: 'POST',
                endpoint: `confessions/${id}/approve`,
                reload: 'confessions',
                confirm: 'Approve this confession?',
            },

            'reject-confession': {
                method: 'POST',
                endpoint: `confessions/${id}/reject`,
                reload: 'confessions',
                confirm: 'Reject this confession?',
            },
        };

        const config = actions[action];

        if (!config) return;

        if (!confirm(config.confirm)) return;

        const result = await this.request(
            `/api/${this.ADMIN_SECRET}/${config.endpoint}`,
            {
                method: config.method,
            }
        );

        if (result?.success) {
            this.showToast('Action completed successfully', 'success');
            this.loadSection(config.reload);
        }
    }

    // =========================
    // Modal
    // =========================
    showModal(src) {
        if (!src) return;

        const modal = document.getElementById('modal');
        const image = document.getElementById('modal-img');

        image.src = src;
        modal.style.display = 'flex';
    }

    // =========================
    // Toast Notification
    // =========================
    showToast(message, type = 'success') {
        const toast = document.createElement('div');

        toast.className = `toast toast-${type}`;
        toast.innerText = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// =========================
// Initialize Dashboard
// =========================
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});