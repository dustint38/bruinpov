//Load map of UCLA on webapp
var map = L.map('map', {minZoom: 16, maxZoom: 19}).setView([34.0700, -118.4441], 17);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

//markers on landmarks
const locations = [
    //UCLA Locations
    { name: "Powell Library", coords: [34.0717, -118.4421]},
    { name: "Royce Hall", coords: [34.07278254463111, -118.44221205786675]},
    { name: "YRL", coords: [34.07505888063144, -118.44149852761913]},
    { name: "Kerckhoff", coords: [34.0703452173111, -118.44370270024882]},
    { name: "Ackerman", coords: [34.07047446172543, -118.44413072073837]},
    { name: "John Wooden Center", coords: [34.07124833718194, -118.44566951813452]},
    { name: "Pauley Pavilion", coords: [34.07036917769024, -118.44694507275653]},
    { name: "SAC", coords: [34.07161129674489, -118.44399668926333]},
    { name: "Straus Stadium", coords: [34.07041731966196, -118.44889579795849]},
    //Dorms(Hill)
    { name: "Dykstra", coords: [34.070017463548986, -118.44998190222536]},
    { name: "Holly", coords: [34.07100868353439, -118.45193101231065]},
    { name: "Sproul", coords: [34.07219428885196, -118.45021608764424]},
    { name: "Saxon", coords: [34.07154337510389, -118.45305850727297]},
    { name: "Rieber", coords: [34.07169439822, -118.45158003293307]},
    { name: "Olympic", coords: [34.072569870057755, -118.45368024816827]},
    { name: "Centennial", coords: [34.07288358823956, -118.4540198055373]},
    { name: "Hitch", coords: [34.07352183888488, -118.45388049994855]},
    { name: "Hedrick", coords: [34.0740340777359, -118.45259914654663]},
    { name: "Sunset", coords: [34.07357364604605, -118.45072508943784]}, 
    { name: "Sunset Canyon", coords: [34.074822079848566, -118.45190496322606]},
    { name: "BFIT", coords: [34.071833514101, -118.44988936493462]}
];

locations.forEach(function(place) {
    var marker = L.marker(place.coords, {title: place.name}).addTo(map);

    marker.bindPopup("<b>" + place.name);
    marker.on('click', onMarkerClick);
});

function onMarkerClick(e){
    this.bindPopup("Viewing " + this.options.title).openPopup();
}

powell.on('click', onMarkerClick);

//add marker function
let currentMousePos = null;
map.on('mousemove', function(e) {
    currentMousePos = e.latlng;
});
