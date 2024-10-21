// Deklarera en global array för att lagra stationer
var Stations = new Array();

// Kör koden när dokumentet har laddats
$(document).ready(function () {
    // Aktivera stöd för Cross-Origin Resource Sharing (CORS)
    $.support.cors = true;

    try {
        // Konfigurera globala AJAX-inställningar
        $.ajaxSetup({
            url: "https://api.trafikinfo.trafikverket.se/v2/data.json",
            // Felhantering för AJAX-förfrågningar
            error: function (msg) {
                if (msg.statusText == "abort") return;
                alert("Request failed: " + msg.statusText + "" + msg.responseText);
            }
        });
    } catch (e) {
        alert("Ett fel uppstod vid initialisering.");
    }

    // Skapar en AJAX-laddningsindikator
    var loadingTimer;
    $("#loader").hide();
    $(document).ajaxStart(function () {
        // Visa laddningsindikator efter en viss fördröjning
        loadingTimer = setTimeout(function () {
            $("#loader").show();
        }, 200);
    }).ajaxStop(function () {
        // Dölj laddningsindikator när AJAX-förfrågan är klar
        clearTimeout(loadingTimer);
        $("#loader").hide();
    });

    // Förhandsladda information om tågstationer
    PreloadTrainStations();
});

// Funktion för att förhandsladda information om tågstationer
function PreloadTrainStations() {
    // Request för att ladda information om alla stationer
    var xmlRequest =
        "<REQUEST>" +
        "<LOGIN authenticationkey='3efa5e09ff524d6c93f8cd710eeb3063'/>" +
        "<QUERY objecttype='TrainStation' schemaversion='1'>" +
        "<FILTER/>" +
        "<INCLUDE>Prognosticated</INCLUDE>" +
        "<INCLUDE>AdvertisedLocationName</INCLUDE>" +
        "<INCLUDE>LocationSignature</INCLUDE>" +
        "</QUERY>" +
        "</REQUEST>";

    $.ajax({
        type: "POST",
        contentType: "text/xml",
        dataType: "json",
        data: xmlRequest,
        success: function (response) {
            if (response == null) return;

            try {
                // Loopa genom varje tågstation i svaret och lagra dem i 'Stations'-arrayen
                $(response.RESPONSE.RESULT[0].TrainStation).each(function (iterator, item) {
                    Stations[item.LocationSignature] = item.AdvertisedLocationName;
                });
            } catch (ex) { }
        }
    });
}

// Funktion för sökning baserat på användarens inmatning
function Search() {
    var sign = $("#station").val();

    // Rensa HTML-tabellen
    $('#timeTableDeparture tr:not(:first)').remove();

    // Förbered XML-förfrågan för tågannonseringar
    var xmlRequest =
        "<REQUEST>" +
        "<LOGIN authenticationkey='3efa5e09ff524d6c93f8cd710eeb3063' />" +
        "<QUERY objecttype='TrainAnnouncement' " +
        "orderby='AdvertisedTimeAtLocation' schemaversion='1'>" +
        "<FILTER>" +
        "<AND>" +
        "<OR>" +
        "<AND>" +
        "<GT name='AdvertisedTimeAtLocation' " +
        "value='$dateadd(-00:00:00)' />" +
        "<LT name='AdvertisedTimeAtLocation' " +
        "value='$dateadd(14:00:00)' />" +
        "</AND>" +
        "<GT name='EstimatedTimeAtLocation' value='$now' />" +
        "</OR>" +
        "<EQ name='LocationSignature' value='" + sign + "' />" +
        "<EQ name='ActivityType' value='Avgang' />" +
        "</AND>" +
        "</FILTER>" +
        "<INCLUDE>InformationOwner</INCLUDE>" +
        "<INCLUDE>Deviation</INCLUDE>" +
        "<INCLUDE>AdvertisedTimeAtLocation</INCLUDE>" +
        "<INCLUDE>TrackAtLocation</INCLUDE>" +
        "<INCLUDE>FromLocation</INCLUDE>" +
        "<INCLUDE>ToLocation</INCLUDE>" +
        "</QUERY>" +
        "</REQUEST>";

    // Gör en AJAX-förfrågan för tågannonseringar baserat på användarens inmatning
    $.ajax({
        type: "POST",
        contentType: "text/xml",
        dataType: "json",
        data: xmlRequest,
        success: function (response) {
            if (response == null) return;

            // Om ingen tågannonsering finns, visa meddelande i tabellen
            if (response.RESPONSE.RESULT[0].TrainAnnouncement == null)
                jQuery("#timeTableDeparture tr:last").
                    after("<tr><td colspan='4'>Inga avgångar hittades</td></tr>");

            try {
                // Rendera tågannonseringarna i tabellen
                renderTrainAnnouncement(response.RESPONSE.RESULT[0].TrainAnnouncement);
            } catch (ex) { }
        }
    });
}

// Funktion för att rendera tågannonseringar i HTML-tabellen
function renderTrainAnnouncement(announcement) {
    $(announcement).each(function (iterator, item) {
        var advertisedtime = new Date(item.AdvertisedTimeAtLocation);
        var hours = advertisedtime.getHours();
        var minutes = advertisedtime.getMinutes();
        if (minutes < 10) minutes = "0" + minutes;

        var toList = new Array();
        $(item.ToLocation).each(function (iterator, toItem) {
            toList.push(Stations[toItem]);
        });
        
        var extra ="";
        if (item.Deviation != null) extra = item.Deviation;

        var owner = "";
        if (item.InformationOwner != null) owner = item.InformationOwner;

        // Lägg till tågannonsering i HTML-tabellen
        jQuery("#timeTableDeparture tr:last").
            after(
                "<tr> <td>" + hours + ":" + minutes + 
                "</td> <td>" + toList.join(', ') +
                "</td> <td>" + owner + 
                "</td> <td>" + extra + 
                "</td> <td style='text-align: center'>" + item.TrackAtLocation +

                "</td> </tr>");
    });
}

// Funktion för att kolla om användaren trycker på Enter-tangenten
function checkEnterKey(event) {
    // Kolla om den tryckta tangenten är Enter (kod 13)
    if (event.key === "Enter") {
        // Anropa din funktion för sökning när Enter trycks
        Search();
    }
}
