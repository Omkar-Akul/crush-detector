const grid = document.getElementById('grid');
const pendingCount = document.getElementById('pending-count');

// Extract the secret path from the URL (e.g., /admin-secret-omkar)
const ADMIN_SECRET = window.location.pathname.split('/')[1];

async function fetchRequests() {
    try {
        const res = await fetch(`/api/${ADMIN_SECRET}/pending`);
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error);
        
        renderRequests(data.requests);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state">Error loading requests: ${err.message}</div>`;
    }
}

function renderRequests(requests) {
    pendingCount.innerText = `${requests.length} pending verifications`;
    
    if (requests.length === 0) {
        grid.innerHTML = `<div class="empty-state">🎉 All clear! No pending verification requests.</div>`;
        return;
    }

    grid.innerHTML = requests.map(req => `
        <div class="card" id="user-${req.id}">
            <div class="id-image-container" data-id-url="${req.student_id_url || ''}">
                <span class="badge">${req.verification_type}</span>
                ${req.student_id_url 
                    ? `<img src="${req.student_id_url}" class="id-image" alt="ID Card">`
                    : `<div style="color:#666">No Photo Uploaded</div>`
                }
            </div>
            <div class="card-body">
                <div class="user-name">${req.display_name} (@${req.username})</div>
                <div class="user-email">${req.email}</div>
                
                ${req.college_name ? `
                    <div class="detail-row">
                        <span class="detail-label">College:</span>
                        <span class="detail-value">${req.college_name}</span>
                    </div>
                ` : ''}
                
                ${req.social_link ? `
                    <div class="detail-row">
                        <span class="detail-label">Social:</span>
                        <a href="${req.social_link}" target="_blank" class="social-link">${req.social_link}</a>
                    </div>
                ` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-approve" data-action="approve" data-id="${req.id}">Approve</button>
                <button class="btn btn-reject" data-action="reject" data-id="${req.id}">Reject</button>
            </div>
        </div>
    `).join('');
}

// SECURE EVENT DELEGATION (No inline onclick)
grid.addEventListener('click', (e) => {
    const target = e.target;
    
    // Handle Approve/Reject Buttons
    if (target.classList.contains('btn')) {
        const action = target.getAttribute('data-action');
        const userId = target.getAttribute('data-id');
        
        if (action === 'approve') approveUser(userId);
        if (action === 'reject') rejectUser(userId);
    }
    
    // Handle Image Click
    const imgContainer = target.closest('.id-image-container');
    if (imgContainer) {
        const url = imgContainer.getAttribute('data-id-url');
        if (url) showModal(url);
    }
});

async function approveUser(id) {
    if (!confirm('Are you sure you want to approve this user?')) return;
    
    try {
        const res = await fetch(`/api/${ADMIN_SECRET}/approve/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            document.getElementById(`user-${id}`).style.opacity = '0.3';
            document.getElementById(`user-${id}`).style.pointerEvents = 'none';
            fetchRequests(); // Refresh
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

window.rejectUser = async function(id) {
    if (!confirm('Are you sure you want to reject this user?')) return;
    
    try {
        const res = await fetch(`/api/${ADMIN_SECRET}/reject/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            document.getElementById(`user-${id}`).remove();
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

function showModal(src) {
    if (!src) return;
    document.getElementById('modal-img').src = src;
    document.getElementById('modal').style.display = 'flex';
}

fetchRequests();
