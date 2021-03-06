var GoogleMap = function (options) {

    if (!options) {
        options = {};
    }
    // -1 equal unlimited
    var totalMarker = options.totalMarker || 0;
    // options
    var mapCenter = {};
    if (options.mapCenter) {
        mapCenter.latitude = options.mapCenter.latitude || 36.318577999999995;
        mapCenter.longitude = options.mapCenter.longitude || 59.58842000000004;
    } else {
        mapCenter.latitude = 36.318577999999995;
        mapCenter.longitude = 59.58842000000004;
    }
    var zoom = options.zoom || 13;
    var zoomControl = (options.zoomControl == undefined) ? true : options.zoomControl;

    var containerElement = options.containerElement || undefined;
    var scrollWheelZoom = (options.scrollWheelZoom == undefined) ? true : options.scrollWheelZoom;
    var markerIcon = options.markerIcon || undefined;
    var onMapClick = options.onMapClick || undefined;
    var onMapZoomChange = options.onMapZoomChange || undefined;
    var onMarkerClick = options.onMarkerClick || undefined;
    var onMapIdle = options.onMapIdle || undefined;

    // private variables
    var map = undefined;
    var markers = {};
    var polygons = {};
    var polylines = {};

    // private functions

    // initial the map
    var init = function () {
        if (googleIsAvailable()) {
            var zoomControlOptions = {
                style: google.maps.ZoomControlStyle.LARGE,
                position: google.maps.ControlPosition.LEFT_CENTER
            };
            var mapOptions = {
                center: new google.maps.LatLng(mapCenter.latitude, mapCenter.longitude),
                zoom: zoom,
                zoomControl: zoomControl,
                zoomControlOptions: zoomControlOptions,
                scrollwheel: scrollWheelZoom
            };
            map = new google.maps.Map(containerElement, mapOptions);

            if (onMapClick) {
                google.maps.event.addListener(map, 'click', function (event) {
                    var point = {
                        'latitude': event.latLng.lat(),
                        'longitude': event.latLng.lng(),
                    };
                    onMapClick(map, event, point);
                });
            }

            if (onMapZoomChange) {
                google.maps.event.addListener(map, 'zoom_changed', function () {
                    onMapZoomChange(map, map.getZoom());
                });
            }

            if (onMapIdle) {
                google.maps.event.addListener(map, 'idle', function () {
                    onMapIdle(map);
                });
            }

            if (onMapTilesLoaded) {
                google.maps.event.addListener(map, 'tilesloaded', function (event) {
                    onMapTilesLoaded(map, event);
                });
            }

        } else {
            console.log('google map is undefined');
            if (containerElement.classList.length == 0) {
                containerElement.className = 'offline';
            } else {
                containerElement.className = containerElement.className + ' offline';
            }
        }
    };

    var getZoom = function () {
        return map.getZoom();
    };

    var setZoom = function (value) {
        zoom = value;
        map.setZoom(zoom);
    };

    var getBounds = function () {
        var mapBounds = map.getBounds();
        var northEast = mapBounds.getNorthEast();
        var southWest = mapBounds.getSouthWest();
        var bounds = {
            topRight: {
                'latitude': northEast.lat(),
                'longitude': northEast.lng(),
            },
            topLeft: {
                'latitude': northEast.lat(),
                'longitude': southWest.lng(),
            },
            bottomRight: {
                'latitude': southWest.lat(),
                'longitude': northEast.lng(),
            },
            bottomLeft: {
                'latitude': southWest.lat(),
                'longitude': southWest.lng(),
            }
        };

        return bounds;
    };

    var addMarker = function (latitude, longitude, key, title, icon) {
        if (totalMarker > getMarkersCount() || totalMarker == -1) {
            var latLng = new google.maps.LatLng(latitude, longitude);
            if (!key) {
                key = guid();
            }
            var option = {
                position: latLng,
                map: map
            };
            if (title) {
                option.title = title;
            }
            if (icon) {
                option.icon = icon;
            }
            else if (markerIcon) {
                option.icon = markerIcon;
            }
            var marker = new google.maps.Marker(option);
            marker.key = key;
            if (onMarkerClick) {
                google.maps.event.addListener(marker, 'click', function (event) {
                    var point = {
                        'latitude': event.latLng.lat(),
                        'longitude': event.latLng.lng(),
                    };
                    onMarkerClick(map, event, this, point)
                });
            }
            markers[key] = marker;
            return marker;
        }
        return false;
    };

    var clearMarkers = function () {
        for (var key in markers) {
            markers[key].setMap(null);
        }
        markers = {};
    };

    var getMarkers = function () {
        return markers;
    };

    var getMarkersPoint = function () {
        var points = [];
        for (var index in markers) {
            var marker = markers[index];
            var point = {
                'latitude': marker.position.lat(),
                'longitude': marker.position.lng()
            };
            points.push(point)
        }
        return points;
    };

    var getMarkersCount = function () {
        return Object.keys(markers).length;
    };

    var addInfoWindow = function (marker, content) {
        var infoWindow = new google.maps.InfoWindow({
            content: content
        });
        google.maps.event.addListener(marker, 'click', function (event) {
            infoWindow.open(map, marker);
        });
    };

    var addPolygon = function (points, key) {
        if (!key) {
            key = guid();
        }

        for (var index in points) {
            points[index] = new google.maps.LatLng(points[index]['latitude'], points[index]['longitude']);
        }

        var polygon = new google.maps.Polygon({
            path: points,
            strokeColor: "#0000FF",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#0000FF",
            fillOpacity: 0.4
        });
        polygon.setMap(map);
        polygons[key] = polygon;
    };

    var getPolygonArea = function (key) {
        if (google.maps.geometry) {
            return google.maps.geometry.spherical.computeArea(polygons[key].getPath());
        }
        console.log('google map geometry library not included');
        return undefined;
    };

    var clearPolygons = function () {
        for (var key in polygons) {
            polygons[key].setMap(null);
        }
        polygons = {};
    };

    var getPolygonsCount = function () {
        return Object.keys(polygons).length;
    };

    var addPolyline = function (points, key) {

        if (!key) {
            key = guid();
        }

        for (var index in points) {
            points[index] = new google.maps.LatLng(points[index]['latitude'], points[index]['longitude']);
        }

        var polyline = new google.maps.Polyline({
            path: points,
            strokeColor: "#0000FF",
            strokeOpacity: 0.8,
            strokeWeight: 2,
        });
        polyline.setMap(map);
        polylines[key] = polyline;
    };

    var clearPolylines = function () {
        for (var key in polylines) {
            polylines[key].setMap(null);
        }
        polylines = {};
    };

    var getPolylinesCount = function () {
        return Object.keys(polylines).length;
    };

    var setMapCenter = function (latitude, longitude) {
        mapCenter = {
            latitude: latitude,
            longitude: longitude
        };
        map.setCenter(new google.maps.LatLng(mapCenter.latitude, mapCenter.longitude));
    };

    var getCurrentMapCenter = function () {
        var center = {
            latitude: map.getCenter().lat(),
            longitude: map.getCenter().lng()
        };
        return center;
    };

    var refresh = function () {
        //refresh map
    };

    var resize = function () {
        google.maps.event.trigger(map, 'resize');
    };

    var googleIsAvailable = function () {
        var result = false;
        if (typeof google !== "undefined" && typeof google !== undefined && typeof google.maps.LatLng === "function") {
            result = true;
        }
        return result;
    };

    var guid = function () {
        return guidHelperV4() + guidHelperV4() + '-' + guidHelperV4() + '-' + guidHelperV4() + '-' + guidHelperV4() + '-' + guidHelperV4() + guidHelperV4() + guidHelperV4();
    };
    var guidHelperV4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };

    // public function

    this.setMapCenter = setMapCenter;
    this.getCurrentMapCenter = getCurrentMapCenter;
    this.refresh = refresh;
    this.resize = resize;
    this.getZoom = getZoom;
    this.setZoom = setZoom;
    this.getBounds = getBounds;

    this.addMarker = addMarker;
    this.clearMarkers = clearMarkers;
    this.getMarkers = getMarkers;
    this.getMarkersPoint = getMarkersPoint;
    this.getMarkersCount = getMarkersCount;

    this.addInfoWindow = addInfoWindow;

    this.addPolygon = addPolygon;
    this.clearPolygans = clearPolygons;
    this.getPolygonsCount = getPolygonsCount;
    this.getPolygonArea = getPolygonArea;

    this.addPolyline = addPolyline;
    this.clearPolylines = clearPolylines;
    this.getPolylinesCount = getPolylinesCount;

    init();
};

// static function

//  have to enable libraries=geometry for google map
GoogleMap.distance = function (pointA, PointB) {
    var latLngA = new google.maps.LatLng(pointA.latitude, pointA.longitude);
    var latLngB = new google.maps.LatLng(PointB.latitude, PointB.longitude);
    var distance = google.maps.geometry.spherical.computeDistanceBetween(latLngA, latLngB);
    return distance; //In metres
};