let currentFilter = 'All';
let allProjects = [];

// Helper functions for User Role Permissions
function getUserRole() {
    const roleSelector = document.getElementById('currentUserRole');
    return roleSelector ? roleSelector.value : 'Admin';
}

function switchUserRole() {
    // Re-render the project list and user list to apply permission changes dynamically
    if (typeof filterAndRenderProjects === 'function') {
        filterAndRenderProjects();
    }
    loadUsers();
}

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadProjects();

    // Hook up search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterAndRenderProjects);
    }

    document.getElementById('workorderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            type: document.getElementById('type').value,
            title: document.getElementById('title').value,
            client_name: document.getElementById('client_name').value,
            assigned_staff_id: document.getElementById('assigned_staff_id').value,
            description: document.getElementById('description').value,
            priority: document.getElementById('priority').value,
            asset_tag: document.getElementById('asset_tag') ? document.getElementById('asset_tag').value : '',
            serial_number: document.getElementById('serial_number') ? document.getElementById('serial_number').value : '',
            specs: document.getElementById('specs') ? document.getElementById('specs').value : ''
        };

        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.getElementById('workorderForm').reset();
            loadProjects();
        }
    });

    // Handle adding new user from UI form
    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('userName').value;
        const role = document.getElementById('userRole').value;

        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role })
        });

        if (res.ok) {
            document.getElementById('userName').value = '';
            loadUsers();
        }
    });

    document.getElementById('seedBtn').addEventListener('click', async () => {
        await fetch('/api/seed', { method: 'POST' });
        loadUsers();
        loadProjects();
    });
});

async function loadUsers() {
    const res = await fetch('/api/users');
    const users = await res.json();
    const currentRole = getUserRole();
    
    // Populate dropdown for assigning tickets
    const select = document.getElementById('assigned_staff_id');
    select.innerHTML = '<option value="">-- Unassigned --</option>';
    
    // Populate user management pills container
    const userListDiv = document.getElementById('userList');
    userListDiv.innerHTML = '';

    users.forEach(u => {
        if (u.role === 'Staff' || u.role === 'Manager') {
            select.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
        }

        // Create visual user pill with delete button (Admin only)
        const deleteUserBtnHtml = currentRole === 'Admin'
            ? `<button onclick="deleteUser(${u.id})" style="background: #e53e3e; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center;">&times;</button>`
            : '';

        const pill = document.createElement('div');
        pill.style.cssText = "background: #edf2f7; padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; border: 1px solid #cbd5e0;";
        pill.innerHTML = `
            <span><strong>${escapeHtml(u.name)}</strong> (${u.role})</span>
            ${deleteUserBtnHtml}
        `;
        userListDiv.appendChild(pill);
    });
}

async function loadProjects() {
    const res = await fetch('/api/projects');
    allProjects = await res.json();
    updateMetrics(allProjects); // <-- Dynamically updates metrics cards and progress bar
    filterAndRenderProjects();
}

// Analytics and Progress Bar Update Function
function updateMetrics(projects) {
    const total = projects.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    projects.forEach(p => {
        if (p.status === 'Pending') pending++;
        else if (p.status === 'In Progress') inProgress++;
        else if (p.status === 'Completed') completed++;
    });

    // Update numerical counters
    const countPending = document.getElementById('count-pending');
    const countInProgress = document.getElementById('count-inprogress');
    const countCompleted = document.getElementById('count-completed');

    if (countPending) countPending.innerText = pending;
    if (countInProgress) countInProgress.innerText = inProgress;
    if (countCompleted) countCompleted.innerText = completed;

    // Update progress bar widths
    const barPending = document.getElementById('bar-pending');
    const barInProgress = document.getElementById('bar-inprogress');
    const barCompleted = document.getElementById('bar-completed');

    if (barPending) barPending.style.width = total ? `${(pending / total) * 100}%` : '0%';
    if (barInProgress) barInProgress.style.width = total ? `${(inProgress / total) * 100}%` : '0%';
    if (barCompleted) barCompleted.style.width = total ? `${(completed / total) * 100}%` : '0%';
}

