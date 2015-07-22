// modelData contains global base variables for the web app
var modelData = {
  pageTitle: 'Welcome to Neighborhood Map!', // page title
  pageDirections: 'Directions: Search by address or city, then refine by places of interest. A list of results will appear below the map, each of which can be clicked to perform a Wikipedia article lookup.', // page directions
  markerListTitle: ko.observable(''),   // variable for the marker list heading
  markerListFoot: ko.observable(''),   // variable for directions following marker list
  map: {},          // google map global variable
  geocoder: {},     // geocoder for google map geolocation data
  address: '',      // address, to be pulled from value entered in search field
  addressGeo: '',   // geographic coordinates of above address, to be calculated by geocodeAddress
  refine: '',       // places of interest, to be pulled from value entered into refine search field
  infowindow: {},   // object used for the marker info windows
  markerList: {     // object used for marker list and the info for the places of interest
      marker: [],
      info: []
    }
};


// viewModel contains the following functions for the app:
// mapInitialize initializes the map on page load
// codeAddress pulls address entered in the search bar, geocodes it, & updates map
// locMarker initiates google places services lookup of markers
// callback places results from google places service & puts it on list of markers
// createMarker creates markers on the map
// infoWindow show infowindow for marker & initiates wiki lookup
// locMarkerClear clears markers from map
// artcles does a wiki looup on marker
var viewModel = function() {
  'use strict';
  var self = this;

  // Initialize oberservables
  self.pageTitle = ko.observable(modelData.pageTitle);  // observable for page title
  self.pageDirections = ko.observable(modelData.pageDirections);  // observable for page title
  self.markerArray = ko.observableArray();     // observable array for marker list
  self.wikiHeader = ko.observable();                // contains wikipedia section header
  self.markerListHTML = ko.observable();            // contains markers as HTML list items to be bound to DOM
  self.filter = ko.observable();                    // filter criteria
  self.wikiLinksHtml = ko.observable();             // contains html wikipedia articles as HTML list items to be bound to DOM
  self.showRefineContainer = ko.observable(false);  // hides refine search bar initially
  self.showMarkerList = ko.observable(false);       // hides marker list initially
  self.showWikiSnippet = ko.observable(false);      // hides Wikipedia snippet initially
  self.refineForm = ko.observable();                // used to clear value from refine search field in locMarkerClear function


  // mapInitialize function initializes the google map API on page load
  self.mapInitialize = function() {
    modelData.geocoder = new google.maps.Geocoder();
    var mapOptions = {
      zoom: 4,
      center: {lat: -28, lng: 137.883}
    };
    // calls google maps API & sets the map variable
    modelData.map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);
  };
  google.maps.event.addDomListener(window, 'load', self.mapInitialize);


  // geocodeAddress function converts the address/city inputted into the
  // 'Search' field into geographic coordinates. This funciton is called by the
  // 'Search' button in the DOM. If the conversion is successful,
  // the map is updated with the new coordinate pair. If the conversion fails,
  // an error pops up with the reason for the failure. This function calls the
  // locMarkerClear function (to clear markers from previous searchs) & unhides
  // the refine search bar by changing the visibility of showRefineContainer to true.
  self.geocodeAddress = function() {
    modelData.address = document.getElementById('address').value;   // pulls address from search value entered
    modelData.addressGeo = '';    // clears any current geocoded value
    // uses google map geocoder to generate a latitude/longitude coordinate pair for the address
    modelData.geocoder.geocode( { 'address': modelData.address}, function(results, status) {
    // if geocode is succssful, updates map to be centered & zoomed in on location
      if (status === google.maps.GeocoderStatus.OK) {
        modelData.addressGeo = results[0].geometry.location;
        var mapOptions = {
          center: results[0].geometry.location,
          zoom: 15
        };
        modelData.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        self.showRefineContainer(true);      // unhides refine search bar
        self.locMarkerClear();               // clears any current markers
      } else {
        // error message if geocoder fails
        alert('Hey, you messed something up. Lookup failed. Status: ' + status);
      }
    });
  };


  // locMarker function initiates google places service lookup of marker.
  // This function is called by the 'Refine' button in the DOM.
  // It pulls the value inputted into the 'Refine' search field, & initializes
  // the request object, which is then passed into the textSearch function in the
  // google maps api. The results of the textSearch function are then passed to
  // the callback function.
  self.locMarker = function() {
    // if statement checks if an address has been entered.  If not, it displays an error message
    if (modelData.address !== '' && modelData.addressGeo !== '') {
      modelData.refine = document.getElementById('refine').value;
      // request object sets up the parameters for the textSearch
      var request = {
        location: modelData.addressGeo,
        radius: 150,
        query: modelData.refine
      };
      modelData.infowindow = new google.maps.InfoWindow();  // initiates the infowindow
      var service = new google.maps.places.PlacesService(modelData.map);  // sets up place service
      service.textSearch(request, self.callback); // calls textSearch & calls callback with results
    }
  };


  // callback function puts the results of the google places services in a list.
  // First it clears any current markers, then checks status of google places service.
  // If successful, the top 10 results are run through the createMarker function,
  // placed into a list on the DOM, & are pushed into markerArray.
  self.callback = function(results, status) {
    self.locMarkerClear();    // clears any current markers
    // if statement checks status of places service.
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      modelData.markerList.info = results;    // sets up the marker list info
      for (var i = 0; i < 20; i++) {          // limits list to top 10 results (replace '10' with 'results.length' to show all results)
        self.createMarker(results[i], i);     // Calls createMarker function to add markers to map
        self.markerListHTML('<li class="listedMarker">' + results[i].name + '</li>'); // Adds each result to list of markers
        self.markerArray.push(results[i]);
        var markerIndex = self.markerArray().length - 1; // captures array length
        self.markerArray()[markerIndex].marker = modelData.markerList.marker[i];
        var listLength = self.markerArray().length;
        // if statement sets the marker list title text based on the array having items or not
        if (listLength > 0) {
          modelData.markerListTitle('Top ' + listLength + ' results for "' + modelData.refine + '" near "' + modelData.address + '":'); // sets marker list heading
          modelData.markerListFoot('Click results to highlight on map & learn more.'); // directions that below marker list
          self.showMarkerList(true);  // makes div that contains marker list visible in DOM
        } else {
          modelData.markerListTitle('No markers to display...');
        }
      }
    } else {
        // alerts the user if the status from the google map api places service status is not ok
        alert('Places Service error: ' + status);
    }
  };


  // filteredResults function filters through the search & refine results list
  // (marker list) based on value inputted into 'Filter results' field. As letters
  // are keyed in, the list is updated to show only the results that contain
  // the filter criteria.
  self.filteredResults = ko.computed(function() {
      // if statement checks to see if there are results to be filtered
      if (self.markerArray().length > 0) {
        // if statement checks to see if the filter input field contains any
        // letters. if so, only the results that comply with that criteria will
        // remain on the map. if not, all results remain on the map.
        if (!self.filter()) {
          // for loop iterates through list array restoring markers to the map
          for (var i = 0; i < self.markerArray().length; i++) {
            if (self.markerArray()[i].marker !== undefined) {
              self.markerArray()[i].marker.setMap(modelData.map);
            }
            modelData.markerListTitle('Top ' + self.markerArray().length + ' results for "' + modelData.refine + '" near "' + modelData.address + '":'); // sets marker list heading
          }
          // list array is returned to update list on the DOM
          return self.markerArray();
        } else {
          // currentFilteredResults to be filled with results that comply with
          // filter criteria
          var currentFilteredResults = [];
          // for loop iterates through the marker list array to determine which
          // results comply with criteria. if true, result is pushed into array
          // & is shown on the map. if false, result is not pushed into array &
          // that result's map marker is hidden.
          for (var i = 0; i < self.markerArray().length; i++) {
            if (self.markerArray()[i].name.toLowerCase().search(self.filter().toLowerCase()) !== -1) {
              currentFilteredResults.push(self.markerArray()[i]);
              self.markerArray()[i].marker.setMap(modelData.map);
            } else {
              self.markerArray()[i].marker.setMap(null);
            }
          }
          // if statement checks to see if there are any results in the currentFilteredResults
          // array. if true, updates list title. if false, title is blank.
          if (currentFilteredResults.length > 0) {
            modelData.markerListTitle('Filtered results:');
          } else {
            modelData.markerListTitle('No results.');
          }
          // the currentFilteredResults array is returned to update the list on the DOM
          return currentFilteredResults;
        }
      }
  }, this);


  // createMarker function is called by the callback function to create markers
  // on the map. It also assigns the infoWindow text for each marker.
  self.createMarker = function(place, index) {
    // marker object variable is set up by calling the google map api marker capaibility
    // current map & marker location are passed into the google map api
    var marker = new google.maps.Marker({
      map: modelData.map,
      position: place.geometry.location
    });
    // marker object is captured to pass into the marker array
    modelData.markerList.marker[index] = marker;
    // addListener function is called to create the infowindow content for marker
    google.maps.event.addListener(marker, 'click', function() {
      modelData.infowindow.setContent(place.name);
      modelData.infowindow.open(modelData.map, this);
    });
  };


  // locMarkerClear function clears all markers from the list array
  self.locMarkerClear = function() {
    // for statement interates through the array, hiding each marker
    for (var i = 0; i < self.markerArray().length; i++) {
      self.markerArray()[i].marker.setMap(null);
    }
    self.markerArray.removeAll();    // removes all markers from the list in the DOM
    self.showMarkerList(false);      // hides marker list div
    self.showWikiSnippet(false);     // hides wikipedia article list div
    self.refineForm(null);           // resets refine search value to null

    };


  // infoWindow function creates the infowindow for marker and initiates
  // the wikipedia lookup. This function is called when a user clicks on an item
  // in the marker list.
  self.infoWindow = function(listIndex, data) {
    modelData.infowindow.setContent(data.name);
    modelData.infowindow.open(modelData.map, data.marker);
    // calls the wikipedia articles lookup function
    self.articles(data.name);       // call Wikipedia article lookup function
    self.showWikiSnippet(true);     // unhides Wikipedia div in DOM
  };


  // artcles function does a wikipedia lookup on the marker that is clicked. It
  // is called by the infoWindow function. Any articles found that relate to the
  // marker are placed on a list in the DOM, with a link to the article & a
  // short description.
  self.articles = function(articleSearch) {
    var articleSearchArray = articleSearch.split('&');  // Removes '&' from articleSearch (if present, since it messes up api url) & splits it into an array
    if (articleSearchArray.length > 1) {             // If '&' was present, for loop patches articleSearch array back together without the '&'
      articleSearch = "";
      for (var i = 0; i < articleSearchArray.length; i++) {
        articleSearch = articleSearch + articleSearchArray[i];
      }
    }
    // calls wikipedia api
    var wikiArticles = 'http://en.wikipedia.org/w/api.php?format=json&action=opensearch&search=' + articleSearch + '&callback=wikiCallback';
    $.ajax({
      url: wikiArticles,
      dataType: "jsonp",
      timeout: 5000,
      success: function( data ) {
        var wikiItems = "";   // string for DOM elements for each article
        var wikiArray = {     // array to build the DOM elements that will be passed into wikiItems
          link: [],           // list of links for articles
          articleDesc: []     // list of article descriptions to accomplany links
        };
        // if statement determines if any related articles are available returned
        self.wikiLinksHtml('');   // clears any current articles
        if (data[1].length !== 0) {
          self.wikiHeader('Wikipedia Articles About ' + articleSearch + ':');
          // creates a link DOM element for each artcle & pushes it in the wikiArray link array
          $.each( data[1], function( key, val ) {
            wikiArray.link.push( '<li><a href="http://en.wikipedia.org/wiki/' + val + '">' + val + '</a>: ' );
          });
          // creates a description DOM element for each article & pushes it into
          // the wikiArray articleDesc array
          $.each( data[2], function( key, val ) {
            // if statement determines if an article description exists & adds the
            // appropriate text
            if (val === "") {
              wikiArray.articleDesc.push('No description available...</li>');
            } else {
              wikiArray.articleDesc.push(val + '</li>');
            }
          });
          // generates the wikiItems string
          // currently limits to 1st result; replace '1' with 'wikiArray.link.length' for all results
          for (var i = 0; i < 1; i++) {
            wikiItems = wikiItems + wikiArray.link[i] + wikiArray.articleDesc[i];
          }
          // updates the DOM with the wikiItems array of DOM elements (articles)
          self.wikiLinksHtml(wikiItems);
        } else{
          self.wikiHeader('No Wikipedia articles about ' + articleSearch + '.');
        }
      },
      error: function() {
        self.wikiHeader('Error retrieving Wikipedia articles.');
        self.wikiLinksHtml(null);
        alert("Network error. Failed to retreieve Wikipedia articles.");
      }
    })

  };
};


// initiates the knockout js viewModel & binds it to the web page
$(function() {
    ko.applyBindings(new viewModel());
});
