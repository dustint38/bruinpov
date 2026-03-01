// 1. Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13);

// 2. Add a base layer (OpenStreetMap is free)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 3. Your "Pin" data
// [latitude, longitude, intensity (0 to 1)]
var addressPoints = [
    [51.5, -0.09, 0.5],
    [51.51, -0.1, 0.8],
    [51.49, -0.05, 1.0]
];

// 4. Create and add the heat layer
var heat = L.heatLayer(addressPoints, {
    radius: 25,
    blur: 15,
    maxZoom: 17,
}).addTo(map);