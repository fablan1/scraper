var request = require("request");
var cheerio = require("cheerio");
var express = require('express');
var app = express();
var mysql = require('mysql');
fs = require('fs');

var quelle = "datenbank";

/**
 * Data-Base Connection
 *
 *
 *
 */
var connection = mysql.createConnection({
    host     : '127.0.0.1',
    port     : '8889',
    user     : 'root',
    password : 'root',
    database : 'data'
});

connection.connect( function(err){
    if (err){
        throw err;
    }
    else {
        console.log('Connected with Database');
    }
});

/**
 * Prüfe ob Quelle Datenbank oder CSV  Datei ist und führe Funktion aus
 * @param quelle {string}
 *
 */
function getLinks (quelle) {
    if (quelle == "datenbank") {

        var query = connection.query('SELECT * FROM lebensmittel LIMIT 10000', function(err, result) {

          //  console.log("Alle Lebensmittel selektiert");

           // console.log(result);

             parseDataFromSite(result,saveToDataBase);

        });



    }
    else {

        fs.readFile('Links.csv', 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            //var arrayData = data.match(/[\w\/.:]*.php/g);

            var arrayData = data.split("\n");
           // console.log(arrayData);


            for (var i = 0; i< arrayData.length; i++) {
                var lebensmittelObjekt = {id: i+1, title: "", url:arrayData[i] };

                arrayData[i] = lebensmittelObjekt;

            }

            parseDataFromSite(arrayData,saveToDataBase);

        });
    }
}


//Funktion ausführen
getLinks(quelle);

/**
 * function parse Data From Site
 * @param {arrayData}
 * @param cb {function}
 *
 */
// Function Daten entgegen nehmen und Daten herausparsen
function parseDataFromSite (arrayData,cb) {

    //Setze Counter fest um zu prüfen wann alle Links geparst wurden
    var counter = 0;

    var lebensmittelArray = [];

    // Jeden Link besuchen:
    console.time("requests");
    for (var i = 0; i < arrayData.length; i++) {

      // Führe Funktion linkBesuchen aus
        linkBesuchen(arrayData[i],function(lebensmittel){
         console.log("counter:"+ counter, lebensmittel.title);
            if (lebensmittel !== false){

                lebensmittelArray.push(lebensmittel);

            }

            if (counter === arrayData.length-1){
                console.timeEnd("requests");
                cb(lebensmittelArray); //Array übergeben aus der For-Schleife.
                //console.log("Alle URLs besucht");

            } else {
                //Wenn Array-Länge nicht erreicht wurde erhöhe Counter um 1
                counter++;
            }

        });

    }
}


/**
 * HELPER-FUNCTION: linkBesuchen
 * @param lebensmittel {object}
 *
 *
 */
function linkBesuchen (lebensmittel,cb) {

    request(lebensmittel.url,{timeout: 4000}, function (error, response, body) { //Funktion draus machen Stichwort: Asynchron ... --> fehler da SCOPE nicht berücksichtigt wird.
        //Wenn Link ein 200 ist, dann Daten aus Seite parsen und als Wert in Array speichern


        if (!error) {

            var $ = cheerio.load(body);

            var title = $('h1','#contentHeader').text();

            //console.log(title);

            lebensmittel = {path: response.req.path, title: title, id: lebensmittel.id }; // Warum wird lebensmittel rechts nicht überschrieben? Stichwort: Assoziativität

            //für jede einzelne Tabelle
            lebensmittel.hauptnaehrstoffe = parseHauptnaehrstoffe($,"#container1");



            cb(lebensmittel);

        } else {
            //Wenn Link kein 200 ist, in ein separate Array speichern
            var errorStatus =  lebensmittel +": " + error;
            var errorLog = [];
            errorLog.push(errorStatus);
            // console.log(errorLog);
            cb(false);
        }

    });
}


/**
 * HELPER-FUNCTION: saveToDataBase
 * @param lebensmittelArray {array}
 *
 *
 */
