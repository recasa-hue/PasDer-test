let selectedPlaceData = null; // Menyimpan lat & lng sementara

function initAutocomplete() {
    const input = document.getElementById('lokasi-input');
    if (!input) return;

    // Opsional: Fokuskan pencarian di area Pasuruan agar lebih relevan
    const pasuruanBounds = {
        north: -7.5894,
        south: -7.7651,
        east: 113.0101,
        west: 112.7214,
    };

    const options = {
        bounds: pasuruanBounds,
        componentRestrictions: { country: "id" },
        fields: ["formatted_address", "geometry", "name"],
        strictBounds: false, // Ubah ke true jika ingin HANYA area Pasuruan
    };

    const autocomplete = new google.maps.places.Autocomplete(input, options);

    // Listener saat admin memilih salah satu saran dari list
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
            alert("Lokasi tidak memiliki data koordinat. Silakan pilih dari daftar yang muncul.");
            return;
        }

        // Tangkap data yang dibutuhkan
        selectedPlaceData = {
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };

        console.log("Lokasi dipilih:", selectedPlaceData);
    });
}