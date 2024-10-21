var Stations = {};

$(document).ready(function () {
    $.support.cors = true;

    try {
        $.ajaxSetup({
            url: "https://api.trafikinfo.trafikverket.se/v2/data.json",
            error: function (msg) {
                if (msg.statusText == "abort") return;
                alert("Request failed: " + msg.statusText + "" + msg.responseText);
            }
        });
    } catch (e) {
        alert("Ett fel uppstod vid initialisering.");
    }

    var loadingTimer;
    $("#loader").hide();
    $(document).ajaxStart(function () {
        loadingTimer = setTimeout(function () {
            $("#loader").show();
        }, 200);
    }).ajaxStop(function () {
        clearTimeout(loadingTimer);
        $("#loader").hide();
    });

    PreloadTrainStations();
});

function PreloadTrainStations() {
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
            if (!response) return;

            try {
                $(response.RESPONSE.RESULT[0].TrainStation).each(function (iterator, item) {
                    Stations[item.LocationSignature] = item.AdvertisedLocationName;
                });
            } catch (ex) { }
        }
    });
}

function Search() {
    var sign = $("#station").val();

    $('#timeTableDeparture tr:not(:first)').remove();

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
        "<INCLUDE>AdvertisedTimeAtLocation</INCLUDE>" +
        "</QUERY>" +
        "</REQUEST>";

    $.ajax({
        type: "POST",
        contentType: "text/xml",
        dataType: "json",
        data: xmlRequest,
        success: function (response) {
            if (!response) return;

            if (!response.RESPONSE.RESULT[0].TrainAnnouncement)
                $("#timeTableDeparture tr:last").
                    after("<tr><td colspan='1'>Inga avgångar hittades</td></tr>");

            try {
                renderTrainAnnouncement(response.RESPONSE.RESULT[0].TrainAnnouncement);
            } catch (ex) { }
        }
    });
}

function renderTrainAnnouncement(announcement) {
    $(announcement).each(function (iterator, item) {
        var advertisedtime = new Date(item.AdvertisedTimeAtLocation);
        var hours = advertisedtime.getHours();
        var minutes = advertisedtime.getMinutes();
        if (minutes < 10) minutes = "0" + minutes;

        $("#timeTableDeparture tr:last").
            after("<tr><td>" + hours + ":" + minutes + "</td></tr>");
    });
}

function checkEnterKey(event) {
    if (event.key === "Enter") {
        Search();
    }
}
