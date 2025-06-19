const fs = require("fs");

async function createLog(log, elevation, printtoconsole, guildId) {
    //const ascii = require('ascii-table');
    //const table = new ascii().setHeading('Events', 'Status');

    let date_time = new Date();
    // adjust 0 before single digit date
    let date = ("0" + date_time.getDate()).slice(-2);

    // get current month
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

    // get current year
    let year = date_time.getFullYear();

    // get current hours
    let hours = date_time.getHours();

    // get current minutes
    let minutes = date_time.getMinutes();

    // get current seconds
    let seconds = date_time.getSeconds();

    //const logFolder = './logs';

    //console.log(`test1 ${logFolder}`);

    const logFolder = './logs';

    let toPushToLog = "";
    if (elevation == "INFO") {
        toPushToLog = `(INFO): (Guild: ${guildId}) ${log}`;
    }
    if (elevation == "WARNING") {
        toPushToLog = `(WARNING): (Guild: ${guildId}) ${log}`;
    }
    if (elevation == "ERROR") {
        toPushToLog = `(ERROR): (Guild: ${guildId}) ${log}`;
    }

    //console.log(`test2 ${toPushToLog}`);

    //console.log(toPushToLog);

    if (printtoconsole) {
        console.log(toPushToLog);
    }
        
    if (toPushToLog != null || toPushToLog != "") {
        if (await fs.existsSync(`${logFolder}/log_${date}_${month}_${year}.txt`)) {
            fs.appendFileSync(`${logFolder}/log_${date}_${month}_${year}.txt`, `${hours}:${minutes}:${seconds} - ${toPushToLog}\n`, function(err) {
                if (err) throw err;
            });
        } else {
            fs.writeFileSync(`${logFolder}/log_${date}_${month}_${year}.txt`, `${hours}:${minutes}:${seconds} - ${toPushToLog}\n`, function(err) {
                if (err) throw err;
            });
        }
    }

        /*if (toPushToLog != null || toPushToLog != "") {
            if (fs.existsSync(`${logFolder}/log.txt_${date}_${month}_${year}`)) {
                fs.appendFile(`${logFolder}/log.txt_${date}_${month}_${year}`, `${toPushToLog}\n`, function(err) {
                    if(err) throw err;
                });
            } else {
                fs.writeFile(`${logFolder}/log.txt_${date}_${month}_${year}`, `${toPushToLog}\n`, function(err) {
                    if(err) throw err;
                });
            }
        }*/
}

module.exports = {createLog};