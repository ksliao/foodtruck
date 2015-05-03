L.mapbox.accessToken = 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q';

var geolocate = document.getElementById('geolocate');

var map = L.mapbox.map('map', 'ksliao.kk2oj092')
    .addControl(L.mapbox.geocoderControl('mapbox.places', {
    	autocomplete: true
    }));

var geocoder = L.mapbox.geocoder('mapbox.places');


if (!navigator.geolocation) {
    geolocate.innerHTML = 'Geolocation not available';
} 
else {
    geolocate.onclick = function(e){
    	e.preventDefault();
    	e.stopPropagation();
    	map.locate();
    };
}

// Once we've got a position, zoom and center the map
// on it, and add a single marker.
map.on('locationfound', function(e) {
    map.fitBounds(e.bounds);

    myLayer.setGeoJSON({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [e.latlng.lng, e.latlng.lat]
        },
        properties: {
            'title': 'Here I am!',
            'marker-color': '#ff8888',
            'marker-symbol': 'star'
        }
    });
});

// If the user chooses not to allow their location
// to be shared, display an error message.
map.on('locationerror', function() {
    geolocate.innerHTML = 'Position could not be found';
});

// L.mapbox.featureLayer('examples.map-h61e8o8e').on('ready', function(e) {
//     // The clusterGroup gets each marker in the group added to it
//     // once loaded, and then is added to the map
//     var clusterGroup = new L.MarkerClusterGroup();
//     e.target.eachLayer(function(layer) {
//         clusterGroup.addLayer(layer);
//     });
//     map.addLayer(clusterGroup);
// });

var featureLayer = L.mapbox.featureLayer({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {
                // 'from': 'Duke Point',
                // 'to': 'Tsawwassen',
                'marker-color': '#548cba',
                'marker-size': 'large',
                'marker-symbol': 'ferry'
            },
            geometry: {
                type: 'Point',
                coordinates: [-123.89128804206847, 49.16351524490678]
            }
        }]
    })
    .addTo(map);

// Note that calling `.eachLayer` here depends on setting GeoJSON _directly_
// above. If you're loading GeoJSON asynchronously, like from CSV or from a file,
// you will need to do this within a `featureLayer.on('ready'` event.
featureLayer.eachLayer(function(layer) {

    // here you call `bindPopup` with a string of HTML you create - the feature
    // properties declared above are available under `layer.feature.properties`
    var content = '<h2>A ferry ride!<\/h2>' +
        '<p>From: ' + layer.feature.properties.from + '<br \/>' +
        'to: ' + layer.feature.properties.to + '<\/p>';
    layer.bindPopup(content);
});

var myLayer = L.mapbox.featureLayer().addTo(map);

var geojson = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {
            title: 'Washington, D.C.',
            'marker-color': '#f86767',
            'marker-size': 'large',
            'marker-symbol': 'star',
            url: 'http://en.wikipedia.org/wiki/Washington,_D.C.'
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.03201, 38.90065]
        }
    },
    {
        type: 'Feature',
        properties: {
            title: 'Baltimore, MD',
            'marker-color': '#7ec9b1',
            'marker-size': 'large',
            'marker-symbol': 'star',
            url: 'http://en.wikipedia.org/wiki/Baltimore'
        },
        geometry: {
            type: 'Point',
            coordinates: [-76.60767, 39.28755]
        }
    }]
};

myLayer.setGeoJSON(geojson);
myLayer.on('mouseover', function(e) {
    e.layer.openPopup();
});
myLayer.on('mouseout', function(e) {
    e.layer.closePopup();
});

function showMap(err, data) {
    // The geocoder can return an area, like a city, or a
    // point, like an address. Here we handle both cases,
    // by fitting the map bounds to an area or zooming to a point.
    if (data.lbounds) {
        map.fitBounds(data.lbounds);
    } else if (data.latlng) {
        map.setView([data.latlng[0], data.latlng[1]], 13);
    }
}

var filters = document.getElementById('filters');
var checkboxes = document.getElementsByClassName('filter');

function change() {
    // Find all checkboxes that are checked and build a list of their values
    var on = [];
    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) on.push(checkboxes[i].value);
    }
    // The filter function takes a GeoJSON feature object
    // and returns true to show it or false to hide it.
    map.featureLayer.setFilter(function (f) {
        // check each marker's symbol to see if its value is in the list
        // of symbols that should be on, stored in the 'on' array
        return on.indexOf(f.properties['marker-symbol']) !== -1;
    });
    return false;
}

// When the form is touched, re-filter markers
filters.onchange = change;
// Initially filter the markers
change();

