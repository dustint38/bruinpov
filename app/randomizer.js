// 1. Reference the button
const randomBtn = document.getElementById('btnRandom');

// 2. Create the function
async function goToRandomMemory() {
    try {
        // Use 'db' (defined in supabase.js) instead of 'supabase'
        const { data, error } = await db
            .from('memories')
            .select('id, lat, lng, landmark_name'); // Match your schema (lat/lng)

        if (error) throw error;
        if (!data || data.length === 0) {
            console.log("No memories found in database.");
            return;
        }

        // Pick a random item
        const randomMemory = data[Math.floor(Math.random() * data.length)];

        // 3. Move the map to those coordinates
        // 'map' is globally available from map.js
        map.flyTo([randomMemory.lat, randomMemory.lng], 17, {
            animate: true,
            duration: 1.5
        });

        // 4. Trigger the sidebar for this memory
        // We pass the landmark name and coordinates as sidebar.js expects
        if (typeof window.openSidebar === 'function') {
            window.openSidebar(randomMemory.landmark_name, [randomMemory.lat, randomMemory.lng]);
        }

    } catch (err) {
        console.error("Error picking random memory:", err.message);
    }
}

// 5. Attach the listener
if (randomBtn) {
    randomBtn.addEventListener('click', goToRandomMemory);
}