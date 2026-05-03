const ADMIN_SECRET = window.location.pathname.split('/')[1];

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        loadData(target);
    });
});

async function loadData(target) {
    if (target === 'verifications') fetchVerifications();
    if (target === 'users') fetchUsers();
    if (target === 'crushes') fetchCrushes();
    if (target === 'matches') fetchMatches();
}

// 1. Verifications
async function fetchVerifications() {
    const grid = document.getElementById('verifications-grid');
    const res = await fetch(`/api/${ADMIN_SECRET}/pending`);
    const data = await res.json();
    if (data.requests.length === 0) {
        grid.innerHTML = '<div class="empty-state">🎉 No pending verifications</div>';
        return;
    }
    grid.innerHTML = data.requests.map(req => `
        <div class="card" id="verify-${req.id}">
            <div class="id-image-container" data-url="${req.student_id_url}">
                <img src="${req.student_id_url}" class="id-image" alt="ID">
                <div style="position:absolute; top:10px; left:10px; background:var(--primary); padding:4px 10px; border-radius:10px; font-size:10px;">${req.verification_type}</div>
            </div>
            <div style="padding:20px;">
                <div style="font-weight:700;">${req.display_name}</div>
                <div style="color:var(--text-dim); font-size:13px; margin-bottom:10px;">@${req.username}</div>
                <div style="font-size:12px; margin-bottom:15px;">${req.college_name || req.social_link}</div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-approve action-btn" data-action="approve" data-id="${req.id}">Approve</button>
                    <button class="btn btn-reject action-btn" data-action="reject" data-id="${req.id}">Reject</button>
                </div>
            </div>
        </div>
    `).join('');
}

// 2. Users
async function fetchUsers() {
    const table = document.getElementById('users-table');
    const res = await fetch(`/api/${ADMIN_SECRET}/users`);
    const data = await res.json();
    table.innerHTML = data.users.map(u => `
        <tr>
            <td>
                <div style="font-weight:600;">${u.display_name}</div>
                <div style="font-size:12px; color:var(--text-dim);">@${u.username}</div>
            </td>
            <td>${u.email}</td>
            <td><span style="color:${u.role === 'admin' ? 'var(--primary)' : 'inherit'}">${u.role}</span></td>
            <td>${u.is_identity_verified ? '✅ Verified' : '❌ Unverified'}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-delete action-btn" data-action="delete-user" data-id="${u.id}">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 3. Crushes
async function fetchCrushes() {
    const table = document.getElementById('crushes-table');
    const res = await fetch(`/api/${ADMIN_SECRET}/crushes`);
    const data = await res.json();
    table.innerHTML = data.crushes.map(c => `
        <tr>
            <td>@${c.sender}</td>
            <td>@${c.target}</td>
            <td>${c.confidence_level}%</td>
            <td>${c.is_anonymous ? '🕵️ Anonymous' : '📢 Public'}</td>
            <td>${new Date(c.declared_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-delete action-btn" data-action="delete-crush" data-id="${c.id}">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 4. Matches
async function fetchMatches() {
    const table = document.getElementById('matches-table');
    const res = await fetch(`/api/${ADMIN_SECRET}/matches`);
    const data = await res.json();
    table.innerHTML = data.matches.map(m => `
        <tr>
            <td>@${m.user1}</td>
            <td>@${m.user2}</td>
            <td><span style="color:var(--primary); font-weight:600;">${m.match_status}</span></td>
            <td>${m.mutual_at ? new Date(m.mutual_at).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('');
}

// Global Event Listener (Event Delegation)
document.addEventListener('click', async (e) => {
    const target = e.target.closest('.action-btn');
    if (!target) {
        // Check for image click
        const imgContainer = e.target.closest('.id-image-container');
        if (imgContainer) {
            const src = imgContainer.getAttribute('data-url');
            if (src) showModal(src);
        }
        return;
    }

    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');

    if (action === 'approve' || action === 'reject') {
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        const res = await fetch(`/api/${ADMIN_SECRET}/${action}/${id}`, { method: 'POST' });
        if ((await res.json()).success) fetchVerifications();
    }

    if (action === 'delete-user') {
        if (!confirm('CRITICAL: Delete user and ALL related data? This cannot be undone.')) return;
        const res = await fetch(`/api/${ADMIN_SECRET}/users/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) fetchUsers();
        else alert('Error: ' + result.error);
    }

    if (action === 'delete-crush') {
        if (!confirm('Delete this crush declaration?')) return;
        const res = await fetch(`/api/${ADMIN_SECRET}/crushes/${id}`, { method: 'DELETE' });
        if ((await res.json()).success) fetchCrushes();
    }
});

function showModal(src) {
    if (!src) return;
    document.getElementById('modal-img').src = src;
    document.getElementById('modal').style.display = 'flex';
}

// Initial Load
fetchVerifications();