// ERWEITERUNG FÜR JEDE TABELLE !!! UND IN INSERT STRING REIN PACKEN 132-140
function saveToDataBase(lebensmittelArray) {
    //var post  = {title: title};
    var insertString = "";
    //console.log(lebensmittelArray[0].hauptnaehrstoffe[1]);

    for (var z = 0; z < lebensmittelArray.length; z++) {

        var lebensmittel  = lebensmittelArray[z];

        for (var eigenschaft in lebensmittel) {
            // JEDE DIESER IF BEDINGUNG ANPASSEN, DAMIT DURCH DIE INHALTE GELOOPT WERDEN KANN
            if(eigenschaft === "hauptnaehrstoffe") {

                for (var i = 0; i < lebensmittel.hauptnaehrstoffe.length; i++) {

                    var inhaltsstoff = lebensmittel.hauptnaehrstoffe[i];
              //FUNCTION DEFINIEREN DIE ZU insertString hinzufügt ......
                    insertString += "("+lebensmittel.id+", '"+inhaltsstoff.inhaltsstoff+"', '"+inhaltsstoff.menge+"', '"+inhaltsstoff.einheit+"', CURRENT_TIMESTAMP),";
                }
            }
        }
    }

    insertString = insertString.substr(0,insertString.length-1);
    // console.log(insertString);

    console.time("datenbankInsert");

    var query = connection.query('INSERT INTO inhaltsstoffe (lebensmittel_id, titel, menge, einheit, erstellt) VALUES ' + insertString, function(err, result) {

        console.log("Datenimport nach MySQL abgeschlossen");
        console.timeEnd("datenbankInsert");
    });
    //  console.log(query.sql);
}


/**
 * HELPER-FUNCTION: parseHauptnaehrstoffe
 * @param $ {x}
 * @param $ {rows}
 *
 */
function parseHauptnaehrstoffe ($,divID) {
    var rows = $(divID).find("tr");
    var naehrwaertangaben = [];
    var naehrwert = {};

    for (var i = 1; i< rows.length; i++) {

        var current = rows[i];
        var tdArray = $(current).children("td");
        for (var z = 0; z< tdArray.length; z++){
        var val = $(tdArray[z]).text();

            if (z == 0) {
                var inhaltsstoff = val;
            }
            if (z == 1) {
                var menge = val;
            }
            if (z  == 2) {
                var einheit = val;
            }
        }
        naehrwert = {};
        naehrwert.inhaltsstoff = inhaltsstoff;
        naehrwert.menge = menge;
        naehrwert.einheit = einheit;

        naehrwaertangaben.push(naehrwert);
/*
        $(current).children("td").each(function(index,element){
            if (index==0) {
                var inhaltsstoff = $(this).text();
            }
            if (index ==1) {
                var menge = $(this).text();
            }
            if (index ==2) {
                var einheit = $(this).text();
            }

        });
*/
    }

    return naehrwaertangaben;
};




//Helper Funktionen:
// Fehler Array für URLs welche nochmal gecrawlt werden müssen
// Error helper Function Tag nicht gefunden, etc. andere Varianten
// Berechnung wieviel Ram dafür benötigt wird für die Daten
// Eine zentrale Error funktion die alle Fehler managed

  //1. Container in eine Variable als Element
   //2. vom Container ins erste Child / Children 0 Children 0
     //3. 2. For Loops (Inhaltsstoff, Menge, Einheit ) nicht nutzen (erster Loop für Table-row, zweiter Loop für die TDs)
    // Array oder Object speichern bzw. zusammenbauen //erster Loop erstellt neuen Eintrag
    //.text() im zweiten Loop nicht vergessen...


//var rows = $("#container1").find("tr");
// var rows = $("#container1").find("tr").length;

//console.log(rows);
//for (var i = 0; i< rows.length; i++) {
  //  var current = rows[i];
    //var title =  $(current).children("td").html();
    //var title = current.children("td").text();
    //var text = current.children("td:nth-child(2)").text();
    //console.log(title + " " + text + "\n");
    //console.log(title + "\n");
//}