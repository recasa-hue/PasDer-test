window.PasDer = { 
    selectedPlace: null, 
    isMapsLoaded: false, 
    directionsService: null, 
    directionsRenderer: null, 
    currentRouteData: null,
    customMarkers: [] 
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result); reader.onerror = e => reject(e);
});

const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
const navigateTo = (url) => { history.pushState(null, null, url); router(); };

async function loadMaps() {
    if (window.PasDer.isMapsLoaded) return;
    const res = await fetch('/api/config');
    const { mapsApiKey } = await res.json();
    return new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`;
        script.onload = () => { window.PasDer.isMapsLoaded = true; resolve(); };
        document.head.appendChild(script);
    });
}

// Global Delete Function
window.hapusData = async (storeName, id) => {
    const result = await Swal.fire({
        title: 'Yakin hapus data?', text: "Data tidak bisa dikembalikan!", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, hapus!'
    });
    if (result.isConfirmed) {
        await dbManager.delete(storeName, id);
        Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
        router();
    }
};

// Global Detail Paket Function
// Global Detail Paket Function
window.showDetailPaket = async (id) => {
    try {
        // 1. Ambil data paket
        const paket = await dbManager.getById("packages", id);
        if (!paket) return Swal.fire('Error', 'Data paket tidak ditemukan', 'error');

        // 2. Siapkan array untuk menampung elemen HTML destinasi
        let destinasiHtmlArray = [];
        
        for (let i = 0; i < paket.destinasiIds.length; i++) {
            const destId = paket.destinasiIds[i];
            const dest = await dbManager.getById("destinations", destId);
            
            if (dest) {
                // Jika destinasi ada, buat kotak dengan gambar dan nama
                // Gunakan placeholder abu-abu jika destinasi tidak punya foto
                const fotoSrc = dest.foto ? dest.foto : 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
                
                destinasiHtmlArray.push(`
                    <div class="d-flex align-items-center w-100 p-2 border rounded bg-white shadow-sm">
                        <img src="${fotoSrc}" class="rounded mr-3" style="width: 60px; height: 60px; object-fit: cover; border: 1px solid #dee2e6;">
                        <div class="text-left">
                            <h6 class="m-0 font-weight-bold text-dark">${dest.nama}</h6>
                            <small class="text-muted"><i class="fas fa-map-marker-alt mr-1 text-danger"></i> Titik ${i + 1}</small>
                        </div>
                    </div>
                `);
            } else {
                // Jika destinasi terhapus dari database, berikan kotak peringatan merah
                destinasiHtmlArray.push(`
                    <div class="d-flex align-items-center w-100 p-2 border rounded bg-light border-danger">
                        <div class="rounded mr-3 bg-danger d-flex justify-content-center align-items-center text-white" style="width: 60px; height: 60px;">
                            <i class="fas fa-times fa-lg"></i>
                        </div>
                        <div class="text-left">
                            <h6 class="m-0 text-danger font-weight-bold">Destinasi Dihapus</h6>
                            <small class="text-muted">Titik ${i + 1}</small>
                        </div>
                    </div>
                `);
            }
        }

        // 3. Rangkai elemen-elemen tersebut dengan panah ke bawah di tengahnya
        const urutanRute = destinasiHtmlArray.join(`
            <div class="text-center my-2 w-100">
                <i class="fas fa-arrow-down text-primary fa-lg"></i>
            </div>
        `);

        // 4. Munculkan Popup SweetAlert2
        Swal.fire({
            title: `<strong>${paket.nama}</strong>`,
            html: `
                <div class="text-left mt-3">
                    ${paket.thumbnail ? `<img src="${paket.thumbnail}" class="img-fluid rounded shadow-sm mb-3" style="width: 100%; height: 200px; object-fit: cover;">` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                        <span class="badge badge-info px-3 py-2" style="font-size: 0.9rem;">${paket.kategori}</span>
                        <span class="text-success font-weight-bold" style="font-size: 1.3rem;">${formatRupiah(paket.harga)}</span>
                    </div>

                    <p class="mb-2"><strong><i class="fas fa-route mr-1"></i> Urutan Destinasi:</strong></p>
                    
                    <div class="p-3 mb-4 bg-light border rounded">
                        <div class="d-flex flex-column align-items-center">
                            ${urutanRute}
                        </div>
                    </div>

                    <p class="mb-1"><strong><i class="fas fa-info-circle mr-1"></i> Rundown / Deskripsi:</strong></p>
                    <div class="p-3 bg-light border rounded" style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5;">${paket.deskripsi}</div>
                </div>
            `,
            width: 700, // Sedikit dilebarkan agar gambar dan teks destinasi muat dengan baik
            showCloseButton: true,
            focusConfirm: false,
            confirmButtonText: '<i class="fas fa-times"></i> Tutup',
            confirmButtonColor: '#6c757d' // Warna abu-abu agar terlihat seperti tombol 'tutup' biasa
        });

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Gagal memuat detail paket wisata.', 'error');
    }
};

const router = async () => {
    const app = document.getElementById("app");
    const path = window.location.pathname;
    app.innerHTML = '<div class="p-4 text-center"><div class="spinner-border text-primary"></div></div>';

    // =========================================================
    // MODUL 1: DESTINASI
    // =========================================================
    if (path === "/destinasi" || path === "/") {
        const data = await dbManager.getAll("destinations");
        app.innerHTML = `
            <div class="content-header p-3 d-flex justify-content-between align-items-center">
                <h1 class="m-0">Destinasi</h1>
                <a href="/destinasi/tambah" class="btn btn-primary" data-link><i class="fas fa-plus"></i> Tambah</a>
            </div>
            <div class="card mx-3 shadow-sm border-0">
                <div class="card-header bg-white"><h3 class="card-title m-0">Destinasi List</h3></div>
                <div class="card-body p-0 table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light"><tr><th>Nama</th><th>Lokasi</th><th>Foto</th><th>Aksi</th></tr></thead>
                        <tbody>
                            ${data.map(d => `
                                <tr>
                                    <td><strong>${d.nama}</strong></td>
                                    <td><small>${d.address}</small></td>
                                    <td><img src="${d.foto}" class="rounded" style="width: 45px; height: 45px; object-fit: cover;"></td>
                                    <td>
                                        <a href="/destinasi/edit/${d.id}" class="btn btn-info btn-sm" data-link>Edit</a>
                                        <button onclick="hapusData('destinations', ${d.id})" class="btn btn-danger btn-sm">Hapus</button>
                                    </td>
                                </tr>`).join('')}
                            ${data.length === 0 ? '<tr><td colspan="4" class="text-center p-4">Belum ada destinasi.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
    } 
    else if (path === "/destinasi/tambah" || path.startsWith("/destinasi/edit/")) {
        const isEdit = path.startsWith("/destinasi/edit/");
        let existingData = null;
        if (isEdit) {
            const id = path.split("/").pop();
            existingData = await dbManager.getById("destinations", id);
            if(existingData) window.PasDer.selectedPlace = { address: existingData.address, lat: existingData.lat, lng: existingData.lng };
        }

        app.innerHTML = `
            <div class="content-header p-3"><h1>${isEdit ? 'Edit' : 'Tambah'} Destinasi</h1></div>
            <div class="card mx-3 shadow border-0">
                <div class="card-header bg-info text-white"><h3 class="card-title m-0">Form Destinasi</h3></div>
                <form id="destinasi-form" class="card-body">
                    <div class="form-group"><label>Nama</label>
                        <input type="text" id="nama" class="form-control" value="${existingData ? existingData.nama : ''}" required>
                    </div>
                    <div class="form-group"><label>Foto ${isEdit ? '(Opsional)' : ''}</label>
                        <div class="custom-file">
                            <input type="file" class="custom-file-input" id="foto-input" accept="image/*" ${isEdit ? '' : 'required'}>
                            <label class="custom-file-label" id="file-label">Pilih Gambar...</label>
                        </div>
                    </div>
                    <div class="form-group mt-3"><label>Lokasi (Google Maps)</label>
                        <input type="text" id="lokasi-input" class="form-control" value="${existingData ? existingData.address : ''}" placeholder="Cari di Google Maps...">
                    </div>
                    <button type="submit" class="btn btn-primary mt-2">Simpan</button>
                    <a href="/destinasi" class="btn btn-secondary mt-2" data-link>Batal</a>
                </form>
            </div>`;
        
        await loadMaps();
        const ac = new google.maps.places.Autocomplete(document.getElementById('lokasi-input'));
        ac.addListener("place_changed", () => {
            const p = ac.getPlace();
            if (p.geometry) window.PasDer.selectedPlace = { address: p.formatted_address, lat: p.geometry.location.lat(), lng: p.geometry.location.lng() };
        });

        document.getElementById('foto-input').onchange = (e) => {
            if(e.target.files[0]) document.getElementById('file-label').innerText = e.target.files[0].name;
        };

        document.getElementById("destinasi-form").onsubmit = async (e) => {
            e.preventDefault();
            if (!window.PasDer.selectedPlace) return Swal.fire('Error', 'Pilih lokasi dari saran peta!', 'error');

            let fotoBase64 = existingData ? existingData.foto : null;
            if (document.getElementById('foto-input').files[0]) {
                fotoBase64 = await fileToBase64(document.getElementById('foto-input').files[0]);
            }

            const payload = { nama: document.getElementById("nama").value, foto: fotoBase64, ...window.PasDer.selectedPlace };

            if (isEdit) {
                payload.id = existingData.id;
                await dbManager.update("destinations", payload);
                await Swal.fire('Berhasil!', 'Destinasi diperbarui.', 'success');
            } else {
                await dbManager.save("destinations", payload);
                await Swal.fire('Berhasil!', 'Destinasi ditambahkan.', 'success');
            }
            navigateTo("/destinasi");
        };
    }

    // =========================================================
    // MODUL 2: PAKET WISATA
    // =========================================================
    else if (path === "/paket") {
        const dataPaket = await dbManager.getAll("packages");
        app.innerHTML = `
            <div class="content-header p-3 d-flex justify-content-between align-items-center">
                <h1 class="m-0">Paket Wisata</h1>
                <a href="/paket/tambah" class="btn btn-primary" data-link><i class="fas fa-plus"></i> Tambah</a>
            </div>
            <div class="card mx-3 shadow-sm border-0">
                <div class="card-header bg-white"><h3 class="card-title m-0">Paket List</h3></div>
                <div class="card-body p-0 table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light"><tr><th>Nama</th><th>Kategori</th><th>Titik Destinasi</th><th>Harga</th><th>Aksi</th></tr></thead>
                        <tbody>
                            ${dataPaket.map(p => `
                                <tr>
                                    <td><strong>${p.nama}</strong></td>
                                    <td>${p.kategori}</td>
                                    <td>${p.destinasiIds.length} Lokasi</td>
                                    <td>${formatRupiah(p.harga)}</td>
                                    <td>
                                        <button onclick="showDetailPaket(${p.id})" class="btn btn-info btn-sm">Detail</button>
                                        <a href="/paket/edit/${p.id}" class="btn btn-primary btn-sm" data-link>Edit</a>
                                        <button onclick="hapusData('packages', ${p.id})" class="btn btn-danger btn-sm">Hapus</button>
                                    </td>
                                </tr>`).join('')}
                            ${dataPaket.length === 0 ? '<tr><td colspan="5" class="text-center p-4">Belum ada paket.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }
    else if (path === "/paket/tambah" || path.startsWith("/paket/edit/")) {
        const isEdit = path.startsWith("/paket/edit/");
        let existingData = null;
        let destinasiOptions = await dbManager.getAll("destinations");

        if (isEdit) {
            const id = path.split("/").pop();
            existingData = await dbManager.getById("packages", id);
        }

        app.innerHTML = `
            <div class="content-header p-3"><h1>${isEdit ? 'Edit' : 'Tambah'} Paket</h1></div>
            <div class="card mx-3 shadow border-0 mb-5">
                <div class="card-header bg-primary text-white"><h3 class="card-title m-0">Form Paket Wisata</h3></div>
                <form id="paket-form" class="card-body">
                    <div class="row">
                        <div class="col-md-6 form-group">
                            <label>Nama Paket</label>
                            <input type="text" id="nama-paket" class="form-control" value="${existingData ? existingData.nama : ''}" required>
                        </div>
                        <div class="col-md-6 form-group">
                            <label>Kategori</label>
                            <input list="kategori-list" id="kategori" class="form-control" value="${existingData ? existingData.kategori : ''}" required>
                            <datalist id="kategori-list"><option value="Religi"><option value="Alam"><option value="Kuliner"></datalist>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Thumbnail Paket ${isEdit ? '(Opsional)' : ''}</label>
                        <div class="custom-file">
                            <input type="file" class="custom-file-input" id="thumbnail-input" accept="image/*" ${isEdit ? '' : 'required'}>
                            <label class="custom-file-label" id="thumbnail-label">Pilih Gambar</label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Deskripsi (Rundown)</label>
                        <textarea id="deskripsi" class="form-control" rows="3" required>${existingData ? existingData.deskripsi : ''}</textarea>
                    </div>

                    <div class="form-group border p-3 bg-light rounded">
                        <label class="font-weight-bold">Urutan Destinasi</label>
                        <div id="destinasi-container" class="row"></div>
                        
                        <div class="d-flex justify-content-between align-items-end mt-2">
                            <button type="button" id="btn-tambah-titik" class="btn btn-primary btn-sm">
                                <i class="fas fa-plus"></i> Tambah Titik
                            </button>
                            
                            <small class="text-muted italic">
                                *Jika destinasi tidak tersedia pada pilihan, silakan tambah data terlebih dahulu di <a href="/destinasi" data-link>halaman destinasi</a>.
                            </small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Preview Rute Map <small class="text-danger">*Drag garis rute jika tidak sesuai</small></label>
                        <div id="map-preview" style="height: 400px; border-radius: 8px; border: 1px solid #ced4da;"></div>
                    </div>

                    <div class="form-group">
                        <label>Harga (Rp)</label>
                        <input type="number" id="harga" class="form-control" min="0" onkeypress="return event.charCode >= 48 && event.charCode <= 57" value="${existingData ? existingData.harga : ''}" required>
                    </div>

                    <button type="submit" class="btn btn-primary px-4">${isEdit ? 'Update' : 'Simpan'}</button>
                    <a href="/paket" class="btn btn-secondary" data-link>Batal</a>
                </form>
            </div>`;

        await loadMaps();

        // Init Map & Hilangkan Marker Default (A, B, C)
        const map = new google.maps.Map(document.getElementById("map-preview"), {
            zoom: 13, center: { lat: -7.6453, lng: 112.9075 }, mapTypeControl: false
        });
        window.PasDer.directionsService = new google.maps.DirectionsService();
        window.PasDer.directionsRenderer = new google.maps.DirectionsRenderer({
            draggable: true, map: map, suppressMarkers: true 
        });

        // Logika Marker Angka
        const clearCustomMarkers = () => {
            window.PasDer.customMarkers.forEach(m => m.setMap(null));
            window.PasDer.customMarkers = [];
        };

        const createNumberedMarker = (position, number) => {
            const marker = new google.maps.Marker({
                position: position, map: map,
                label: { text: String(number), color: "white", fontWeight: "bold" },
                animation: google.maps.Animation.DROP
            });
            window.PasDer.customMarkers.push(marker);
        };

        window.PasDer.directionsRenderer.addListener("directions_changed", () => {
            const result = window.PasDer.directionsRenderer.getDirections();
            if(result) {
                window.PasDer.currentRouteData = result;
                clearCustomMarkers();
                const legs = result.routes[0].legs;
                for (let i = 0; i < legs.length; i++) createNumberedMarker(legs[i].start_location, i + 1);
                createNumberedMarker(legs[legs.length - 1].end_location, legs.length + 1);
            }
        });

        // Logika Input Destinasi Dinamis
        const container = document.getElementById('destinasi-container');
        let titikCount = 0;

        const tambahDropdownTitik = (selectedValue = "") => {
            titikCount++;
            const div = document.createElement('div');
            div.className = "col-md-6 mb-2 d-flex align-items-center";
            div.innerHTML = `
                <select class="form-control destinasi-select mr-2" required>
                    <option value="">-- Destinasi ${titikCount} --</option>
                    ${destinasiOptions.map(d => `<option value="${d.id}" ${d.id == selectedValue ? 'selected' : ''}>${d.nama}</option>`).join('')}
                </select>
                ${titikCount > 1 ? `<button type="button" class="btn btn-danger btn-sm btn-hapus-titik"><i class="fas fa-times"></i></button>` : '<div style="width:32px"></div>'}
            `;
            container.appendChild(div);

            if(titikCount > 1) {
                div.querySelector('.btn-hapus-titik').onclick = () => { div.remove(); calculateRoute(); };
            }
            div.querySelector('select').onchange = calculateRoute;
        };

        if (isEdit && existingData.destinasiIds.length > 0) {
            existingData.destinasiIds.forEach(id => tambahDropdownTitik(id));
        } else {
            tambahDropdownTitik();
        }

        document.getElementById('btn-tambah-titik').onclick = () => tambahDropdownTitik();
        document.getElementById('thumbnail-input').onchange = (e) => {
            if(e.target.files[0]) document.getElementById('thumbnail-label').innerText = e.target.files[0].name;
        };

        async function calculateRoute() {
            const selects = document.querySelectorAll('.destinasi-select');
            const points = [];
            
            for (let sel of selects) {
                if(sel.value) {
                    const dest = await dbManager.getById("destinations", sel.value);
                    if(dest) points.push({ lat: dest.lat, lng: dest.lng });
                }
            }

            if (points.length >= 2) {
                const origin = points[0];
                const destination = points[points.length - 1];
                const waypoints = points.slice(1, -1).map(p => ({ location: p, stopover: true }));

                window.PasDer.directionsService.route({
                    origin: origin, destination: destination, waypoints: waypoints, travelMode: google.maps.TravelMode.DRIVING
                }, (response, status) => {
                    if (status === 'OK') window.PasDer.directionsRenderer.setDirections(response);
                });
            } else {
                window.PasDer.directionsRenderer.setDirections({routes: []});
                clearCustomMarkers();
            }
        }

        if (isEdit) calculateRoute();

        // Submit Form Paket
        document.getElementById("paket-form").onsubmit = async (e) => {
            e.preventDefault();
            
            const selects = document.querySelectorAll('.destinasi-select');
            const destinasiIds = Array.from(selects).map(s => parseInt(s.value)).filter(v => !isNaN(v));

            if(destinasiIds.length < 2) return Swal.fire('Gagal', 'Pilih minimal 2 titik destinasi!', 'warning');

            let thumbnailBase64 = existingData ? existingData.thumbnail : null;
            if (document.getElementById('thumbnail-input').files[0]) {
                thumbnailBase64 = await fileToBase64(document.getElementById('thumbnail-input').files[0]);
            }

            const payload = {
                nama: document.getElementById("nama-paket").value,
                kategori: document.getElementById("kategori").value,
                deskripsi: document.getElementById("deskripsi").value,
                harga: parseInt(document.getElementById("harga").value),
                destinasiIds: destinasiIds,
                thumbnail: thumbnailBase64
            };

            if (isEdit) {
                payload.id = existingData.id;
                await dbManager.update("packages", payload);
                await Swal.fire('Tersimpan!', 'Paket berhasil diperbarui.', 'success');
            } else {
                await dbManager.save("packages", payload);
                await Swal.fire('Berhasil!', 'Paket baru telah dibuat.', 'success');
            }
            navigateTo("/paket");
        };
    }
};

window.onpopstate = router;
document.addEventListener("DOMContentLoaded", router);
document.body.onclick = e => { if (e.target.matches("[data-link]")) { e.preventDefault(); navigateTo(e.target.getAttribute('href')); }};