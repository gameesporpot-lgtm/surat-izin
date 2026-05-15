let isAdmin = false;
let izins = [];

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('izinForm');
    const status = document.getElementById('status');
    const adminBtn = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminPanel = document.getElementById('adminPanel');
    const userForm = document.getElementById('userForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeModal = document.querySelector('.close');
    
    // Set tanggal hari ini
    document.getElementById('tanggal').valueAsDate = new Date();

    // Admin Login
    adminBtn.addEventListener('click', () => {
        adminModal.style.display = 'block';
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        
        if (password === 'faction2') {
            isAdmin = true;
            adminModal.style.display = 'none';
            adminPanel.style.display = 'block';
            userForm.style.opacity = '0.5';
            userForm.style.pointerEvents = 'none';
            loadIzins();
            updateStats();
        } else {
            showStatus('❌ Password salah!', 'error');
        }
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        isAdmin = false;
        adminPanel.style.display = 'none';
        userForm.style.opacity = '1';
        userForm.style.pointerEvents = 'auto';
    });

    // Form submit
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (!data.nama || !data.nip || !data.jenisIzin || !data.tanggal) {
            showStatus('Mohon lengkapi semua field yang wajib!', 'error');
            return;
        }

        showStatus('Mengirim izin...', 'info');
        
        try {
            const response = await fetch('server.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                showStatus('✅ Izin berhasil dikirim! Admin akan segera memproses.', 'success');
                form.reset();
                document.getElementById('tanggal').valueAsDate = new Date();
                if (isAdmin) loadIzins();
            } else {
                throw new Error(result.message || 'Gagal mengirim izin');
            }
        } catch (error) {
            showStatus('❌ Gagal mengirim izin. Silakan coba lagi.', 'error');
        }
    });

    // Load izins untuk admin
    async function loadIzins() {
        try {
            const response = await fetch('server.php?action=list');
            const result = await response.json();
            if (response.ok) {
                izins = result;
                renderIzins();
                updateStats();
            }
        } catch (error) {
            console.error('Error loading izins:', error);
        }
    }

    function renderIzins() {
        const container = document.getElementById('izinList');
        container.innerHTML = '';

        izins.forEach((izin, index) => {
            const item = createIzinItem(izin, index);
            container.appendChild(item);
        });
    }

    function createIzinItem(izin, index) {
        const div = document.createElement('div');
        div.className = `izin-item ${izin.jenisIzin} ${izin.status}`;
        div.innerHTML = `
            <div class="izin-header">
                <div class="izin-nama">${izin.nama}</div>
                <div class="izin-status status-${izin.status}">
                    ${izin.status === 'pending' ? '⏳ Menunggu' : 
                      izin.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                </div>
            </div>
            <div class="izin-meta">
                <span><i class="fas fa-id-card"></i> ${izin.nip}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(izin.tanggal).toLocaleDateString('id-ID')}</span>
                ${izin.kelas ? `<span><i class="fas fa-graduation-cap"></i> ${izin.kelas}</span>` : ''}
            </div>
            <div class="izin-alasan">${izin.alasan}</div>
            ${izin.status === 'pending' ? `
                <div class="izin-actions">
                    <button class="action-btn btn-approve" onclick="handleAction(${izin.id}, 'approved')">
                        <i class="fas fa-check"></i> Setujui
                    </button>
                    <button class="action-btn btn-reject" onclick="handleAction(${izin.id}, 'rejected')">
                        <i class="fas fa-times"></i> Tolak
                    </button>
                </div>
            ` : ''}
        `;
        return div;
    }

    function updateStats() {
        const pending = izins.filter(i => i.status === 'pending').length;
        const approved = izins.filter(i => i.status === 'approved').length;
        const rejected = izins.filter(i => i.status === 'rejected').length;

        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('approvedCount').textContent = approved;
        document.getElementById('rejectedCount').textContent = rejected;
    }

    window.handleAction = async (id, status) => {
        try {
            const response = await fetch('server.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', id, status })
            });

            if (response.ok) {
                loadIzins();
                showStatus(`${status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}!`, 'success');
            }
        } catch (error) {
            showStatus('Error updating status', 'error');
        }
    };

    function showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => status.style.display = 'none', 3000);
        }
    }

    // Custom placeholder
    document.getElementById('jenisIzin').addEventListener('change', function() {
        const alasan = document.getElementById('alasan');
        if (this.value === 'sakit') {
            alasan.placeholder = 'Contoh: Demam, flu, sakit perut, dll...';
        } else if (this.value === 'acara') {
            alasan.placeholder = 'Contoh: Acara keluarga, wisuda adik, dll...';
        }
    });
});