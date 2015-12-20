var request = require("request");
var cheerio = require("cheerio");
var express = require('express');
var app = express();
var mysql = require('mysql');
fs = require('fs');


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
 * Lese CSV-File, Parsen und MYSQL (ausführen)
 * @param CSV-Loading Error {err}
 * @param CSV-Data {data}
 *
 */
fs.readFile('Links.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }

    //var arrayData = data.match(/[\w\/.:]*.php/g);
     var arrayData = data.split("\n");
    //console.log(data);
    console.log(arrayData);



    parseDataFromSite(arrayData,saveToDataBase);

});

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

    var lebensmittel = {};

    // Jeden Link besuchen:
    for (var i = 0; i < arrayData.length; i++) {
        //Array-Wert in Variable um request einzufügen
        var URLfromArray= arrayData[i];
        //Führe request mit URL aus dem Array aus
        request(URLfromArray, function (error, response, body) {
            //Wenn Link ein 200 ist, dann Daten aus Seite parsen und als Wert in Array speichern
            if (!error) {

                var $ = cheerio.load(body);

                var title = $('h1','#contentHeader').text();

             //   console.log(title);

                lebensmittel = {path: response.req.path, title: title};

                //für jede einzelne Tabelle
                lebensmittel.hauptnaehrstoffe = parseHauptnaehrstoffe($,"#container1");

                lebensmittelArray.push(lebensmittel);

               // console.log(lebensmittel);

            } else {
                //Wenn Link kein 200 ist, in ein separate Array speichern
                var errorStatus =  arrayData +": " + error;
                var errorLog = [];
                errorLog.push(errorStatus);
                console.log(errorLog);
            }
            //Prüfe ob Array-Länge erreicht wurde
            if (counter === arrayData.length-1){
                cb(lebensmittelArray); //Array übergeben aus der For-Schleife.
                console.log("Alle URLs besucht");
            } else {
                //Wenn Array-Länge nicht erreicht wurde erhöhe Counter um 1
                counter++;
            }
        });

    }
}

/**
 * HELPER-FUNCTION: saveToDataBase
 * @param title {title}
 *
 *
 */
function saveToDataBase(lebensmittelArray) {
    //var post  = {title: title};
    var insertString = "";
    console.log(lebensmittelArray);

    for (var z = 0; z < lebensmittelArray.length; z++) {

        for (var table in lebensmittelArray[z]) {

            if(table !== title) {
                for (var i = 0; i < table.length; i++) {
                    var inhaltsstoff = table[i];
                    insertString += "(1, '"+inhaltsstoff.inhaltsstoff+"', '"+inhaltsstoff.menge+"', '"+inhaltsstoff.einheit+"', CURRENT_TIMESTAMP), ";
                }
            }
        }
    }
    insertString = insertString.substr(0,insertString.length-1);
  //  console.log(insertString);

    var query = connection.query('INSERT INTO inhaltsstoffe (lebensmittel_id, titel, menge, einheit, erstellt) VALUES ' + insertString, function(err, result) {

        console.log("Datenimport nach MySQL abgeschlossen");

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