// Export Project Data to CSV
function exportToCSV() {
    if (!allProjects || allProjects.length === 0) {
        alert("No data available to export.");
        return;
    }

    // Define CSV headers
    const headers = ["ID", "Type", "Title", "Client", "Assigned Staff", "Status", "Priority", "Asset Tag", "Serial Number", "Specs", "Created At"];
    
    // Map projects data to CSV rows
    const rows = allProjects.map(p => [
        p.id,
        `"${(p.type || '').replace(/"/g, '""')}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${(p.client_name || '').replace(/"/g, '""')}"`,
        `"${(p.staff_name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(p.status || '').replace(/"/g, '""')}"`,
        `"${(p.priority || '').replace(/"/g, '""')}"`,
        `"${(p.asset_tag || '').replace(/"/g, '""')}"`,
        `"${(p.serial_number || '').replace(/"/g, '""')}"`,
        `"${(p.specs || '').replace(/"/g, '""')}"`,
        `"${(p.created_at || '').replace(/"/g, '""')}"`
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    // Create a downloadable blob link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `it_tickets_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function filterBoard(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    filterAndRenderProjects();
}

// 1. Filtering Helper Function
function filterAndRenderProjects() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = allProjects.filter(p => {
        const matchesTab = (currentFilter === 'All') || (p.status === currentFilter);
        const matchesSearch = 
            (p.title && p.title.toLowerCase().includes(searchTerm)) ||
            (p.client_name && p.client_name.toLowerCase().includes(searchTerm)) ||
            (p.staff_name && p.staff_name.toLowerCase().includes(searchTerm)) ||
            (p.type && p.type.toLowerCase().includes(searchTerm)) ||
            (p.description && p.description.toLowerCase().includes(searchTerm)) ||
            (p.asset_tag && p.asset_tag.toLowerCase().includes(searchTerm)) ||
            (p.serial_number && p.serial_number.toLowerCase().includes(searchTerm)) ||
            (p.specs && p.specs.toLowerCase().includes(searchTerm));

        return matchesTab && matchesSearch;
    });

    renderProjectsList(filtered);
}

// 2. Rendering Helper Function
function renderProjectsList(projects) {
    const board = document.getElementById('projectList');
    board.innerHTML = '';

    if (projects.length === 0) {
        board.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 20px;">No matching requests found.</p>';
        return;
    }

    const currentRole = getUserRole();

    projects.forEach(p => {
        const div = document.createElement('div');
        div.className = `ticket ${p.status ? p.status.replace(' ', '-') : 'Pending'}`;

        const hardwareInfoHtml = (p.asset_tag || p.serial_number || p.specs) ? `
            <div style="background: #f1f5f9; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; margin-top: 8px; margin-bottom: 10px; color: #334155; display: flex; gap: 12px; flex-wrap: wrap;">
                ${p.asset_tag ? `<span>🏷️ <strong>Asset:</strong> ${escapeHtml(p.asset_tag)}</span>` : ''}
                ${p.serial_number ? `<span>🔢 <strong>S/N:</strong> ${escapeHtml(p.serial_number)}</span>` : ''}
                ${p.specs ? `<span>⚙️ <strong>Specs:</strong> ${escapeHtml(p.specs)}</span>` : ''}
            </div>
        ` : '';

        // Role-based action check for project deletion
        const deleteButtonHtml = currentRole === 'Admin'
            ? `<button onclick="deleteProject(${p.id})" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Delete</button>`
            : `<span style="font-size: 0.75rem; color: #94a3b8; align-self: center;">🔒 Locked (Admin only)</span>`;

        div.innerHTML = `
            <div class="ticket-header">
                <strong>[${p.type}] ${escapeHtml(p.title)}</strong>
                <div style="display: flex; gap: 6px;">
                    <span class="badge priority-${p.priority ? p.priority.toLowerCase() : 'medium'}">${p.priority || 'Medium'}</span>
                    <span class="badge">${p.status}</span>
                </div>
            </div>
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 6px;">${escapeHtml(p.description || 'No description provided.')}</p>
            ${hardwareInfoHtml}
            <div class="ticket-footer">
                <span>Client: <strong>${escapeHtml(p.client_name || 'Internal')}</strong> | Assigned: <strong>${p.staff_name || 'Unassigned'}</strong></span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select onchange="updateStatus(${p.id}, this.value)">
                        <option value="" disabled selected>Change Status...</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed (Notify)</option>
                    </select>
                    ${deleteButtonHtml}
                </div>
            </div>
        `;
        board.appendChild(div);
    });
}

async function updateStatus(id, status) {
    const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (res.ok) {
        loadProjects();
    }
}

async function deleteProject(id) {
    if (confirm("Are you sure you want to delete this ticket?")) {
        try {
            console.log(`Attempting to delete project ID: ${id}`);
            const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            
            console.log("Response status:", res.status);
            if (res.ok) {
                loadProjects();
            } else {
                const text = await res.text();
                alert("Server error: " + text);
            }
        } catch (err) {
            console.error("Fetch failed:", err);
            alert("Network error: Could not connect to server. Is `npm start` running?");
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function deleteUser(id) {
    if (confirm("Are you sure you want to delete this user?")) {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadUsers();
            loadProjects(); // Refresh projects in case an assigned staff was removed
        }
    }
}